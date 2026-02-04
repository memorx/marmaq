import { notificarPorRol, notificarUsuarios } from "./notification-service";
import {
  EstadoOrden,
  TipoNotificacion,
  PrioridadNotif,
  Role,
} from "@prisma/client";

// ============ TIPOS ============

export interface OrdenBasica {
  id: string;
  folio: string;
  tecnicoId: string | null;
  marcaEquipo: string;
  modeloEquipo: string;
}

// ============ TRIGGER 1: ORDEN CREADA ============

/**
 * Notifica cuando se crea una nueva orden.
 * Destinatarios: COORD_SERVICIO + SUPER_ADMIN (excepto el creador)
 */
export async function notificarOrdenCreada(
  orden: OrdenBasica,
  creadoPorId: string
): Promise<void> {
  try {
    await notificarPorRol({
      roles: [Role.COORD_SERVICIO, Role.SUPER_ADMIN],
      ordenId: orden.id,
      tipo: TipoNotificacion.ORDEN_CREADA,
      titulo: "🔵 Nueva orden creada",
      mensaje: `Se creó la orden ${orden.folio} para ${orden.marcaEquipo} ${orden.modeloEquipo}`,
      prioridad: PrioridadNotif.NORMAL,
      excluirUsuarioId: creadoPorId,
    });
  } catch (error) {
    console.error("Error en notificarOrdenCreada:", error);
  }
}

// ============ TRIGGER 2: ESTADO CAMBIADO ============

/**
 * Notifica cuando cambia el estado de una orden.
 * Los destinatarios varían según el nuevo estado.
 */
export async function notificarCambioEstado(
  orden: OrdenBasica,
  estadoAnterior: EstadoOrden,
  estadoNuevo: EstadoOrden,
  cambiadoPorId: string
): Promise<void> {
  try {
    // No notificar si cambia a CANCELADO (se maneja en trigger #3)
    if (estadoNuevo === EstadoOrden.CANCELADO) {
      return;
    }

    switch (estadoNuevo) {
      case EstadoOrden.EN_DIAGNOSTICO:
        // Notificar al técnico asignado
        if (orden.tecnicoId) {
          await notificarUsuarios({
            usuarioIds: [orden.tecnicoId],
            ordenId: orden.id,
            tipo: TipoNotificacion.ESTADO_CAMBIADO,
            titulo: "📋 Orden asignada para diagnóstico",
            mensaje: `Se te asignó la orden ${orden.folio} para diagnóstico (${orden.marcaEquipo} ${orden.modeloEquipo})`,
            prioridad: PrioridadNotif.NORMAL,
            excluirUsuarioId: cambiadoPorId,
          });
        }
        break;

      case EstadoOrden.ESPERA_REFACCIONES:
        // Notificar a REFACCIONES + COORD_SERVICIO
        await notificarPorRol({
          roles: [Role.REFACCIONES, Role.COORD_SERVICIO],
          ordenId: orden.id,
          tipo: TipoNotificacion.ESTADO_CAMBIADO,
          titulo: "🟠 Orden necesita refacciones",
          mensaje: `La orden ${orden.folio} necesita refacciones (${orden.marcaEquipo} ${orden.modeloEquipo})`,
          prioridad: PrioridadNotif.ALTA,
          excluirUsuarioId: cambiadoPorId,
        });
        break;

      case EstadoOrden.COTIZACION_PENDIENTE:
        // Notificar a COORD_SERVICIO + SUPER_ADMIN
        await notificarPorRol({
          roles: [Role.COORD_SERVICIO, Role.SUPER_ADMIN],
          ordenId: orden.id,
          tipo: TipoNotificacion.ESTADO_CAMBIADO,
          titulo: "🟡 Cotización pendiente de aprobación",
          mensaje: `Cotización pendiente de aprobación para ${orden.folio} (${orden.marcaEquipo} ${orden.modeloEquipo})`,
          prioridad: PrioridadNotif.NORMAL,
          excluirUsuarioId: cambiadoPorId,
        });
        break;

      case EstadoOrden.EN_REPARACION:
        // Notificar al técnico asignado
        if (orden.tecnicoId) {
          await notificarUsuarios({
            usuarioIds: [orden.tecnicoId],
            ordenId: orden.id,
            tipo: TipoNotificacion.ESTADO_CAMBIADO,
            titulo: "🔧 Puedes iniciar la reparación",
            mensaje: `Puedes iniciar la reparación de ${orden.folio} (${orden.marcaEquipo} ${orden.modeloEquipo})`,
            prioridad: PrioridadNotif.NORMAL,
            excluirUsuarioId: cambiadoPorId,
          });
        }
        break;

      case EstadoOrden.REPARADO:
        // Notificar a COORD_SERVICIO + SUPER_ADMIN
        await notificarPorRol({
          roles: [Role.COORD_SERVICIO, Role.SUPER_ADMIN],
          ordenId: orden.id,
          tipo: TipoNotificacion.ESTADO_CAMBIADO,
          titulo: "✅ Reparación completada",
          mensaje: `El técnico completó la reparación de ${orden.folio} (${orden.marcaEquipo} ${orden.modeloEquipo})`,
          prioridad: PrioridadNotif.NORMAL,
          excluirUsuarioId: cambiadoPorId,
        });
        break;

      case EstadoOrden.LISTO_ENTREGA:
        // Notificar a COORD_SERVICIO + SUPER_ADMIN
        await notificarPorRol({
          roles: [Role.COORD_SERVICIO, Role.SUPER_ADMIN],
          ordenId: orden.id,
          tipo: TipoNotificacion.ESTADO_CAMBIADO,
          titulo: "📦 Orden lista para entrega",
          mensaje: `Orden ${orden.folio} lista para entrega al cliente (${orden.marcaEquipo} ${orden.modeloEquipo})`,
          prioridad: PrioridadNotif.NORMAL,
          excluirUsuarioId: cambiadoPorId,
        });
        break;

      case EstadoOrden.ENTREGADO:
        // Notificar a COORD_SERVICIO + SUPER_ADMIN
        await notificarPorRol({
          roles: [Role.COORD_SERVICIO, Role.SUPER_ADMIN],
          ordenId: orden.id,
          tipo: TipoNotificacion.ESTADO_CAMBIADO,
          titulo: "🎉 Orden entregada",
          mensaje: `Orden ${orden.folio} entregada al cliente (${orden.marcaEquipo} ${orden.modeloEquipo})`,
          prioridad: PrioridadNotif.NORMAL,
          excluirUsuarioId: cambiadoPorId,
        });
        break;
    }
  } catch (error) {
    console.error("Error en notificarCambioEstado:", error);
  }
}

