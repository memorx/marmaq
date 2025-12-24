import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { TipoNotificacionWA } from "@prisma/client";
import { PLANTILLAS_DEFAULT } from "@/lib/whatsapp/templates";

// GET /api/configuracion - Obtener configuración y plantillas
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo SUPER_ADMIN y COORD_SERVICIO pueden ver configuración
    if (!["SUPER_ADMIN", "COORD_SERVICIO"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Obtener todas las configuraciones
    const configuraciones = await prisma.configuracion.findMany();

    // Convertir a objeto clave-valor
    const config: Record<string, string> = {};
    for (const c of configuraciones) {
      config[c.clave] = c.valor;
    }

    // Obtener plantillas de WhatsApp
    const plantillasDB = await prisma.plantillaMensaje.findMany({
      orderBy: { tipo: "asc" },
    });

    // Combinar con defaults para mostrar todas las plantillas
    const tiposNotificacion: TipoNotificacionWA[] = [
      "RECIBIDO",
      "EN_REPARACION",
      "COTIZACION",
      "LISTO_ENTREGA",
      "ENTREGADO",
      "RECORDATORIO",
      "PERSONALIZADO",
    ];

    const plantillas = tiposNotificacion.map((tipo) => {
      const plantillaDB = plantillasDB.find((p) => p.tipo === tipo);
      const plantillaDefault = PLANTILLAS_DEFAULT[tipo];

      return {
        tipo,
        nombre: plantillaDB?.nombre || plantillaDefault.nombre,
        mensaje: plantillaDB?.mensaje || plantillaDefault.mensaje,
        activa: plantillaDB?.activa ?? true,
        esDefault: !plantillaDB,
      };
    });

    return NextResponse.json({
      config: {
        whatsappHabilitado: config.WHATSAPP_HABILITADO === "true",
        whatsappNumeroEnvio: config.WHATSAPP_NUMERO_ENVIO || "",
        whatsappApiKey: config.WHATSAPP_API_KEY ? "********" : "", // Ocultar API key
        empresaNombre: config.EMPRESA_NOMBRE || "MARMAQ Servicios",
        empresaTelefono: config.EMPRESA_TELEFONO || "",
        empresaDireccion: config.EMPRESA_DIRECCION || "",
      },
      plantillas,
    });
  } catch (error) {
    console.error("Error fetching configuration:", error);
    return NextResponse.json(
      { error: "Error al obtener configuración" },
      { status: 500 }
    );
  }
}

// PATCH /api/configuracion - Actualizar configuración
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo SUPER_ADMIN puede modificar configuración
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const { configuraciones, plantillas } = body as {
      configuraciones?: Record<string, string>;
      plantillas?: Array<{
        tipo: TipoNotificacionWA;
        nombre: string;
        mensaje: string;
        activa: boolean;
      }>;
    };

    // Actualizar configuraciones generales
    if (configuraciones) {
      for (const [clave, valor] of Object.entries(configuraciones)) {
        await prisma.configuracion.upsert({
          where: { clave },
          update: { valor },
          create: { clave, valor },
        });
      }
    }

    // Actualizar plantillas de mensajes
    if (plantillas) {
      for (const plantilla of plantillas) {
        await prisma.plantillaMensaje.upsert({
          where: { tipo: plantilla.tipo },
          update: {
            nombre: plantilla.nombre,
            mensaje: plantilla.mensaje,
            activa: plantilla.activa,
          },
          create: {
            tipo: plantilla.tipo,
            nombre: plantilla.nombre,
            mensaje: plantilla.mensaje,
            activa: plantilla.activa,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: "Configuración actualizada correctamente",
    });
  } catch (error) {
    console.error("Error updating configuration:", error);
    return NextResponse.json(
      { error: "Error al actualizar configuración" },
      { status: 500 }
    );
  }
}

// POST /api/configuracion/reset-plantilla - Restaurar plantilla a default
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const { tipo } = body as { tipo: TipoNotificacionWA };

    if (!tipo || !PLANTILLAS_DEFAULT[tipo]) {
      return NextResponse.json(
        { error: "Tipo de plantilla inválido" },
        { status: 400 }
      );
    }

    // Eliminar plantilla personalizada para volver al default
    await prisma.plantillaMensaje.deleteMany({
      where: { tipo },
    });

    return NextResponse.json({
      success: true,
      mensaje: "Plantilla restaurada a valores predeterminados",
      plantilla: PLANTILLAS_DEFAULT[tipo],
    });
  } catch (error) {
    console.error("Error resetting template:", error);
    return NextResponse.json(
      { error: "Error al restaurar plantilla" },
      { status: 500 }
    );
  }
}
