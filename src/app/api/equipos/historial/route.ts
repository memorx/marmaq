import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { calcularSemaforo } from "@/types/ordenes";
import { STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/lib/constants/labels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RESULTS = 20;

// GET /api/equipos/historial?serie=ABC123  or  ?marca=TORREY&modelo=L-EQ
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serie = searchParams.get("serie")?.trim();
    const marca = searchParams.get("marca")?.trim();
    const modelo = searchParams.get("modelo")?.trim();

    if (!serie && (!marca || !modelo)) {
      return NextResponse.json(
        { error: "Se requiere parámetro 'serie' o 'marca' + 'modelo'" },
        { status: 400 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = {};

    if (serie) {
      // Exact match on serial number (case-insensitive)
      where.serieEquipo = { equals: serie, mode: "insensitive" };
    } else {
      // Contains match on marca + modelo
      where.marcaEquipo = { contains: marca, mode: "insensitive" };
      where.modeloEquipo = { contains: modelo, mode: "insensitive" };
    }

    const [ordenes, totalOrdenes] = await Promise.all([
      prisma.orden.findMany({
        where,
        include: {
          cliente: {
            select: { id: true, nombre: true, empresa: true },
          },
          tecnico: {
            select: { id: true, name: true },
          },
        },
        orderBy: { fechaRecepcion: "desc" },
        take: MAX_RESULTS,
      }),
      prisma.orden.count({ where }),
    ]);

    // Add semaforo + labels to each order
    const ordenesFormateadas = ordenes.map((orden) => ({
      id: orden.id,
      folio: orden.folio,
      tipoServicio: orden.tipoServicio,
      tipoServicioLabel: SERVICE_TYPE_LABELS[orden.tipoServicio],
      estado: orden.estado,
      estadoLabel: STATUS_LABELS[orden.estado],
      marcaEquipo: orden.marcaEquipo,
      modeloEquipo: orden.modeloEquipo,
      serieEquipo: orden.serieEquipo,
      fechaRecepcion: orden.fechaRecepcion,
      fechaEntrega: orden.fechaEntrega,
      fallaReportada: orden.fallaReportada,
      cliente: orden.cliente,
      tecnico: orden.tecnico,
      semaforo: calcularSemaforo(orden),
    }));

    return NextResponse.json({
      ordenes: ordenesFormateadas,
      totalOrdenes,
      equipo: {
        serie: serie || null,
        marca: marca || ordenes[0]?.marcaEquipo || null,
        modelo: modelo || ordenes[0]?.modeloEquipo || null,
      },
    });
  } catch (error) {
    console.error("Error en historial de equipo:", error);
    return NextResponse.json(
      { error: "Error al buscar historial de equipo" },
      { status: 500 }
    );
  }
}
