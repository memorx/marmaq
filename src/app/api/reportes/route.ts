import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { generateTorreyReport, generateRepareReport, generateGeneralReport } from "@/lib/reportes";
import { TipoServicio } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Tipos de reporte soportados
type TipoReporte = "TORREY" | "REPARE" | "FABATSA" | "GENERAL";

// GET /api/reportes?tipo=TORREY&mes=11&año=2024
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo coordinadores y admins pueden generar reportes
    const allowedRoles = ["SUPER_ADMIN", "COORD_SERVICIO"];
    if (!allowedRoles.includes(session.user.role as string)) {
      return NextResponse.json(
        { error: "No tienes permisos para generar reportes" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tipo = (searchParams.get("tipo") || "TORREY").toUpperCase() as TipoReporte;
    const mes = parseInt(searchParams.get("mes") || String(new Date().getMonth() + 1));
    const año = parseInt(searchParams.get("año") || String(new Date().getFullYear()));

    // Validar parámetros
    if (mes < 1 || mes > 12) {
      return NextResponse.json({ error: "Mes inválido (1-12)" }, { status: 400 });
    }

    if (año < 2020 || año > 2100) {
      return NextResponse.json({ error: "Año inválido" }, { status: 400 });
    }

    // Calcular rango de fechas
    const fechaInicio = new Date(año, mes - 1, 1);
    const fechaFin = new Date(año, mes, 0, 23, 59, 59, 999); // Último día del mes

    // Determinar filtro de tipoServicio según el tipo de reporte
    let tipoServicioFilter: TipoServicio[];
    switch (tipo) {
      case "TORREY":
      case "FABATSA":
        tipoServicioFilter = [TipoServicio.GARANTIA, TipoServicio.CENTRO_SERVICIO];
        break;
      case "REPARE":
        tipoServicioFilter = [TipoServicio.REPARE];
        break;
      case "GENERAL":
        tipoServicioFilter = [];
        break;
      default:
        return NextResponse.json(
          { error: `Tipo de reporte inválido: ${tipo}. Válidos: TORREY, FABATSA, REPARE, GENERAL` },
          { status: 400 }
        );
    }

    // Consultar órdenes del período
    const ordenes = await prisma.orden.findMany({
      where: {
        ...(tipoServicioFilter.length > 0 ? { tipoServicio: { in: tipoServicioFilter } } : {}),
        ...(tipo === "GENERAL"
          ? { fechaEntrega: { gte: fechaInicio, lte: fechaFin }, estado: "ENTREGADO" }
          : { fechaRecepcion: { gte: fechaInicio, lte: fechaFin } }
        ),
      },
      include: {
        cliente: true,
        tecnico: true,
        evidencias: true,
      },
      orderBy: { fechaRecepcion: "asc" },
    });

    // Generar Excel según el tipo
    let buffer: Buffer;
    let filename: string;

    switch (tipo) {
      case "TORREY":
      case "FABATSA":
        buffer = await generateTorreyReport(ordenes, mes, año);
        filename = `Reporte_${tipo}_${getMonthName(mes)}_${año}.xlsx`;
        break;
      case "REPARE":
        buffer = await generateRepareReport(ordenes, mes, año);
        filename = `LayOut_REPARE_${getMonthName(mes)}_${año}.xlsx`;
        break;
      case "GENERAL":
        buffer = await generateGeneralReport(ordenes, mes, año);
        filename = `Reporte_General_${getMonthName(mes)}_${año}.xlsx`;
        break;
      default:
        throw new Error("Tipo no soportado");
    }

    // Retornar archivo Excel
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Error generando reporte:", error);
    return NextResponse.json(
      { error: "Error al generar el reporte" },
      { status: 500 }
    );
  }
}

// GET /api/reportes/preview - Obtener preview de datos sin generar Excel
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { tipo, mes, año } = body;

    // Calcular rango de fechas
    const fechaInicio = new Date(año, mes - 1, 1);
    const fechaFin = new Date(año, mes, 0, 23, 59, 59, 999);

    // Determinar filtro
    let tipoServicioFilter: TipoServicio[];
    switch (tipo) {
      case "TORREY":
      case "FABATSA":
        tipoServicioFilter = [TipoServicio.GARANTIA, TipoServicio.CENTRO_SERVICIO];
        break;
      case "REPARE":
        tipoServicioFilter = [TipoServicio.REPARE];
        break;
      case "GENERAL":
        tipoServicioFilter = [];
        break;
      default:
        tipoServicioFilter = [TipoServicio.GARANTIA];
    }

    // Construir where según tipo
    const previewWhere = {
      ...(tipoServicioFilter.length > 0 ? { tipoServicio: { in: tipoServicioFilter } } : {}),
      ...(tipo === "GENERAL"
        ? { fechaEntrega: { gte: fechaInicio, lte: fechaFin }, estado: "ENTREGADO" as const }
        : { fechaRecepcion: { gte: fechaInicio, lte: fechaFin } }
      ),
    };

    // Contar órdenes
    const count = await prisma.orden.count({
      where: previewWhere,
    });

    // Obtener resumen por estado
    const resumenEstados = await prisma.orden.groupBy({
      by: ["estado"],
      where: previewWhere,
      _count: true,
    });

    return NextResponse.json({
      tipo,
      periodo: `${getMonthName(mes)} ${año}`,
      totalOrdenes: count,
      resumenEstados: resumenEstados.map(r => ({
        estado: r.estado,
        cantidad: r._count,
      })),
    });
  } catch (error) {
    console.error("Error obteniendo preview:", error);
    return NextResponse.json(
      { error: "Error al obtener preview" },
      { status: 500 }
    );
  }
}

function getMonthName(month: number): string {
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return months[month - 1] || "";
}
