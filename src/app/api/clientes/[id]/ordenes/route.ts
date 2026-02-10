import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import type { EstadoOrden } from "@prisma/client";
import { calcularSemaforo } from "@/types/ordenes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = Promise<{ id: string }>;

// GET /api/clientes/[id]/ordenes - Historial de órdenes de un cliente
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: { id: true, nombre: true, empresa: true },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const estadoParam = searchParams.get("estado") as EstadoOrden | null;
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const pageSizeParam = Math.min(
      parseInt(searchParams.get("pageSize") || "20", 10),
      100
    );

    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const pageSize = isNaN(pageSizeParam) || pageSizeParam < 1 ? 20 : pageSizeParam;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Record<string, unknown> = { clienteId: id };
    if (estadoParam) {
      where.estado = estadoParam;
    }

    // Fetch orders + count in parallel
    const [ordenes, total] = await Promise.all([
      prisma.orden.findMany({
        where,
        include: {
          tecnico: {
            select: { id: true, name: true },
          },
          _count: {
            select: { evidencias: true },
          },
        },
        orderBy: { fechaRecepcion: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.orden.count({ where }),
    ]);

    // Add semaforo to each order
    const ordenesConSemaforo = ordenes.map((orden) => ({
      ...orden,
      semaforo: calcularSemaforo(orden),
    }));

    return NextResponse.json({
      ordenes: ordenesConSemaforo,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      cliente: {
        nombre: cliente.nombre,
        empresa: cliente.empresa,
      },
    });
  } catch (error) {
    console.error("Error fetching client orders:", error);
    return NextResponse.json(
      { error: "Error al obtener órdenes del cliente" },
      { status: 500 }
    );
  }
}