// ============ TRIGGER 3: ORDEN CANCELADA ============

/**
 * Notifica cuando se cancela una orden.
 * Destinatarios: Técnico asignado + COORD_SERVICIO + SUPER_ADMIN
 * Si estaba en ESPERA_REFACCIONES, también notifica a REFACCIONES
 */
export async function notificarOrdenCancelada(
  orden: OrdenBasica & { estado: EstadoOrden },
  canceladoPorId: string
): Promise<void> {
  try {
    // Notificar al técnico asignado
    if (orden.tecnicoId) {
      await notificarUsuarios({
        usuarioIds: [orden.tecnicoId],
        ordenId: orden.id,
        tipo: TipoNotificacion.ORDEN_CANCELADA,
        titulo: "❌ Orden cancelada",
        mensaje: `La orden ${orden.folio} ha sido cancelada (${orden.marcaEquipo} ${orden.modeloEquipo})`,
        prioridad: PrioridadNotif.ALTA,
        excluirUsuarioId: canceladoPorId,
      });
    }

    // Notificar a COORD_SERVICIO + SUPER_ADMIN
    await notificarPorRol({
      roles: [Role.COORD_SERVICIO, Role.SUPER_ADMIN],
      ordenId: orden.id,
      tipo: TipoNotificacion.ORDEN_CANCELADA,
      titulo: "❌ Orden cancelada",
      mensaje: `La orden ${orden.folio} ha sido cancelada (${orden.marcaEquipo} ${orden.modeloEquipo})`,
      prioridad: PrioridadNotif.ALTA,
      excluirUsuarioId: canceladoPorId,
    });

    // Si estaba en ESPERA_REFACCIONES, también notificar a REFACCIONES
    if (orden.estado === EstadoOrden.ESPERA_REFACCIONES) {
      await notificarPorRol({
        roles: [Role.REFACCIONES],
        ordenId: orden.id,
        tipo: TipoNotificacion.ORDEN_CANCELADA,
        titulo: "❌ Orden cancelada (refacciones ya no requeridas)",
        mensaje: `La orden ${orden.folio} que esperaba refacciones ha sido cancelada`,
        prioridad: PrioridadNotif.ALTA,
        excluirUsuarioId: canceladoPorId,
      });
    }
  } catch (error) {
    console.error("Error en notificarOrdenCancelada:", error);
  }
}

