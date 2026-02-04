import { NextRequest, NextResponse } from "next/server";
import { ejecutarCronAlertas } from "@/lib/notificaciones/alerta-cron";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/cron/alertas
 *
 * Endpoint para el cron job de Vercel que revisa órdenes
 * y genera notificaciones de alertas basadas en tiempo.
 *
 * Autorización:
 * - En producción: requiere header x-vercel-cron-auth (Vercel Cron) o Bearer CRON_SECRET
 * - En desarrollo: acceso libre para testing
 */
export async function GET(request: NextRequest) {
  // Verificar autorización en producción
  if (process.env.NODE_ENV === "production") {
    const isVercelCron = request.headers.get("x-vercel-cron-auth");
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Permitir si viene de Vercel Cron o tiene el secret correcto
    if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const resultado = await ejecutarCronAlertas();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...resultado,
    });
  } catch (error) {
    console.error("Error en cron de alertas:", error);
    return NextResponse.json(
      { error: "Error ejecutando cron de alertas" },
      { status: 500 }
    );
  }
}
