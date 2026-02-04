// ============ TIPOS DE NOTIFICACIÓN (client-safe) ============
// Estos son duplicados de los enums de Prisma para uso en componentes "use client"
// NO importar de @prisma/client en componentes del navegador

export const TipoNotificacion = {
  ORDEN_CREADA: "ORDEN_CREADA",
  ESTADO_CAMBIADO: "ESTADO_CAMBIADO",
  ORDEN_CANCELADA: "ORDEN_CANCELADA",
  TECNICO_REASIGNADO: "TECNICO_REASIGNADO",
  PRIORIDAD_URGENTE: "PRIORIDAD_URGENTE",
  COTIZACION_MODIFICADA: "COTIZACION_MODIFICADA",
  ALERTA_ROJO: "ALERTA_ROJO",
  ALERTA_AMARILLO: "ALERTA_AMARILLO",
  STOCK_BAJO: "STOCK_BAJO",
} as const;

export type TipoNotificacion = (typeof TipoNotificacion)[keyof typeof TipoNotificacion];

export const PrioridadNotif = {
  BAJA: "BAJA",
  NORMAL: "NORMAL",
  ALTA: "ALTA",
  URGENTE: "URGENTE",
} as const;

export type PrioridadNotif = (typeof PrioridadNotif)[keyof typeof PrioridadNotif];
