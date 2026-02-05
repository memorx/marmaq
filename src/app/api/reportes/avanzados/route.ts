import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { TipoServicio, EstadoOrden } from "@prisma/client";
import { STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/lib/constants/labels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ============ GET /api/reportes/avanzados ============
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo SUPER_ADMIN y COORD_SERVICIO pueden ver reportes avanzados
    if (!["SUPER_ADMIN", "COORD_SERVICIO"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const tecnicoId = searchParams.get("tecnicoId");
    const tipoServicio = searchParams.get("tipoServicio") as TipoServicio | null;

    // Construir filtro base
    const baseWhere: {
      fechaRecepcion?: { gte?: Date; lte?: Date };
      tecnicoId?: string;
      tipoServicio?: TipoServicio;
    } = {};

    if (fechaDesde) {
      baseWhere.fechaRecepcion = { ...baseWhere.fechaRecepcion, gte: new Date(fechaDesde) };
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      baseWhere.fechaRecepcion = { ...baseWhere.fechaRecepcion, lte: hasta };
    }
    if (tecnicoId) {
      baseWhere.tecnicoId = tecnicoId;
    }
    if (tipoServicio) {
      baseWhere.tipoServicio = tipoServicio;
    }

    // ============ 1. REPORTE POR TÉCNICO ============
    const tecnicos = await prisma.user.findMany({
      where: { role: "TECNICO" },
      select: { id: true, name: true },
    });

    const reporteTecnicos = await Promise.all(
      tecnicos.map(async (tecnico) => {
        const whereForTecnico = { ...baseWhere, tecnicoId: tecnico.id };

        // Órdenes asignadas
        const asignadas = await prisma.orden.count({
          where: whereForTecnico,
        });

        // Órdenes completadas (entregadas)
        const completadas = await prisma.orden.count({
          where: { ...whereForTecnico, estado: "ENTREGADO" },
        });

        // Tiempo promedio de reparación
        const ordenesCompletadas = await prisma.orden.findMany({
          where: {
            ...whereForTecnico,
            estado: "ENTREGADO",
            fechaEntrega: { not: null },
          },
          select: { fechaRecepcion: true, fechaEntrega: true },
        });

        let tiempoPromedio = 0;
        if (ordenesCompletadas.length > 0) {
          const tiempos = ordenesCompletadas.map((o) => {
            const inicio = new Date(o.fechaRecepcion).getTime();
            const fin = new Date(o.fechaEntrega!).getTime();
            return (fin - inicio) / (1000 * 60 * 60 * 24);
          });
          tiempoPromedio = Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);
        }

        // Eficiencia (completadas / asignadas * 100)
        const eficiencia = asignadas > 0 ? Math.round((completadas / asignadas) * 100) : 0;

        return {
          tecnicoId: tecnico.id,
          nombre: tecnico.name || "Sin nombre",
          asignadas,
          completadas,
          pendientes: asignadas - completadas,
          tiempoPromedioDias: tiempoPromedio,
          eficiencia,
        };
      })
    );

    // Ordenar por eficiencia (ranking)
    const rankingTecnicos = [...reporteTecnicos]
      .filter((t) => t.asignadas > 0)
      .sort((a, b) => b.eficiencia - a.eficiencia);

    // ============ 2. REPORTE POR TIPO DE SERVICIO ============
    const tiposServicio: TipoServicio[] = ["GARANTIA", "CENTRO_SERVICIO", "POR_COBRAR", "REPARE"];

    const reporteTipoServicio = await Promise.all(
      tiposServicio.map(async (tipo) => {
        if (tipoServicio && tipoServicio !== tipo) {
          return null;
        }

        const whereActual = { ...baseWhere, tipoServicio: tipo };

        // Cantidad total
        const cantidad = await prisma.orden.count({ where: whereActual });

        // Ingresos (solo POR_COBRAR con cotización aprobada)
        let ingresos = 0;
        if (tipo === "POR_COBRAR") {
          const ordenesConCotizacion = await prisma.orden.findMany({
            where: {
              ...whereActual,
              cotizacionAprobada: true,
              cotizacion: { not: null },
            },
            select: { cotizacion: true },
          });
          ingresos = ordenesConCotizacion.reduce(
            (acc, o) => acc + (o.cotizacion ? Number(o.cotizacion) : 0),
            0
          );
        }

        // Cotizaciones rechazadas (canceladas después de cotizar)
        const cotizacionesEnviadas = await prisma.orden.count({
          where: {
            ...whereActual,
            cotizacion: { not: null },
          },
        });

        const cotizacionesAprobadas = await prisma.orden.count({
          where: {
            ...whereActual,
            cotizacionAprobada: true,
          },
        });

        const tasaRechazo =
          cotizacionesEnviadas > 0
            ? Math.round(((cotizacionesEnviadas - cotizacionesAprobadas) / cotizacionesEnviadas) * 100)
            : 0;

        return {
          tipo,
          tipoLabel: SERVICE_TYPE_LABELS[tipo],
          cantidad,
          ingresos,
          cotizacionesEnviadas,
          cotizacionesAprobadas,
          cotizacionesRechazadas: cotizacionesEnviadas - cotizacionesAprobadas,
          tasaRechazo,
        };
      })
    );

    // Por mes (últimos 6 meses)
    const now = new Date();
    const porTipoPorMes: { mes: string; [key: string]: number | string }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const mesLabel = date.toLocaleDateString("es-MX", { month: "short", year: "numeric" });

      const mesData: { mes: string; [key: string]: number | string } = { mes: mesLabel };

      for (const tipo of tiposServicio) {
        const count = await prisma.orden.count({
          where: {
            tipoServicio: tipo,
            fechaRecepcion: {
              gte: date,
              lte: endDate,
            },
            ...(tecnicoId ? { tecnicoId } : {}),
          },
        });
        mesData[tipo] = count;
      }

      porTipoPorMes.push(mesData);
    }

    // ============ 3. REPORTE DE TIEMPOS ============
    const estados: EstadoOrden[] = [
      "RECIBIDO",
      "EN_DIAGNOSTICO",
      "COTIZACION_PENDIENTE",
      "EN_REPARACION",
      "ESPERA_REFACCIONES",
      "REPARADO",
      "LISTO_ENTREGA",
    ];

    // Tiempo promedio en cada estado (basado en órdenes activas)
    const tiemposPorEstado = await Promise.all(
      estados.map(async (estado) => {
        const ordenes = await prisma.orden.findMany({
          where: {
            ...baseWhere,
            estado,
          },
          select: { updatedAt: true },
        });

        let tiempoPromedio = 0;
        if (ordenes.length > 0) {
          const ahora = new Date().getTime();
          const tiempos = ordenes.map((o) => {
            return (ahora - new Date(o.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
          });
          tiempoPromedio = Math.round((tiempos.reduce((a, b) => a + b, 0) / tiempos.length) * 10) / 10;
        }

        return {
          estado,
          estadoLabel: STATUS_LABELS[estado],
          cantidad: ordenes.length,
          tiempoPromedioDias: tiempoPromedio,
        };
      })
    );

    // Órdenes que exceden X días (default 7)
    const diasLimite = 7;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasLimite);

    const ordenesExcedidas = await prisma.orden.findMany({
      where: {
        ...baseWhere,
        estado: { notIn: ["ENTREGADO", "CANCELADO"] },
        fechaRecepcion: { lt: fechaLimite },
      },
      select: {
        id: true,
        folio: true,
        estado: true,
        fechaRecepcion: true,
        cliente: { select: { nombre: true, empresa: true } },
        tecnico: { select: { name: true } },
      },
      orderBy: { fechaRecepcion: "asc" },
      take: 20,
    });

    const ordenesExcedidasFormateadas = ordenesExcedidas.map((o) => {
      const diasTranscurridos = Math.floor(
        (new Date().getTime() - new Date(o.fechaRecepcion).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: o.id,
        folio: o.folio,
        estado: o.estado,
        estadoLabel: STATUS_LABELS[o.estado],
        cliente: o.cliente.empresa || o.cliente.nombre,
        tecnico: o.tecnico?.name || "Sin asignar",
        diasTranscurridos,
        fechaRecepcion: o.fechaRecepcion,
      };
    });

    // Cuellos de botella (estados con más órdenes estancadas)
    const cuellosDeBottella = tiemposPorEstado
      .filter((e) => e.cantidad > 0)
      .sort((a, b) => b.tiempoPromedioDias - a.tiempoPromedioDias)
      .slice(0, 3);

    // ============ 4. RESUMEN GENERAL ============
    const totalOrdenes = await prisma.orden.count({ where: baseWhere });
    const ordenesActivas = await prisma.orden.count({
      where: { ...baseWhere, estado: { notIn: ["ENTREGADO", "CANCELADO"] } },
    });
    const ordenesCompletadasTotal = await prisma.orden.count({
      where: { ...baseWhere, estado: "ENTREGADO" },
    });

    // Ingresos totales (POR_COBRAR aprobadas)
    const ingresosTotales = await prisma.orden.aggregate({
      where: {
        ...baseWhere,
        tipoServicio: "POR_COBRAR",
        cotizacionAprobada: true,
      },
      _sum: { cotizacion: true },
    });

    // Lista de técnicos para filtro
    const listaTecnicos = await prisma.user.findMany({
      where: { role: "TECNICO" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      filtros: {
        fechaDesde,
        fechaHasta,
        tecnicoId,
        tipoServicio,
      },
      resumen: {
        totalOrdenes,
        ordenesActivas,
        ordenesCompletadas: ordenesCompletadasTotal,
        ingresosTotales: ingresosTotales._sum.cotizacion
          ? Number(ingresosTotales._sum.cotizacion)
          : 0,
      },
      reporteTecnicos,
      rankingTecnicos,
      reporteTipoServicio: reporteTipoServicio.filter(Boolean),
      porTipoPorMes,
      tiemposPorEstado,
      ordenesExcedidas: ordenesExcedidasFormateadas,
      cuellosDeBottella,
      listaTecnicos,
    });
  } catch (error) {
    console.error("Error fetching advanced reports:", error);
    return NextResponse.json(
      { error: "Error al obtener reportes" },
      { status: 500 }
    );
  }
}
