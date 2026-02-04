import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { marcarLeida } from "@/lib/notificaciones/notification-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = Promise<{ id: string }>;

/**
 * PATCH /api/notificaciones/[id]
 * Marcar una notificación como leída
 *
 * Body: { "leida": true }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que la notificación existe
    const notificacion = await prisma.notificacion.findUnique({
      where: { id },
      select: { usuarioId: true },
    });

    if (!notificacion) {
      return NextResponse.json(
        { error: "Notificación no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que la notificación pertenece al usuario
    if (notificacion.usuarioId !== session.user.id) {
      return NextResponse.json(
        { error: "No tienes permiso para modificar esta notificación" },
        { status: 403 }
      );
    }

    // Parsear body
    const body = await request.json();

    if (body.leida === true) {
      await marcarLeida(id, session.user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notificación:", error);
    return NextResponse.json(
      { error: "Error al actualizar notificación" },
      { status: 500 }
    );
  }
}
