import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { EstadoOrden, TipoServicio } from "@prisma/client";

export const dynamic = "force-dynamic";

// Labels para tipos de servicio
const SERVICE_TYPE_LABELS: Record<TipoServicio, string> = {
  GARANTIA: "Garantía",
  CENTRO_SERVICIO: "Centro Servicio",
  POR_COBRAR: "Por Cobrar",
  REPARE: "REPARE",
};

// Labels para estados
const STATUS_LABELS: Record<EstadoOrden, string> = {
  RECIBIDO: "Recibido",
  EN_DIAGNOSTICO: "En Diagnóstico",
  COTIZACION_PENDIENTE: "Cotización Pendiente",
  EN_REPARACION: "En Reparación",
  ESPERA_REFACCIONES: "Espera Refacciones",
  REPARADO: "Reparado",
  LISTO_ENTREGA: "Listo para Entrega",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

// ============ GET /api/dashboard/stats ============
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Fechas para cálculos
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // 1. Órdenes por mes (últimos 6 meses)
    const ordenesPorMes = await prisma.orden.groupBy({
      by: ["fechaRecepcion"],
      _count: { id: true },
      where: {
        fechaRecepcion: { gte: sixMonthsAgo },
      },
    });

    // Procesar órdenes por mes
    const mesesLabels = [];
    const ordenesPorMesData: { mes: string; cantidad: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mesLabel = date.toLocaleDateString("es-MX", { month: "short" });
      const year = date.getFullYear();
      const month = date.getMonth();

      mesesLabels.push(`${mesLabel} ${year}`);

      // Contar órdenes de este mes
      const count = ordenesPorMes.filter((o) => {
        const fecha = new Date(o.fechaRecepcion);
        return fecha.getFullYear() === year && fecha.getMonth() === month;
      }).reduce((acc, o) => acc + o._count.id, 0);

      ordenesPorMesData.push({
        mes: `${mesLabel.charAt(0).toUpperCase()}${mesLabel.slice(1)}`,
        cantidad: count,
      });
    }

    // 2. Distribución por tipo de servicio
    const ordenesPorTipo = await prisma.orden.groupBy({
      by: ["tipoServicio"],
      _count: { id: true },
    });

    const distribucionTipoServicio = ordenesPorTipo.map((item) => ({
      tipo: SERVICE_TYPE_LABELS[item.tipoServicio],
      tipoKey: item.tipoServicio,
      cantidad: item._count.id,
    }));

    // 3. Órdenes por estado actual
    const ordenesPorEstado = await prisma.orden.groupBy({
      by: ["estado"],
      _count: { id: true },
      where: {
        estado: { notIn: ["ENTREGADO", "CANCELADO"] }, // Solo órdenes activas
      },
    });

    const distribucionEstado = ordenesPorEstado.map((item) => ({
      estado: STATUS_LABELS[item.estado],
      estadoKey: item.estado,
      cantidad: item._count.id,
    }));

    // 4. KPIs

    // 4a. Tiempo promedio de reparación (órdenes completadas)
    const ordenesCompletadas = await prisma.orden.findMany({
      where: {
        estado: "ENTREGADO",
        fechaEntrega: { not: null },
      },
      select: {
        fechaRecepcion: true,
        fechaEntrega: true,
      },
    });

    let tiempoPromedioReparacion = 0;
    if (ordenesCompletadas.length > 0) {
      const tiemposTotales = ordenesCompletadas.map((o) => {
        const inicio = new Date(o.fechaRecepcion).getTime();
        const fin = new Date(o.fechaEntrega!).getTime();
        return (fin - inicio) / (1000 * 60 * 60 * 24); // Días
      });
      tiempoPromedioReparacion = Math.round(
        tiemposTotales.reduce((a, b) => a + b, 0) / tiemposTotales.length
      );
    }

    // 4b. Órdenes completadas este mes vs mes anterior
    const completadasEsteMes = await prisma.orden.count({
      where: {
        estado: "ENTREGADO",
        fechaEntrega: { gte: startOfMonth },
      },
    });

    const completadasMesAnterior = await prisma.orden.count({
      where: {
        estado: "ENTREGADO",
        fechaEntrega: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    const tendenciaCompletadas = completadasMesAnterior > 0
      ? Math.round(((completadasEsteMes - completadasMesAnterior) / completadasMesAnterior) * 100)
      : completadasEsteMes > 0 ? 100 : 0;

    // 4c. Técnico con más órdenes completadas (este mes)
    const tecnicosMasActivos = await prisma.orden.groupBy({
      by: ["tecnicoId"],
      _count: { id: true },
      where: {
        estado: "ENTREGADO",
        fechaEntrega: { gte: startOfMonth },
        tecnicoId: { not: null },
      },
      orderBy: { _count: { id: "desc" } },
      take: 1,
    });

    let tecnicoTop: { nombre: string; ordenes: number } | null = null;
    if (tecnicosMasActivos.length > 0 && tecnicosMasActivos[0].tecnicoId) {
      const tecnico = await prisma.user.findUnique({
        where: { id: tecnicosMasActivos[0].tecnicoId },
        select: { name: true },
      });
      tecnicoTop = {
        nombre: tecnico?.name || "Sin nombre",
        ordenes: tecnicosMasActivos[0]._count.id,
      };
    }

    // 5. Datos del semáforo (órdenes activas categorizadas)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const hace3Dias = new Date(hoy);
    hace3Dias.setDate(hace3Dias.getDate() - 3);

    const hace5Dias = new Date(hoy);
    hace5Dias.setDate(hace5Dias.getDate() - 5);

    // Rojo: Equipo listo > 5 días sin recoger
    const rojoCount = await prisma.orden.count({
      where: {
        estado: "REPARADO",
        updatedAt: { lt: hace5Dias },
      },
    });

    // Naranja: Esperando refacciones
    const naranjaCount = await prisma.orden.count({
      where: {
        estado: "ESPERA_REFACCIONES",
      },
    });

    // Amarillo: Sin cotización > 72h (en diagnóstico por más de 3 días)
    const amarilloCount = await prisma.orden.count({
      where: {
        estado: "EN_DIAGNOSTICO",
        updatedAt: { lt: hace3Dias },
      },
    });

    // Verde: En proceso sin alertas
    const verdeCount = await prisma.orden.count({
      where: {
        estado: { in: ["EN_REPARACION", "COTIZACION_PENDIENTE", "LISTO_ENTREGA"] },
      },
    });

    // Azul: Recibidos hoy
    const mananaDate = new Date(hoy);
    mananaDate.setDate(mananaDate.getDate() + 1);

    const azulCount = await prisma.orden.count({
      where: {
        estado: "RECIBIDO",
        fechaRecepcion: {
          gte: hoy,
          lt: mananaDate,
        },
      },
    });

    const semaforo = [
      { color: "rojo", label: "Crítico", count: rojoCount, description: "Equipo listo > 5 días sin recoger" },
      { color: "naranja", label: "Urgente", count: naranjaCount, description: "Esperando refacciones" },
      { color: "amarillo", label: "Atención", count: amarilloCount, description: "Sin cotización > 72h" },
      { color: "verde", label: "Normal", count: verdeCount, description: "En proceso sin alertas" },
      { color: "azul", label: "Nuevos", count: azulCount, description: "Recibidos hoy" },
    ];

    // 6. Stats cards data
    const ordenesActivas = await prisma.orden.count({
      where: {
        estado: { notIn: ["ENTREGADO", "CANCELADO"] },
      },
    });

    const enDiagnostico = await prisma.orden.count({
      where: { estado: "EN_DIAGNOSTICO" },
    });

    const reparadosHoy = await prisma.orden.count({
      where: {
        estado: "REPARADO",
        updatedAt: {
          gte: hoy,
          lt: mananaDate,
        },
      },
    });

    // Tendencia reparados: comparar con ayer
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    const reparadosAyer = await prisma.orden.count({
      where: {
        estado: "REPARADO",
        updatedAt: {
          gte: ayer,
          lt: hoy,
        },
      },
    });

    const tendenciaReparados = reparadosAyer > 0
      ? Math.round(((reparadosHoy - reparadosAyer) / reparadosAyer) * 100)
      : reparadosHoy > 0 ? 100 : 0;

    // Pendientes sin evidencias (garantía sin fotos de diagnóstico)
    const pendientesEvidencias = await prisma.orden.count({
      where: {
        tipoServicio: "GARANTIA",
        estado: { in: ["EN_DIAGNOSTICO", "EN_REPARACION"] },
        evidencias: { none: {} },
      },
    });

    // 7. Órdenes recientes
    const ordenesRecientes = await prisma.orden.findMany({
      take: 5,
      orderBy: { fechaRecepcion: "desc" },
      include: {
        cliente: { select: { nombre: true, empresa: true } },
      },
    });

    const ordenesRecientesFormateadas = ordenesRecientes.map((orden) => {
      // Calcular semáforo
      let semaforo = "verde";
      const diasDesdeActualizacion = Math.floor(
        (hoy.getTime() - new Date(orden.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (orden.estado === "REPARADO" && diasDesdeActualizacion > 5) {
        semaforo = "rojo";
      } else if (orden.estado === "ESPERA_REFACCIONES") {
        semaforo = "naranja";
      } else if (orden.estado === "EN_DIAGNOSTICO" && diasDesdeActualizacion > 3) {
        semaforo = "amarillo";
      } else if (orden.estado === "RECIBIDO") {
        const fechaRecepcion = new Date(orden.fechaRecepcion);
        fechaRecepcion.setHours(0, 0, 0, 0);
        if (fechaRecepcion.getTime() === hoy.getTime()) {
          semaforo = "azul";
        }
      }

      return {
        id: orden.id,
        folio: orden.folio,
        cliente: orden.cliente.empresa || orden.cliente.nombre,
        equipo: `${orden.marcaEquipo} ${orden.modeloEquipo}`,
        tipo: orden.tipoServicio.toLowerCase().replace("_", ""),
        tipoServicio: orden.tipoServicio,
        estado: orden.estado,
        semaforo,
      };
    });

    return NextResponse.json({
      // Gráficas
      ordenesPorMes: ordenesPorMesData,
      distribucionTipoServicio,
      distribucionEstado,

      // KPIs
      kpis: {
        tiempoPromedioReparacion,
        completadasEsteMes,
        completadasMesAnterior,
        tendenciaCompletadas,
        tecnicoTop,
      },

      // Semáforo
      semaforo,

      // Stats cards
      stats: {
        ordenesActivas,
        enDiagnostico,
        reparadosHoy,
        tendenciaReparados,
        pendientesEvidencias,
      },

      // Órdenes recientes
      ordenesRecientes: ordenesRecientesFormateadas,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
