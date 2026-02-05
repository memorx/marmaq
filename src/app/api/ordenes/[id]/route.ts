import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { calcularSemaforo } from "@/types/ordenes";
import { Prisma, EstadoOrden, AccionHistorial } from "@prisma/client";
import { UpdateOrdenSchema } from "@/lib/validators/ordenes";
import {
  notificarCambioEstado,
  notificarTecnicoReasignado,
  notificarPrioridadUrgente,
  notificarCotizacionModificada,
  notificarOrdenCancelada,
} from "@/lib/notificaciones/notification-triggers";
import {
  checkRole,
  unauthorizedResponse,
  canAccessOrden,
  getUserRole,
  canTecnicoUpdateFields,
  canRefaccionesUpdateOrden,
} from "@/lib/auth/authorize";

type RouteParams = Promise<{ id: string }>;

// ============ GET /api/ordenes/[id] ============
// Obtener detalle completo de una orden con todas sus relaciones
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

    const orden = await prisma.orden.findUnique({
      where: { id },
      include: {
        cliente: true,
        tecnico: true,
        creadoPor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        evidencias: {
          orderBy: { createdAt: "desc" },
        },
        materialesUsados: {
          include: {
            material: true,
          },
        },
        historial: {
          include: {
            usuario: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!orden) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // RBAC: Verificar que el usuario puede acceder a esta orden
    if (!canAccessOrden(session, orden)) {
      return unauthorizedResponse("No tienes permisos para ver esta orden");
    }

    // Agregar semáforo calculado
    const ordenConSemaforo = {
      ...orden,
      semaforo: calcularSemaforo(orden),
    };

    return NextResponse.json(ordenConSemaforo);
  } catch (error) {
    console.error("Error fetching orden:", error);
    return NextResponse.json(
      { error: "Error al obtener la orden" },
      { status: 500 }
    );
  }
}

// ============ PATCH /api/ordenes/[id] ============
// Actualizar orden con auto-seteo de timestamps según estado
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
    const rawBody = await request.json();
    const parsed = UpdateOrdenSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Verificar que la orden existe y obtener valores actuales para comparar
    const ordenActual = await prisma.orden.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        tecnicoId: true,
        tipoServicio: true,
        cotizacion: true,
        cotizacionAprobada: true,
        diagnostico: true,
        notasTecnico: true,
        prioridad: true,
      },
    });

    if (!ordenActual) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // RBAC: Verificar permisos de actualización según rol
    const userRole = getUserRole(session);

    // SUPER_ADMIN y COORD_SERVICIO pueden actualizar todo
    if (userRole !== "SUPER_ADMIN" && userRole !== "COORD_SERVICIO") {
      // TECNICO: solo puede actualizar órdenes asignadas a él y campos específicos
      if (userRole === "TECNICO") {
        // Verificar que la orden está asignada a este técnico
        if (ordenActual.tecnicoId !== session.user.id) {
          return unauthorizedResponse("Solo puedes actualizar órdenes asignadas a ti");
        }

        // Verificar que solo actualiza campos permitidos
        const updateFields = Object.keys(body).filter(
          (key) => body[key as keyof typeof body] !== undefined
        );
        const { allowed, forbiddenFields } = canTecnicoUpdateFields(updateFields, ordenActual);

        if (!allowed) {
          return unauthorizedResponse(
            `No tienes permisos para actualizar los campos: ${forbiddenFields.join(", ")}`
          );
        }
      }

      // REFACCIONES: solo puede actualizar órdenes en estado ESPERA_REFACCIONES
      if (userRole === "REFACCIONES") {
        if (!canRefaccionesUpdateOrden(ordenActual)) {
          return unauthorizedResponse(
            "Solo puedes actualizar órdenes en estado Espera Refacciones"
          );
        }
      }
    }

    // Preparar datos de actualización
    const updateData: Prisma.OrdenUpdateInput = {};

    // Campos básicos
    if (body.prioridad !== undefined) {
      updateData.prioridad = body.prioridad;
    }

    if (body.diagnostico !== undefined) {
      updateData.diagnostico = body.diagnostico;
    }

    if (body.notasTecnico !== undefined) {
      updateData.notasTecnico = body.notasTecnico;
    }

    if (body.cotizacion !== undefined) {
      updateData.cotizacion = body.cotizacion;
    }

    if (body.cotizacionAprobada !== undefined) {
      updateData.cotizacionAprobada = body.cotizacionAprobada;
    }

    if (body.fechaPromesa !== undefined) {
      updateData.fechaPromesa = body.fechaPromesa ? new Date(body.fechaPromesa) : null;
    }

    // Datos del equipo
    if (body.marcaEquipo !== undefined) {
      updateData.marcaEquipo = body.marcaEquipo;
    }

    if (body.modeloEquipo !== undefined) {
      updateData.modeloEquipo = body.modeloEquipo;
    }

    if (body.serieEquipo !== undefined) {
      updateData.serieEquipo = body.serieEquipo;
    }

    if (body.condicionEquipo !== undefined) {
      updateData.condicionEquipo = body.condicionEquipo;
    }

    if (body.accesorios !== undefined) {
      updateData.accesorios = body.accesorios;
    }

    if (body.fallaReportada !== undefined) {
      updateData.fallaReportada = body.fallaReportada;
    }

    // Garantía
    if (body.numeroFactura !== undefined) {
      updateData.numeroFactura = body.numeroFactura;
    }

    if (body.fechaFactura !== undefined) {
      updateData.fechaFactura = body.fechaFactura ? new Date(body.fechaFactura) : null;
    }

    // REPARE
    if (body.numeroRepare !== undefined) {
      updateData.numeroRepare = body.numeroRepare;
    }

    if (body.coordenadasGPS !== undefined) {
      updateData.coordenadasGPS = body.coordenadasGPS;
    }

    // Técnico asignado
    if (body.tecnicoId !== undefined) {
      if (body.tecnicoId === null) {
        updateData.tecnico = { disconnect: true };
      } else {
        updateData.tecnico = { connect: { id: body.tecnicoId } };
      }
    }

    // Manejo especial de cambio de estado
    const estadoCambiado = body.estado !== undefined && body.estado !== ordenActual.estado;

    if (estadoCambiado && body.estado) {
      updateData.estado = body.estado;

      // Auto-setear timestamps según el nuevo estado
      const timestampsPorEstado: Partial<Record<EstadoOrden, keyof Prisma.OrdenUpdateInput>> = {
        EN_DIAGNOSTICO: "fechaRecepcion", // Ya debería estar, pero por si acaso
        REPARADO: "fechaReparacion",
        ENTREGADO: "fechaEntrega",
      };

      const timestampField = timestampsPorEstado[body.estado];
      if (timestampField && !updateData[timestampField]) {
        (updateData as Record<string, Date>)[timestampField] = new Date();
      }
    }

    // Detectar tipos de cambios para el historial
    const tecnicoCambiado = body.tecnicoId !== undefined && body.tecnicoId !== ordenActual.tecnicoId;
    const cotizacionEnviada = body.cotizacion !== undefined && ordenActual.cotizacion === null;
    const cotizacionAprobadaCambiada = body.cotizacionAprobada !== undefined && body.cotizacionAprobada !== ordenActual.cotizacionAprobada;

    // Ejecutar actualización con historial en transacción
    const ordenActualizada = await prisma.$transaction(async (tx) => {
      // Actualizar orden
      const orden = await tx.orden.update({
        where: { id },
        data: updateData,
        include: {
          cliente: true,
          tecnico: {
            select: { id: true, name: true },
          },
          creadoPor: {
            select: { id: true, name: true },
          },
          _count: {
            select: { evidencias: true },
          },
        },
      });

      // Registrar cambio de estado en historial de estados
      if (estadoCambiado && body.estado) {
        await tx.historialEstado.create({
          data: {
            ordenId: id,
            estadoAnterior: ordenActual.estado,
            estadoNuevo: body.estado,
            usuarioId: session.user.id,
            notas: getNotaCambioEstado(ordenActual.estado, body.estado),
          },
        });

        // También registrar en historial completo de orden
        await tx.historialOrden.create({
          data: {
            ordenId: id,
            usuarioId: session.user.id,
            accion: "ESTADO_CAMBIADO",
            detalles: {
              estadoAnterior: ordenActual.estado,
              estadoNuevo: body.estado,
            },
          },
        });
      }

      // Registrar asignación de técnico
      if (tecnicoCambiado) {
        await tx.historialOrden.create({
          data: {
            ordenId: id,
            usuarioId: session.user.id,
            accion: "TECNICO_ASIGNADO",
            detalles: {
              tecnicoAnterior: ordenActual.tecnicoId,
              tecnicoNuevo: body.tecnicoId,
              nombreTecnico: orden.tecnico?.name || null,
            },
          },
        });
      }

      // Registrar envío de cotización
      if (cotizacionEnviada) {
        await tx.historialOrden.create({
          data: {
            ordenId: id,
            usuarioId: session.user.id,
            accion: "COTIZACION_ENVIADA",
            detalles: {
              monto: body.cotizacion,
            },
          },
        });
      }

      // Registrar aprobación/rechazo de cotización
      if (cotizacionAprobadaCambiada) {
        const accion: AccionHistorial = body.cotizacionAprobada ? "COTIZACION_APROBADA" : "COTIZACION_RECHAZADA";
        await tx.historialOrden.create({
          data: {
            ordenId: id,
            usuarioId: session.user.id,
            accion,
            detalles: {
              monto: orden.cotizacion ? Number(orden.cotizacion) : null,
            },
          },
        });
      }

      // Registrar agregado de notas
      if (body.notasTecnico !== undefined && body.notasTecnico !== ordenActual.notasTecnico) {
        await tx.historialOrden.create({
          data: {
            ordenId: id,
            usuarioId: session.user.id,
            accion: "NOTA_AGREGADA",
            detalles: {
              nota: body.notasTecnico,
            },
          },
        });
      }

      // Registrar ediciones generales (campos que no tienen acción específica)
      const camposEditados: string[] = [];
      if (body.diagnostico !== undefined && body.diagnostico !== ordenActual.diagnostico) camposEditados.push("diagnostico");
      if (body.prioridad !== undefined && body.prioridad !== ordenActual.prioridad) camposEditados.push("prioridad");
      if (body.marcaEquipo !== undefined) camposEditados.push("marcaEquipo");
      if (body.modeloEquipo !== undefined) camposEditados.push("modeloEquipo");
      if (body.serieEquipo !== undefined) camposEditados.push("serieEquipo");
      if (body.fallaReportada !== undefined) camposEditados.push("fallaReportada");
      if (body.fechaPromesa !== undefined) camposEditados.push("fechaPromesa");

      if (camposEditados.length > 0 && !estadoCambiado && !tecnicoCambiado && !cotizacionEnviada) {
        await tx.historialOrden.create({
          data: {
            ordenId: id,
            usuarioId: session.user.id,
            accion: "ORDEN_EDITADA",
            detalles: {
              camposModificados: camposEditados,
            },
          },
        });
      }

      return orden;
    });

    // Disparar notificaciones (fire-and-forget, no bloquea el response)
    const ordenParaNotif = {
      id: ordenActualizada.id,
      folio: ordenActualizada.folio,
      tecnicoId: ordenActualizada.tecnicoId,
      marcaEquipo: ordenActualizada.marcaEquipo,
      modeloEquipo: ordenActualizada.modeloEquipo,
    };

    // Trigger 2: Estado cambiado
    if (estadoCambiado && body.estado) {
      notificarCambioEstado(
        ordenParaNotif,
        ordenActual.estado,
        body.estado,
        session.user.id
      ).catch(() => {});
    }

    // Trigger 4: Técnico reasignado
    if (tecnicoCambiado) {
      notificarTecnicoReasignado(
        ordenParaNotif,
        ordenActual.tecnicoId,
        body.tecnicoId ?? null,
        session.user.id
      ).catch(() => {});
    }

    // Trigger 5: Prioridad → URGENTE
    if (body.prioridad === "URGENTE" && ordenActual.prioridad !== "URGENTE") {
      notificarPrioridadUrgente(ordenParaNotif, session.user.id).catch(() => {});
    }

    // Trigger 6: Cotización modificada (no nueva, sino cambiada)
    if (body.cotizacion !== undefined && ordenActual.cotizacion !== null) {
      const montoAnterior = Number(ordenActual.cotizacion);
      const montoNuevo = Number(body.cotizacion);
      if (montoAnterior !== montoNuevo) {
        notificarCotizacionModificada(
          ordenParaNotif,
          montoAnterior,
          montoNuevo,
          session.user.id
        ).catch(() => {});
      }
    }

    // Agregar semáforo calculado
    const ordenConSemaforo = {
      ...ordenActualizada,
      semaforo: calcularSemaforo(ordenActualizada),
    };

    return NextResponse.json(ordenConSemaforo);
  } catch (error) {
    console.error("Error updating orden:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Técnico no encontrado" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Error al actualizar la orden" },
      { status: 500 }
    );
  }
}

