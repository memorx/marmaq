import prisma from "@/lib/db/prisma";
import { TipoNotificacion, PrioridadNotif, Role } from "@prisma/client";

// ============ TIPOS ============

export interface CrearNotificacionInput {
  usuarioId: string;
  ordenId?: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  prioridad?: PrioridadNotif;
}

export interface NotificarRolInput {
  roles: Role[];
  ordenId?: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  prioridad?: PrioridadNotif;
  excluirUsuarioId?: string;
}

export interface NotificarUsuariosInput {
  usuarioIds: string[];
  ordenId?: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  prioridad?: PrioridadNotif;
  excluirUsuarioId?: string;
}

export interface ObtenerNotificacionesOptions {
  soloNoLeidas?: boolean;
  limit?: number;
  cursor?: string;
}

export interface NotificacionConOrden {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  prioridad: PrioridadNotif;
  leida: boolean;
  fechaLeida: Date | null;
  ordenId: string | null;
  orden: { id: string; folio: string } | null;
  createdAt: Date;
}

// ============ SERVICIO ============

/**
 * Crear una notificación para un usuario específico.
 * Es "best effort" - no lanza errores si falla.
 */
export async function crearNotificacion(
  input: CrearNotificacionInput
): Promise<void> {
  try {
    await prisma.notificacion.create({
      data: {
        usuarioId: input.usuarioId,
        ordenId: input.ordenId,
        tipo: input.tipo,
        titulo: input.titulo,
        mensaje: input.mensaje,
        prioridad: input.prioridad ?? PrioridadNotif.NORMAL,
      },
    });
  } catch (error) {
    console.error("Error al crear notificación:", error);
  }
}

/**
 * Crear notificaciones para todos los usuarios activos con ciertos roles.
 * Es "best effort" - no lanza errores si falla.
 */
export async function notificarPorRol(input: NotificarRolInput): Promise<void> {
  try {
    // Buscar usuarios activos con los roles especificados
    const usuarios = await prisma.user.findMany({
      where: {
        role: { in: input.roles },
        activo: true,
        ...(input.excluirUsuarioId && { id: { not: input.excluirUsuarioId } }),
      },
      select: { id: true },
    });

    if (usuarios.length === 0) {
      return;
    }

    // Crear notificaciones para todos los usuarios
    await prisma.notificacion.createMany({
      data: usuarios.map((usuario) => ({
        usuarioId: usuario.id,
        ordenId: input.ordenId,
        tipo: input.tipo,
        titulo: input.titulo,
        mensaje: input.mensaje,
        prioridad: input.prioridad ?? PrioridadNotif.NORMAL,
      })),
    });
  } catch (error) {
    console.error("Error al notificar por rol:", error);
  }
}

/**
 * Crear notificaciones para usuarios específicos.
 * Es "best effort" - no lanza errores si falla.
 */
export async function notificarUsuarios(
  input: NotificarUsuariosInput
): Promise<void> {
  try {
    // Filtrar el usuario excluido si se especifica
    const usuarioIds = input.excluirUsuarioId
      ? input.usuarioIds.filter((id) => id !== input.excluirUsuarioId)
      : input.usuarioIds;

    if (usuarioIds.length === 0) {
      return;
    }

    await prisma.notificacion.createMany({
      data: usuarioIds.map((usuarioId) => ({
        usuarioId,
        ordenId: input.ordenId,
        tipo: input.tipo,
        titulo: input.titulo,
        mensaje: input.mensaje,
        prioridad: input.prioridad ?? PrioridadNotif.NORMAL,
      })),
    });
  } catch (error) {
    console.error("Error al notificar usuarios:", error);
  }
}

/**
 * Marcar una notificación como leída.
 * Valida que la notificación pertenezca al usuario.
 * Retorna true si se actualizó, false si no.
 */
export async function marcarLeida(
  notificacionId: string,
  usuarioId: string
): Promise<boolean> {
  try {
    const result = await prisma.notificacion.updateMany({
      where: {
        id: notificacionId,
        usuarioId: usuarioId,
        leida: false,
      },
      data: {
        leida: true,
        fechaLeida: new Date(),
      },
    });

    return result.count > 0;
  } catch (error) {
    console.error("Error al marcar notificación como leída:", error);
    return false;
  }
}

/**
 * Marcar todas las notificaciones no leídas de un usuario como leídas.
 * Retorna el número de notificaciones actualizadas.
 */
export async function marcarTodasLeidas(usuarioId: string): Promise<number> {
  try {
    const result = await prisma.notificacion.updateMany({
      where: {
        usuarioId: usuarioId,
        leida: false,
      },
      data: {
        leida: true,
        fechaLeida: new Date(),
      },
    });

    return result.count;
  } catch (error) {
    console.error("Error al marcar todas las notificaciones como leídas:", error);
    return 0;
  }
}

/**
 * Obtener notificaciones de un usuario con paginación.
 */
export async function obtenerNotificaciones(
  usuarioId: string,
  options: ObtenerNotificacionesOptions = {}
): Promise<{
  notificaciones: NotificacionConOrden[];
  nextCursor: string | null;
}> {
  try {
    const { soloNoLeidas = false, limit = 20, cursor } = options;
    const take = Math.min(limit, 50); // Max 50

    const notificaciones = await prisma.notificacion.findMany({
      where: {
        usuarioId,
        ...(soloNoLeidas && { leida: false }),
        ...(cursor && { createdAt: { lt: new Date(cursor) } }),
      },
      orderBy: { createdAt: "desc" },
      take: take + 1, // Fetch one extra to determine if there are more
      include: {
        orden: {
          select: {
            id: true,
            folio: true,
          },
        },
      },
    });

    const hasMore = notificaciones.length > take;
    const results = hasMore ? notificaciones.slice(0, take) : notificaciones;
    const nextCursor = hasMore
      ? results[results.length - 1].createdAt.toISOString()
      : null;

    return {
      notificaciones: results.map((n) => ({
        id: n.id,
        tipo: n.tipo,
        titulo: n.titulo,
        mensaje: n.mensaje,
        prioridad: n.prioridad,
        leida: n.leida,
        fechaLeida: n.fechaLeida,
        ordenId: n.ordenId,
        orden: n.orden,
        createdAt: n.createdAt,
      })),
      nextCursor,
    };
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    return { notificaciones: [], nextCursor: null };
  }
}

/**
 * Contar notificaciones no leídas de un usuario.
 */
export async function contarNoLeidas(usuarioId: string): Promise<number> {
  try {
    return await prisma.notificacion.count({
      where: {
        usuarioId,
        leida: false,
      },
    });
  } catch (error) {
    console.error("Error al contar notificaciones no leídas:", error);
    return 0;
  }
}
