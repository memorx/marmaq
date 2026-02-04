import prisma from "@/lib/db/prisma";
import { calcularSemaforo } from "@/types/ordenes";
import { notificarPorRol, notificarUsuarios } from "./notification-service";
import { TipoNotificacion, PrioridadNotif, Role, EstadoOrden } from "@prisma/client";

export interface CronResult {
  alertasRojas: number;
  alertasAmarillas: number;
  notificacionesCreadas: number;
  errores: number;
}

/**
 * Revisa todas las órdenes activas y genera notificaciones
 * para las que hayan cruzado umbrales de tiempo.
 *
 * LÓGICA ANTI-SPAM: Solo genera UNA notificación por orden por tipo.
 * Si ya existe una notificación ALERTA_ROJO para la orden X que no ha sido leída,
 * NO crea otra. Esto evita que el cron genere spam cada hora.
 */
export async function ejecutarCronAlertas(): Promise<CronResult> {
  const result: CronResult = {
    alertasRojas: 0,
    alertasAmarillas: 0,
    notificacionesCreadas: 0,
    errores: 0,
  };

  // Buscar todas las órdenes que NO estén en ENTREGADO ni CANCELADO
  // If this fails, we throw - it's a critical error
  const ordenes = await prisma.orden.findMany({
    where: {
      estado: {
        notIn: [EstadoOrden.ENTREGADO, EstadoOrden.CANCELADO],
      },
    },
    include: {
      cliente: {
        select: {
          nombre: true,
        },
      },
      tecnico: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  for (const orden of ordenes) {
    try {
      const semaforo = calcularSemaforo(orden);

      if (semaforo === "ROJO") {
        await procesarAlertaRoja(orden, result);
      } else if (semaforo === "AMARILLO") {
        await procesarAlertaAmarilla(orden, result);
      }
    } catch (error) {
      console.error(`Error procesando orden ${orden.folio}:`, error);
      result.errores++;
    }
  }

  return result;
}

/**
 * Procesa una alerta roja (equipo sin recoger > 5 días)
 */
async function procesarAlertaRoja(
  orden: {
    id: string;
    folio: string;
    marcaEquipo: string;
    modeloEquipo: string;
    fechaReparacion: Date | null;
    fechaRecepcion: Date;
    cliente: { nombre: string };
  },
  result: CronResult
): Promise<void> {
  // Verificar anti-spam: ya existe notificación ALERTA_ROJO no leída?
  const yaNotificada = await prisma.notificacion.findFirst({
    where: {
      ordenId: orden.id,
      tipo: TipoNotificacion.ALERTA_ROJO,
      leida: false,
    },
  });

  if (yaNotificada) {
    return; // Skip, ya se notificó
  }

  result.alertasRojas++;

  // Calcular días sin recoger
  const ahora = new Date();
  const fechaReparacion = orden.fechaReparacion
    ? new Date(orden.fechaReparacion)
    : new Date(orden.fechaRecepcion);
  const diasSinRecoger = Math.floor(
    (ahora.getTime() - fechaReparacion.getTime()) / (1000 * 60 * 60 * 24)
  );

  try {
    await notificarPorRol({
      roles: [Role.COORD_SERVICIO, Role.SUPER_ADMIN],
      ordenId: orden.id,
      tipo: TipoNotificacion.ALERTA_ROJO,
      titulo: `🔴 Equipo sin recoger: ${orden.folio}`,
      mensaje: `${orden.marcaEquipo} ${orden.modeloEquipo} lleva ${diasSinRecoger} días listo. Cliente: ${orden.cliente.nombre}`,
      prioridad: PrioridadNotif.ALTA,
    });
    result.notificacionesCreadas++;
  } catch (error) {
    console.error(`Error notificando alerta roja para ${orden.folio}:`, error);
    result.errores++;
  }
}

/**
 * Procesa una alerta amarilla (diagnóstico/cotización > 72h)
 */
async function procesarAlertaAmarilla(
  orden: {
    id: string;
    folio: string;
    marcaEquipo: string;
    modeloEquipo: string;
    fechaRecepcion: Date;
    tecnicoId: string | null;
    tecnico: { id: string; name: string } | null;
  },
  result: CronResult
): Promise<void> {
  // Verificar anti-spam: ya existe notificación ALERTA_AMARILLO no leída?
  const yaNotificada = await prisma.notificacion.findFirst({
    where: {
      ordenId: orden.id,
      tipo: TipoNotificacion.ALERTA_AMARILLO,
      leida: false,
    },
  });

  if (yaNotificada) {
    return; // Skip, ya se notificó
  }

  result.alertasAmarillas++;

  // Calcular horas sin avance
  const ahora = new Date();
  const fechaRecepcion = new Date(orden.fechaRecepcion);
  const horasSinAvance = Math.floor(
    (ahora.getTime() - fechaRecepcion.getTime()) / (1000 * 60 * 60)
  );

  const nombreTecnico = orden.tecnico?.name || "Sin asignar";

  try {
    // Notificar a COORD_SERVICIO + SUPER_ADMIN
    await notificarPorRol({
      roles: [Role.COORD_SERVICIO, Role.SUPER_ADMIN],
      ordenId: orden.id,
      tipo: TipoNotificacion.ALERTA_AMARILLO,
      titulo: `🟡 Diagnóstico atrasado: ${orden.folio}`,
      mensaje: `${orden.marcaEquipo} ${orden.modeloEquipo} lleva ${horasSinAvance}h sin avance. Técnico: ${nombreTecnico}`,
      prioridad: PrioridadNotif.NORMAL,
    });
    result.notificacionesCreadas++;

    // También notificar al técnico asignado si existe
    if (orden.tecnicoId) {
      await notificarUsuarios({
        usuarioIds: [orden.tecnicoId],
        ordenId: orden.id,
        tipo: TipoNotificacion.ALERTA_AMARILLO,
        titulo: `🟡 Diagnóstico atrasado: ${orden.folio}`,
        mensaje: `${orden.marcaEquipo} ${orden.modeloEquipo} lleva ${horasSinAvance}h sin avance`,
        prioridad: PrioridadNotif.NORMAL,
      });
      result.notificacionesCreadas++;
    }
  } catch (error) {
    console.error(`Error notificando alerta amarilla para ${orden.folio}:`, error);
    result.errores++;
  }
}