// ============ TRIGGER 4: TÉCNICO REASIGNADO ============

/**
 * Notifica cuando se reasigna el técnico de una orden.
 * Destinatarios: Técnico anterior + técnico nuevo (excepto quien hizo el cambio)
 */
export async function notificarTecnicoReasignado(
  orden: OrdenBasica,
  tecnicoAnteriorId: string | null,
  tecnicoNuevoId: string | null,
  cambiadoPorId: string
): Promise<void> {
  try {
    const usuariosANotificar: string[] = [];

    if (tecnicoAnteriorId) {
      usuariosANotificar.push(tecnicoAnteriorId);
    }

    if (tecnicoNuevoId) {
      usuariosANotificar.push(tecnicoNuevoId);
    }

    if (usuariosANotificar.length === 0) {
      return;
    }

    // Notificar al técnico anterior (se le quitó la orden)
    if (tecnicoAnteriorId && tecnicoAnteriorId !== cambiadoPorId) {
      await notificarUsuarios({
        usuarioIds: [tecnicoAnteriorId],
        ordenId: orden.id,
        tipo: TipoNotificacion.TECNICO_REASIGNADO,
        titulo: "🔄 Orden reasignada",
        mensaje: `La orden ${orden.folio} ha sido reasignada a otro técnico`,
        prioridad: PrioridadNotif.NORMAL,
        excluirUsuarioId: cambiadoPorId,
      });
    }

    // Notificar al técnico nuevo (se le asignó la orden)
    if (tecnicoNuevoId && tecnicoNuevoId !== cambiadoPorId) {
      await notificarUsuarios({
        usuarioIds: [tecnicoNuevoId],
        ordenId: orden.id,
        tipo: TipoNotificacion.TECNICO_REASIGNADO,
        titulo: "📋 Nueva orden asignada",
        mensaje: `Se te asignó la orden ${orden.folio} (${orden.marcaEquipo} ${orden.modeloEquipo})`,
        prioridad: PrioridadNotif.NORMAL,
        excluirUsuarioId: cambiadoPorId,
      });
    }
  } catch (error) {
    console.error("Error en notificarTecnicoReasignado:", error);
  }
}

// ============ TRIGGER 5: PRIORIDAD URGENTE ============

/**
 * Notifica cuando la prioridad de una orden cambia a URGENTE.
 * Destinatario: Técnico asignado
 */
export async function notificarPrioridadUrgente(
  orden: OrdenBasica,
  cambiadoPorId: string
): Promise<void> {
  try {
    if (!orden.tecnicoId) {
      return;
    }

    await notificarUsuarios({
      usuarioIds: [orden.tecnicoId],
      ordenId: orden.id,
      tipo: TipoNotificacion.PRIORIDAD_URGENTE,
      titulo: "🚨 ORDEN URGENTE",
      mensaje: `La orden ${orden.folio} ha sido marcada como URGENTE (${orden.marcaEquipo} ${orden.modeloEquipo})`,
      prioridad: PrioridadNotif.URGENTE,
      excluirUsuarioId: cambiadoPorId,
    });
  } catch (error) {
    console.error("Error en notificarPrioridadUrgente:", error);
  }
}

// ============ TRIGGER 6: COTIZACIÓN MODIFICADA ============

/**
 * Notifica cuando se modifica una cotización existente.
 * Destinatarios: COORD_SERVICIO + SUPER_ADMIN (excepto quien modificó)
 */
export async function notificarCotizacionModificada(
  orden: OrdenBasica,
  montoAnterior: number,
  montoNuevo: number,
  modificadoPorId: string
): Promise<void> {
  try {
    const formatMoney = (n: number) =>
      n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

    await notificarPorRol({
      roles: [Role.COORD_SERVICIO, Role.SUPER_ADMIN],
      ordenId: orden.id,
      tipo: TipoNotificacion.COTIZACION_MODIFICADA,
      titulo: "💰 Cotización modificada",
      mensaje: `La cotización de ${orden.folio} cambió de ${formatMoney(montoAnterior)} a ${formatMoney(montoNuevo)}`,
      prioridad: PrioridadNotif.NORMAL,
      excluirUsuarioId: modificadoPorId,
    });
  } catch (error) {
    console.error("Error en notificarCotizacionModificada:", error);
  }
}
