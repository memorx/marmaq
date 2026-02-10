import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { AccionHistorial } from "@prisma/client";
import { canAccessOrden, unauthorizedResponse } from "@/lib/auth/authorize";

type RouteParams = Promise<{ id: string }>;

// Labels para las acciones del historial
const ACCION_LABELS: Record<AccionHistorial, string> = {
  ORDEN_CREADA: "Orden creada",
  ESTADO_CAMBIADO: "Estado cambiado",
  ORDEN_EDITADA: "Orden editada",
  EVIDENCIA_AGREGADA: "Evidencia agregada",
  MATERIAL_AGREGADO: "Material agregado",
  TECNICO_ASIGNADO: "Técnico asignado",
  COTIZACION_ENVIADA: "Cotización enviada",
  COTIZACION_APROBADA: "Cotización aprobada",
  COTIZACION_RECHAZADA: "Cotización rechazada",
  NOTA_AGREGADA: "Nota agregada",
};

// Iconos sugeridos para cada acción (para usar en el frontend)
const ACCION_ICONOS: Record<AccionHistorial, string> = {
  ORDEN_CREADA: "plus-circle",
  ESTADO_CAMBIADO: "refresh-cw",
  ORDEN_EDITADA: "edit",
  EVIDENCIA_AGREGADA: "camera",
  MATERIAL_AGREGADO: "package",
  TECNICO_ASIGNADO: "user-check",
  COTIZACION_ENVIADA: "file-text",
  COTIZACION_APROBADA: "check-circle",
  COTIZACION_RECHAZADA: "x-circle",
  NOTA_AGREGADA: "message-square",
};

// Colores sugeridos para cada acción
const ACCION_COLORES: Record<AccionHistorial, string> = {
  ORDEN_CREADA: "#10B981", // green
  ESTADO_CAMBIADO: "#6366F1", // indigo
  ORDEN_EDITADA: "#F59E0B", // amber
  EVIDENCIA_AGREGADA: "#8B5CF6", // purple
  MATERIAL_AGREGADO: "#EC4899", // pink
  TECNICO_ASIGNADO: "#3B82F6", // blue
  COTIZACION_ENVIADA: "#06B6D4", // cyan
  COTIZACION_APROBADA: "#10B981", // green
  COTIZACION_RECHAZADA: "#EF4444", // red
  NOTA_AGREGADA: "#78716C", // stone
};

// GET /api/ordenes/[id]/historial - Obtener historial completo de una orden
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

    // Verificar que la orden existe
    const orden = await prisma.orden.findUnique({
      where: { id },
      select: { id: true, folio: true, tecnicoId: true, creadoPorId: true },
    });

    if (!orden) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    if (!canAccessOrden(session, orden)) {
      return unauthorizedResponse("No tienes permisos para acceder a esta orden");
    }

    // Obtener historial completo
    const historial = await prisma.historialOrden.findMany({
      where: { ordenId: id },
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { fecha: "desc" },
    });

    // Formatear respuesta con labels e iconos
    const historialFormateado = historial.map((item) => ({
      id: item.id,
      fecha: item.fecha,
      accion: item.accion,
      accionLabel: ACCION_LABELS[item.accion],
      accionIcono: ACCION_ICONOS[item.accion],
      accionColor: ACCION_COLORES[item.accion],
      detalles: item.detalles,
      usuario: {
        id: item.usuario.id,
        nombre: item.usuario.name,
      },
    }));

    return NextResponse.json({
      ordenId: id,
      folio: orden.folio,
      totalEventos: historial.length,
      historial: historialFormateado,
    });
  } catch (error) {
    console.error("Error fetching historial:", error);
    return NextResponse.json(
      { error: "Error al obtener historial" },
      { status: 500 }
    );
  }
}
