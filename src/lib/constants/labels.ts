import type {
  EstadoOrden,
  TipoServicio,
  Prioridad,
  CondicionEquipo,
  TipoEvidencia,
} from "@prisma/client";

// ============ LABELS PARA UI ============
// Fuente de verdad centralizada para todos los labels de la aplicación

export const STATUS_LABELS: Record<EstadoOrden, string> = {
  RECIBIDO: "Recibido",
  EN_DIAGNOSTICO: "En Diagnóstico",
  ESPERA_REFACCIONES: "Espera Refacciones",
  COTIZACION_PENDIENTE: "Cotización Pendiente",
  EN_REPARACION: "En Reparación",
  REPARADO: "Reparado",
  LISTO_ENTREGA: "Listo para Entrega",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export const SERVICE_TYPE_LABELS: Record<TipoServicio, string> = {
  GARANTIA: "Garantía",
  CENTRO_SERVICIO: "Centro Servicio",
  POR_COBRAR: "Por Cobrar",
  REPARE: "REPARE",
};

export const PRIORIDAD_LABELS: Record<Prioridad, string> = {
  BAJA: "Baja",
  NORMAL: "Normal",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

export const CONDICION_LABELS: Record<CondicionEquipo, string> = {
  BUENA: "Buena",
  REGULAR: "Regular",
  MALA: "Mala",
};

export const TIPO_EVIDENCIA_LABELS: Record<TipoEvidencia, string> = {
  RECEPCION: "Recepción",
  DIAGNOSTICO: "Diagnóstico",
  REPARACION: "Reparación",
  ENTREGA: "Entrega",
  FACTURA: "Factura",
  OTRO: "Otro",
};
