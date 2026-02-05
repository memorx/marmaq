import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import type { Role } from "@prisma/client";

// ============ AUTHORIZATION HELPERS ============

/**
 * Verifica si el usuario tiene uno de los roles permitidos
 */
export function checkRole(session: Session | null, allowedRoles: Role[]): boolean {
  if (!session?.user?.role) {
    return false;
  }
  return allowedRoles.includes(session.user.role as Role);
}

/**
 * Retorna respuesta de error 403 para acceso no autorizado
 */
export function unauthorizedResponse(message?: string): NextResponse {
  return NextResponse.json(
    { error: message || "No tienes permisos para esta acción" },
    { status: 403 }
  );
}

/**
 * Verifica si el usuario puede acceder a una orden específica
 * - SUPER_ADMIN y COORD_SERVICIO: acceso total
 * - TECNICO: solo órdenes asignadas a él
 * - REFACCIONES: puede ver todas (restricciones de escritura se manejan aparte)
 */
export function canAccessOrden(
  session: Session | null,
  orden: { tecnicoId: string | null }
): boolean {
  if (!session?.user) {
    return false;
  }

  const role = (session.user.role as Role) || "TECNICO";

  // SUPER_ADMIN y COORD_SERVICIO tienen acceso total
  if (role === "SUPER_ADMIN" || role === "COORD_SERVICIO") {
    return true;
  }

  // REFACCIONES puede ver todas las órdenes
  if (role === "REFACCIONES") {
    return true;
  }

  // TECNICO solo puede acceder a órdenes asignadas a él
  if (role === "TECNICO") {
    return orden.tecnicoId === session.user.id;
  }

  // Por defecto, denegar acceso
  return false;
}

/**
 * Obtiene el rol del usuario con fallback a TECNICO por seguridad
 */
export function getUserRole(session: Session | null): Role {
  return (session?.user?.role as Role) || "TECNICO";
}

/**
 * Campos que un TECNICO puede actualizar en una orden
 */
export const TECNICO_ALLOWED_UPDATE_FIELDS = [
  "diagnostico",
  "notasTecnico",
  "cotizacion", // Solo si tipoServicio es POR_COBRAR
];

/**
 * Verifica si un TECNICO puede actualizar los campos proporcionados
 */
export function canTecnicoUpdateFields(
  updateFields: string[],
  orden: { tipoServicio: string }
): { allowed: boolean; forbiddenFields: string[] } {
  const allowedFields = [...TECNICO_ALLOWED_UPDATE_FIELDS];

  // Cotización solo permitida para órdenes POR_COBRAR
  if (orden.tipoServicio !== "POR_COBRAR") {
    const cotizacionIndex = allowedFields.indexOf("cotizacion");
    if (cotizacionIndex > -1) {
      allowedFields.splice(cotizacionIndex, 1);
    }
  }

  const forbiddenFields = updateFields.filter(
    (field) => !allowedFields.includes(field)
  );

  return {
    allowed: forbiddenFields.length === 0,
    forbiddenFields,
  };
}

/**
 * Estados de orden que REFACCIONES puede actualizar
 */
export const REFACCIONES_ALLOWED_STATES = ["ESPERA_REFACCIONES"];

/**
 * Verifica si REFACCIONES puede actualizar una orden
 */
export function canRefaccionesUpdateOrden(
  orden: { estado: string }
): boolean {
  return REFACCIONES_ALLOWED_STATES.includes(orden.estado);
}
