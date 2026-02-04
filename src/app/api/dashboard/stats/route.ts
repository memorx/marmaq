import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { EstadoOrden, TipoServicio } from "@prisma/client";
import { calcularSemaforo, type SemaforoColor } from "@/types/ordenes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    // Usamos calcularSemaforo para consistencia con la lista de órdenes
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const mananaDate = new Date(hoy);
    mananaDate.setDate(mananaDate.getDate() + 1);

    // Fetch todas las órdenes activas para calcular semáforo
    const ordenesParaSemaforo = await prisma.orden.findMany({
      where: {
        estado: { notIn: ["ENTREGADO", "CANCELADO"] },
      },
    });

    // Contar por color usando la misma función que usa la lista
    const conteoSemaforo: Record<SemaforoColor, number> = {
      ROJO: 0,
      NARANJA: 0,
      AMARILLO: 0,
      AZUL: 0,
      VERDE: 0,
    };

    ordenesParaSemaforo.forEach((orden) => {
      const color = calcularSemaforo(orden);
      conteoSemaforo[color]++;
    });

    const semaforo = [
      { color: "rojo", label: "Crítico", count: conteoSemaforo.ROJO, description: "Listo para entrega > 5 días sin recoger" },
      { color: "naranja", label: "Urgente", count: conteoSemaforo.NARANJA, description: "Esperando refacciones" },
      { color: "amarillo", label: "Atención", count: conteoSemaforo.AMARILLO, description: "En diagnóstico o cotización > 72h" },
      { color: "verde", label: "Normal", count: conteoSemaforo.VERDE, description: "En proceso sin alertas" },
      { color: "azul", label: "Nuevos", count: conteoSemaforo.AZUL, description: "Recibidos hoy" },
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
      // Usar calcularSemaforo para consistencia con la lista de órdenes
      const semaforoColor = calcularSemaforo(orden).toLowerCase();

      return {
        id: orden.id,
        folio: orden.folio,
        cliente: orden.cliente.empresa || orden.cliente.nombre,
        equipo: `${orden.marcaEquipo} ${orden.modeloEquipo}`,
        tipo: orden.tipoServicio.toLowerCase().replace("_", ""),
        tipoServicio: orden.tipoServicio,
        estado: orden.estado,
        semaforo: semaforoColor,
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
