import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { calcularSemaforo, type SemaforoColor } from "@/types/ordenes";
import { STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/lib/constants/labels";
import type { TipoServicio, EstadoOrden } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MESES_LABEL = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ============ GET /api/reportes/consolidado ============
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!["SUPER_ADMIN", "COORD_SERVICIO"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mesParam = searchParams.get("mes");

    // Parse mes (YYYY-MM) or default to current month
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    if (mesParam) {
      const parts = mesParam.split("-");
      if (parts.length === 2) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
      }
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return NextResponse.json(
          { error: "Formato de mes inválido. Use YYYY-MM" },
          { status: 400 }
        );
      }
    }

    const inicioMes = new Date(year, month - 1, 1);
    const finMes = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch all orders in the month + technician list in parallel
    const [ordenes, tecnicos] = await Promise.all([
      prisma.orden.findMany({
        where: {
          fechaRecepcion: { gte: inicioMes, lte: finMes },
        },
        include: {
          cliente: { select: { nombre: true, empresa: true } },
          tecnico: { select: { id: true, name: true } },
        },
      }),
      prisma.user.findMany({
        where: { role: "TECNICO" },
        select: { id: true, name: true },
      }),
    ]);

    // ============ RESUMEN ============
    const entregadas = ordenes.filter((o) => o.estado === "ENTREGADO").length;
    const canceladas = ordenes.filter((o) => o.estado === "CANCELADO").length;
    const enProceso = ordenes.length - entregadas - canceladas;

    const ingresosTotales = ordenes
      .filter(
        (o) =>
          o.tipoServicio === "POR_COBRAR" &&
          o.estado === "ENTREGADO" &&
          o.cotizacionAprobada &&
          o.cotizacion
      )
      .reduce((sum, o) => sum + Number(o.cotizacion), 0);

    // ============ POR TIPO DE SERVICIO ============
    const tiposServicio: TipoServicio[] = ["GARANTIA", "CENTRO_SERVICIO", "POR_COBRAR", "REPARE"];
    const porTipoServicio = tiposServicio.map((tipo) => {
      const ordenesDelTipo = ordenes.filter((o) => o.tipoServicio === tipo);
      const ingresos = ordenesDelTipo
        .filter((o) => o.estado === "ENTREGADO" && o.cotizacionAprobada && o.cotizacion)
        .reduce((sum, o) => sum + Number(o.cotizacion), 0);

      return {
        tipo,
        tipoLabel: SERVICE_TYPE_LABELS[tipo],
        cantidad: ordenesDelTipo.length,
        ingresos,
      };
    });

    // ============ POR TÉCNICO ============
    const porTecnico = tecnicos.map((tecnico) => {
      const ordenesDelTecnico = ordenes.filter((o) => o.tecnicoId === tecnico.id);
      const completadas = ordenesDelTecnico.filter((o) => o.estado === "ENTREGADO");

      let tiempoPromedioDias = 0;
      const completadasConFecha = completadas.filter((o) => o.fechaEntrega);
      if (completadasConFecha.length > 0) {
        const tiempos = completadasConFecha.map((o) => {
          const inicio = new Date(o.fechaRecepcion).getTime();
          const fin = new Date(o.fechaEntrega!).getTime();
          return (fin - inicio) / (1000 * 60 * 60 * 24);
        });
        tiempoPromedioDias = Math.round(
          tiempos.reduce((a, b) => a + b, 0) / tiempos.length
        );
      }

      return {
        tecnicoId: tecnico.id,
        nombre: tecnico.name || "Sin nombre",
        asignadas: ordenesDelTecnico.length,
        completadas: completadas.length,
        tiempoPromedioDias,
      };
    });

    // ============ POR ESTADO ============
    const estadosPresentes = new Map<EstadoOrden, number>();
    for (const orden of ordenes) {
      estadosPresentes.set(
        orden.estado,
        (estadosPresentes.get(orden.estado) || 0) + 1
      );
    }
    const porEstado = Array.from(estadosPresentes.entries()).map(
      ([estado, cantidad]) => ({
        estado,
        estadoLabel: STATUS_LABELS[estado],
        cantidad,
      })
    );

    // ============ SEMÁFORO ============
    const semaforoCount: Record<SemaforoColor, number> = {
      ROJO: 0,
      NARANJA: 0,
      AMARILLO: 0,
      VERDE: 0,
      AZUL: 0,
    };

    const ordenesActivas = ordenes.filter(
      (o) => o.estado !== "ENTREGADO" && o.estado !== "CANCELADO"
    );

    for (const orden of ordenesActivas) {
      const color = calcularSemaforo(orden);
      semaforoCount[color]++;
    }

    // ============ ÓRDENES CRÍTICAS (semáforo ROJO) ============
    const ordenesCriticas = ordenesActivas
      .filter((o) => calcularSemaforo(o) === "ROJO")
      .map((o) => {
        const diasEnTaller = Math.floor(
          (Date.now() - new Date(o.fechaRecepcion).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return {
          id: o.id,
          folio: o.folio,
          cliente: o.cliente.nombre,
          equipo: `${o.marcaEquipo} ${o.modeloEquipo}`,
          diasEnTaller,
          estado: STATUS_LABELS[o.estado],
        };
      });

    return NextResponse.json({
      periodo: {
        mes: String(month).padStart(2, "0"),
        anio: year,
        label: `${MESES_LABEL[month]} ${year}`,
      },
      resumen: {
        totalOrdenes: ordenes.length,
        entregadas,
        canceladas,
        enProceso,
        ingresosTotales,
      },
      porTipoServicio,
      porTecnico,
      porEstado,
      semaforo: {
        rojo: semaforoCount.ROJO,
        naranja: semaforoCount.NARANJA,
        amarillo: semaforoCount.AMARILLO,
        verde: semaforoCount.VERDE,
        azul: semaforoCount.AZUL,
      },
      ordenesCriticas,
    });
  } catch (error) {
    console.error("Error en reporte consolidado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