// Helper para generar nota de cambio de estado
function getNotaCambioEstado(estadoAnterior: EstadoOrden, estadoNuevo: EstadoOrden): string {
  const transiciones: Record<string, string> = {
    "RECIBIDO->EN_DIAGNOSTICO": "Equipo pasado a diagnóstico",
    "EN_DIAGNOSTICO->ESPERA_REFACCIONES": "En espera de refacciones",
    "EN_DIAGNOSTICO->COTIZACION_PENDIENTE": "Cotización enviada al cliente",
    "EN_DIAGNOSTICO->EN_REPARACION": "Reparación iniciada",
    "COTIZACION_PENDIENTE->EN_REPARACION": "Cotización aprobada, reparación iniciada",
    "COTIZACION_PENDIENTE->CANCELADO": "Cotización rechazada por cliente",
    "ESPERA_REFACCIONES->EN_REPARACION": "Refacciones recibidas, reparación iniciada",
    "EN_REPARACION->REPARADO": "Reparación completada",
    "REPARADO->LISTO_ENTREGA": "Equipo listo para entrega",
    "LISTO_ENTREGA->ENTREGADO": "Equipo entregado al cliente",
  };

  const key = `${estadoAnterior}->${estadoNuevo}`;
  return transiciones[key] || `Estado cambiado de ${estadoAnterior} a ${estadoNuevo}`;
}

