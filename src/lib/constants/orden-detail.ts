import type { EstadoOrden, TipoServicio } from "@/types/ordenes";
import type { TipoEvidencia } from "@prisma/client";

// Orden de estados para el timeline
export const ESTADO_ORDEN: EstadoOrden[] = [
  "RECIBIDO",
  "EN_DIAGNOSTICO",
  "ESPERA_REFACCIONES",
  "EN_REPARACION",
  "REPARADO",
  "LISTO_ENTREGA",
  "ENTREGADO",
];

// Estados simplificados para timeline visual
export const TIMELINE_ESTADOS = [
  { estado: "RECIBIDO", label: "Recibido" },
  { estado: "EN_DIAGNOSTICO", label: "Diagnóstico" },
  { estado: "ESPERA_REFACCIONES", label: "Esp. Piezas" },
  { estado: "EN_REPARACION", label: "Reparación" },
  { estado: "REPARADO", label: "Reparado" },
  { estado: "ENTREGADO", label: "Entregado" },
];

export type AccionEstado = {
  label: string;
  nuevoEstado: EstadoOrden;
  variant: "primary" | "secondary" | "outline";
};

// Acciones según estado actual
export const ACCIONES_POR_ESTADO: Record<EstadoOrden, AccionEstado[]> = {
  RECIBIDO: [
    { label: "Iniciar Diagnóstico", nuevoEstado: "EN_DIAGNOSTICO", variant: "primary" },
  ],
  EN_DIAGNOSTICO: [
    { label: "Solicitar Refacción", nuevoEstado: "ESPERA_REFACCIONES", variant: "outline" },
    { label: "Iniciar Reparación", nuevoEstado: "EN_REPARACION", variant: "primary" },
    { label: "Enviar Cotización", nuevoEstado: "COTIZACION_PENDIENTE", variant: "secondary" },
    { label: "\u2190 Regresar a Recibido", nuevoEstado: "RECIBIDO", variant: "outline" },
  ],
  ESPERA_REFACCIONES: [
    { label: "Piezas Recibidas", nuevoEstado: "EN_REPARACION", variant: "primary" },
    { label: "\u2190 Regresar a Diagnóstico", nuevoEstado: "EN_DIAGNOSTICO", variant: "outline" },
  ],
  COTIZACION_PENDIENTE: [
    { label: "Cotización Aprobada", nuevoEstado: "EN_REPARACION", variant: "primary" },
    { label: "Cotización Rechazada", nuevoEstado: "CANCELADO", variant: "outline" },
    { label: "\u2190 Regresar a Diagnóstico", nuevoEstado: "EN_DIAGNOSTICO", variant: "outline" },
  ],
  EN_REPARACION: [
    { label: "Marcar como Reparado", nuevoEstado: "REPARADO", variant: "primary" },
    { label: "\u2190 Regresar a Diagnóstico", nuevoEstado: "EN_DIAGNOSTICO", variant: "outline" },
  ],
  REPARADO: [
    { label: "Listo para Entrega", nuevoEstado: "LISTO_ENTREGA", variant: "primary" },
    { label: "\u2190 Regresar a Reparación", nuevoEstado: "EN_REPARACION", variant: "outline" },
  ],
  LISTO_ENTREGA: [
    { label: "Registrar Entrega", nuevoEstado: "ENTREGADO", variant: "primary" },
    { label: "\u2190 Regresar a Reparado", nuevoEstado: "REPARADO", variant: "outline" },
  ],
  ENTREGADO: [],
  CANCELADO: [
    { label: "\u2190 Reabrir Orden", nuevoEstado: "RECIBIDO", variant: "outline" },
  ],
};

// Tipos de evidencia disponibles para agregar
export const TIPOS_EVIDENCIA: { value: TipoEvidencia; label: string }[] = [
  { value: "RECEPCION", label: "Recepción" },
  { value: "DIAGNOSTICO", label: "Diagnóstico" },
  { value: "REPARACION", label: "Reparación" },
  { value: "ENTREGA", label: "Entrega" },
  { value: "OTRO", label: "Otro" },
];

export function getBadgeVariant(tipo: TipoServicio): "garantia" | "centro" | "cobrar" | "repare" {
  const map: Record<TipoServicio, "garantia" | "centro" | "cobrar" | "repare"> = {
    GARANTIA: "garantia",
    CENTRO_SERVICIO: "centro",
    POR_COBRAR: "cobrar",
    REPARE: "repare",
  };
  return map[tipo];
}

export function getStatusBadgeVariant(estado: EstadoOrden): "default" | "success" | "warning" | "danger" | "info" {
  const map: Record<EstadoOrden, "default" | "success" | "warning" | "danger" | "info"> = {
    RECIBIDO: "info",
    EN_DIAGNOSTICO: "warning",
    ESPERA_REFACCIONES: "warning",
    COTIZACION_PENDIENTE: "warning",
    EN_REPARACION: "info",
    REPARADO: "success",
    LISTO_ENTREGA: "success",
    ENTREGADO: "default",
    CANCELADO: "danger",
  };
  return map[estado];
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function calcularTiempoTranscurrido(fechaRecepcion: string | Date): string {
  const ahora = new Date();
  const recepcion = new Date(fechaRecepcion);
  const diffMs = ahora.getTime() - recepcion.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHoras = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDias > 0) {
    return `${diffDias} día${diffDias > 1 ? "s" : ""}, ${diffHoras}h`;
  }
  return `${diffHoras} hora${diffHoras > 1 ? "s" : ""}`;
}
