import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { marcarTodasLeidas } from "@/lib/notificaciones/notification-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/notificaciones/marcar-todas
 * Marcar todas las notificaciones del usuario como leídas
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const actualizadas = await marcarTodasLeidas(session.user.id);

    return NextResponse.json({
      success: true,
      actualizadas,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      { error: "Error al marcar notificaciones como leídas" },
      { status: 500 }
    );
  }
}