// ============ DELETE /api/ordenes/[id] ============
// Eliminar orden (soft delete o cancelación)
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // RBAC: Solo SUPER_ADMIN y COORD_SERVICIO pueden cancelar órdenes
    if (!checkRole(session, ["SUPER_ADMIN", "COORD_SERVICIO"])) {
      return unauthorizedResponse("No tienes permisos para cancelar órdenes");
    }

    const { id } = await params;

    // Verificar que la orden existe y obtener datos para notificación
    const orden = await prisma.orden.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        folio: true,
        tecnicoId: true,
        marcaEquipo: true,
        modeloEquipo: true,
      },
    });

    if (!orden) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // No permitir eliminar órdenes ya entregadas
    if (orden.estado === "ENTREGADO") {
      return NextResponse.json(
        { error: "No se puede eliminar una orden ya entregada" },
        { status: 400 }
      );
    }

    // Soft delete: cambiar estado a CANCELADO
    await prisma.$transaction(async (tx) => {
      await tx.orden.update({
        where: { id },
        data: { estado: "CANCELADO" },
      });

      await tx.historialEstado.create({
        data: {
          ordenId: id,
          estadoAnterior: orden.estado,
          estadoNuevo: "CANCELADO",
          usuarioId: session.user.id,
          notas: "Orden cancelada",
        },
      });
    });

    // Disparar notificación de cancelación (fire-and-forget)
    notificarOrdenCancelada(
      {
        id: orden.id,
        folio: orden.folio,
        tecnicoId: orden.tecnicoId,
        marcaEquipo: orden.marcaEquipo,
        modeloEquipo: orden.modeloEquipo,
        estado: orden.estado,
      },
      session.user.id
    ).catch(() => {});

    return NextResponse.json({ message: "Orden cancelada exitosamente" });
  } catch (error) {
    console.error("Error deleting orden:", error);
    return NextResponse.json(
      { error: "Error al eliminar la orden" },
      { status: 500 }
    );
  }
}
