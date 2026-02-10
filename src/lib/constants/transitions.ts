import type { EstadoOrden } from "@prisma/client";

/**
 * Mapa de transiciones de estado válidas para órdenes de servicio.
 * Cada key es un estado actual, el array son los estados destino permitidos.
 *
 * Flujo principal: RECIBIDO → EN_DIAGNOSTICO → EN_REPARACION → REPARADO → LISTO_ENTREGA → ENTREGADO
 * Flujo con refacciones: ... → ESPERA_REFACCIONES → EN_REPARACION → ...
 * Flujo con cotización: ... → COTIZACION_PENDIENTE → EN_REPARACION → ...
 * CANCELADO es accesible desde cualquier estado excepto ENTREGADO.
 * Las transiciones de retroceso (ej: EN_REPARACION → EN_DIAGNOSTICO) están permitidas para casos reales.
 */
export const TRANSICIONES_VALIDAS: Record<EstadoOrden, EstadoOrden[]> = {
  RECIBIDO: ["EN_DIAGNOSTICO", "CANCELADO"],
  EN_DIAGNOSTICO: ["ESPERA_REFACCIONES", "COTIZACION_PENDIENTE", "EN_REPARACION", "RECIBIDO", "CANCELADO"],
  ESPERA_REFACCIONES: ["EN_DIAGNOSTICO", "EN_REPARACION", "CANCELADO"],
  COTIZACION_PENDIENTE: ["EN_REPARACION", "EN_DIAGNOSTICO", "CANCELADO"],
  EN_REPARACION: ["REPARADO", "ESPERA_REFACCIONES", "EN_DIAGNOSTICO", "CANCELADO"],
  REPARADO: ["LISTO_ENTREGA", "EN_REPARACION", "CANCELADO"],
  LISTO_ENTREGA: ["ENTREGADO", "CANCELADO"],
  ENTREGADO: [],  // Estado final — no se puede cambiar
  CANCELADO: ["RECIBIDO"],  // Se puede reactivar
};

/**
 * Verifica si una transición de estado es válida.
 * Retorna true si estadoActual === estadoNuevo (no es transición real).
 */
export function esTransicionValida(
  estadoActual: EstadoOrden,
  estadoNuevo: EstadoOrden
): boolean {
  if (estadoActual === estadoNuevo) return true;
  const permitidas = TRANSICIONES_VALIDAS[estadoActual];
  return permitidas?.includes(estadoNuevo) ?? false;
}
