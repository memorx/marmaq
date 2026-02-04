import { auth } from "@/lib/auth/auth";
import { NextRequest, NextResponse } from "next/server";
import {
  obtenerNotificaciones,
  contarNoLeidas,
} from "@/lib/notificaciones/notification-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/notificaciones
 * Listar notificaciones del usuario autenticado
 *
 * Query params:
 * - soloNoLeidas=true - filtrar solo no leídas
 * - limit=20 - cantidad (default 20, max 50)
 * - cursor=<isoDate> - para paginación infinita
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const soloNoLeidas = searchParams.get("soloNoLeidas") === "true";
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20;
    const cursor = searchParams.get("cursor") || undefined;

    const [{ notificaciones, nextCursor }, noLeidas] = await Promise.all([
      obtenerNotificaciones(session.user.id, { soloNoLeidas, limit, cursor }),
      contarNoLeidas(session.user.id),
    ]);

    return NextResponse.json({
      notificaciones,
      noLeidas,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching notificaciones:", error);
    return NextResponse.json(
      { error: "Error al obtener notificaciones" },
      { status: 500 }
    );
  }
}
