import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { canAccessOrden, unauthorizedResponse } from "@/lib/auth/authorize";

type RouteParams = Promise<{ id: string; materialUsadoId: string }>;

// DELETE /api/ordenes/[id]/materiales/[materialUsadoId] - Eliminar material de orden
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: ordenId, materialUsadoId } = await params;

    // Verificar que la orden existe
    const orden = await prisma.orden.findUnique({
      where: { id: ordenId },
      select: { id: true, tecnicoId: true, creadoPorId: true },
    });

    if (!orden) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    if (!canAccessOrden(session, orden)) {
      return unauthorizedResponse("No tienes permisos para modificar esta orden");
    }

    // Buscar MaterialUsado y verificar que pertenece a esta orden
    const materialUsado = await prisma.materialUsado.findFirst({
      where: { id: materialUsadoId, ordenId },
      include: { material: true },
    });

    if (!materialUsado) {
      return NextResponse.json(
        { error: "Material usado no encontrado en esta orden" },
        { status: 404 }
      );
    }

    // Transaction: restaurar stock + eliminar MaterialUsado + historial
    await prisma.$transaction(async (tx) => {
      await tx.material.update({
        where: { id: materialUsado.materialId },
        data: { stockActual: { increment: materialUsado.cantidad } },
      });

      await tx.materialUsado.delete({
        where: { id: materialUsadoId },
      });

      await tx.historialOrden.create({
        data: {
          ordenId,
          usuarioId: session.user.id,
          accion: "MATERIAL_AGREGADO",
          detalles: {
            eliminado: `${materialUsado.material.nombre} ×${materialUsado.cantidad}`,
          },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error removing material:", error);
    return NextResponse.json(
      { error: "Error al eliminar material" },
      { status: 500 }
    );
  }
}
