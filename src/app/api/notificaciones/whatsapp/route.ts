import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { TipoNotificacionWA, EstadoNotificacionWA } from "@prisma/client";
import {
  PLANTILLAS_DEFAULT,
  procesarPlantilla,
  formatearTelefono,
  validarTelefono,
  generarLinkWhatsApp,
  type PlantillaVariables,
} from "@/lib/whatsapp/templates";

// GET /api/notificaciones/whatsapp - Listar notificaciones
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ordenId = searchParams.get("ordenId");
    const estado = searchParams.get("estado");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Construir filtro
    const where: {
      ordenId?: string;
      estado?: EstadoNotificacionWA;
    } = {};

    if (ordenId) {
      where.ordenId = ordenId;
    }

    if (estado && ["PENDIENTE", "ENVIADO", "ENTREGADO", "LEIDO", "ERROR"].includes(estado)) {
      where.estado = estado as EstadoNotificacionWA;
    }

    const notificaciones = await prisma.notificacionWhatsApp.findMany({
      where,
      include: {
        orden: {
          select: {
            id: true,
            folio: true,
          },
        },
        cliente: {
          select: {
            id: true,
            nombre: true,
            empresa: true,
          },
        },
      },
      orderBy: { fechaCreacion: "desc" },
      take: limit,
    });

    return NextResponse.json(notificaciones);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Error al obtener notificaciones" },
      { status: 500 }
    );
  }
}

// POST /api/notificaciones/whatsapp - Crear y/o enviar notificación
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { ordenId, tipo, mensajePersonalizado } = body as {
      ordenId: string;
      tipo: TipoNotificacionWA;
      mensajePersonalizado?: string;
    };

    // Validar campos requeridos
    if (!ordenId) {
      return NextResponse.json(
        { error: "ordenId es requerido" },
        { status: 400 }
      );
    }

    if (!tipo) {
      return NextResponse.json(
        { error: "tipo de notificación es requerido" },
        { status: 400 }
      );
    }

    // Obtener la orden con datos del cliente
    const orden = await prisma.orden.findUnique({
      where: { id: ordenId },
      include: {
        cliente: true,
        tecnico: {
          select: { name: true },
        },
      },
    });

    if (!orden) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // Validar teléfono del cliente
    if (!orden.cliente.telefono || !validarTelefono(orden.cliente.telefono)) {
      return NextResponse.json(
        { error: "El cliente no tiene un número de teléfono válido" },
        { status: 400 }
      );
    }

    // Obtener plantilla (primero de BD, luego default)
    let plantillaMensaje: string;

    if (mensajePersonalizado) {
      plantillaMensaje = mensajePersonalizado;
    } else {
      const plantillaDB = await prisma.plantillaMensaje.findUnique({
        where: { tipo },
      });

      if (plantillaDB && plantillaDB.activa) {
        plantillaMensaje = plantillaDB.mensaje;
      } else {
        plantillaMensaje = PLANTILLAS_DEFAULT[tipo].mensaje;
      }
    }

    // Preparar variables para la plantilla
    const variables: PlantillaVariables = {
      nombre: orden.cliente.nombre,
      empresa: orden.cliente.empresa || undefined,
      folio: orden.folio,
      marca: orden.marcaEquipo,
      modelo: orden.modeloEquipo,
      tecnico: orden.tecnico?.name || undefined,
      cotizacion: orden.cotizacion
        ? `$${Number(orden.cotizacion).toLocaleString("es-MX")}`
        : undefined,
      fechaPromesa: orden.fechaPromesa
        ? new Date(orden.fechaPromesa).toLocaleDateString("es-MX")
        : undefined,
    };

    // Procesar plantilla
    const mensajeFinal = procesarPlantilla(plantillaMensaje, variables);
    const telefonoFormateado = formatearTelefono(orden.cliente.telefono);

    // Crear registro de notificación
    const notificacion = await prisma.notificacionWhatsApp.create({
      data: {
        ordenId: orden.id,
        clienteId: orden.cliente.id,
        telefono: telefonoFormateado,
        tipo,
        mensaje: mensajeFinal,
        estado: "PENDIENTE",
      },
    });

    // Verificar si WhatsApp está habilitado
    const configWhatsApp = await prisma.configuracion.findUnique({
      where: { clave: "WHATSAPP_HABILITADO" },
    });

    const whatsappHabilitado = configWhatsApp?.valor === "true";

    // TODO: Aquí iría la integración real con WhatsApp API
    // Por ahora, solo generamos el link para envío manual

    const linkWhatsApp = generarLinkWhatsApp(telefonoFormateado, mensajeFinal);

    // Si hay integración habilitada, intentar enviar
    if (whatsappHabilitado) {
      // TODO: Implementar envío real con Twilio o WhatsApp Business API
      // Por ahora simulamos que se envió
      await prisma.notificacionWhatsApp.update({
        where: { id: notificacion.id },
        data: {
          estado: "PENDIENTE", // Cambiar a ENVIADO cuando se implemente
          // fechaEnvio: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        notificacion: {
          id: notificacion.id,
          tipo: notificacion.tipo,
          estado: notificacion.estado,
          mensaje: notificacion.mensaje,
          telefono: notificacion.telefono,
        },
        linkWhatsApp,
        envioAutomatico: whatsappHabilitado,
        mensaje: whatsappHabilitado
          ? "Notificación creada y pendiente de envío"
          : "Notificación creada. Use el link para enviar manualmente.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Error al crear notificación" },
      { status: 500 }
    );
  }
}
