import { TipoNotificacionWA } from "@prisma/client";

// Variables disponibles para las plantillas
export interface PlantillaVariables {
  nombre: string;           // Nombre del cliente
  empresa?: string;         // Empresa del cliente
  folio: string;            // Folio de la orden
  modelo: string;           // Modelo del equipo
  marca: string;            // Marca del equipo
  cotizacion?: string;      // Monto de cotización formateado
  tecnico?: string;         // Nombre del técnico
  fechaPromesa?: string;    // Fecha promesa formateada
}

// Plantillas por defecto
export const PLANTILLAS_DEFAULT: Record<TipoNotificacionWA, { nombre: string; mensaje: string }> = {
  RECIBIDO: {
    nombre: "Equipo Recibido",
    mensaje: `Hola {nombre}, hemos recibido su equipo {marca} {modelo} para servicio.

Folio: *{folio}*

Le mantendremos informado sobre el avance de la reparación.

MARMAQ Servicios`,
  },
  EN_REPARACION: {
    nombre: "En Reparación",
    mensaje: `Hola {nombre}, su equipo {marca} {modelo} está siendo reparado.

Folio: *{folio}*
Técnico: {tecnico}

Pronto le notificaremos cuando esté listo.

MARMAQ Servicios`,
  },
  COTIZACION: {
    nombre: "Cotización Enviada",
    mensaje: `Hola {nombre}, le enviamos la cotización para su equipo {marca} {modelo}.

Folio: *{folio}*
Monto: *{cotizacion}*

Por favor confirme si desea proceder con la reparación.

MARMAQ Servicios`,
  },
  LISTO_ENTREGA: {
    nombre: "Listo para Entrega",
    mensaje: `Hola {nombre}, su equipo {marca} {modelo} ya está listo para recoger.

Folio: *{folio}*

Horario de atención: Lunes a Viernes 9:00 - 18:00

Lo esperamos.

MARMAQ Servicios`,
  },
  ENTREGADO: {
    nombre: "Agradecimiento",
    mensaje: `Hola {nombre}, gracias por su preferencia.

Esperamos que su equipo {marca} {modelo} funcione perfectamente.

Si tiene alguna duda o comentario, no dude en contactarnos.

MARMAQ Servicios`,
  },
  RECORDATORIO: {
    nombre: "Recordatorio de Recoger",
    mensaje: `Hola {nombre}, le recordamos que su equipo {marca} {modelo} está listo para recoger.

Folio: *{folio}*

Horario de atención: Lunes a Viernes 9:00 - 18:00

Lo esperamos pronto.

MARMAQ Servicios`,
  },
  PERSONALIZADO: {
    nombre: "Mensaje Personalizado",
    mensaje: `Hola {nombre}, le contactamos respecto a su equipo {marca} {modelo}.

Folio: *{folio}*

MARMAQ Servicios`,
  },
};

// Labels para los tipos de notificación
export const TIPO_NOTIFICACION_LABELS: Record<TipoNotificacionWA, string> = {
  RECIBIDO: "Equipo Recibido",
  EN_REPARACION: "En Reparación",
  COTIZACION: "Cotización Enviada",
  LISTO_ENTREGA: "Listo para Entrega",
  ENTREGADO: "Agradecimiento",
  RECORDATORIO: "Recordatorio",
  PERSONALIZADO: "Personalizado",
};

// Labels para los estados de notificación
export const ESTADO_NOTIFICACION_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  LEIDO: "Leído",
  ERROR: "Error",
};

// Colores para los estados
export const ESTADO_NOTIFICACION_COLORS: Record<string, string> = {
  PENDIENTE: "#F59E0B",
  ENVIADO: "#10B981",
  ENTREGADO: "#06B6D4",
  LEIDO: "#3B82F6",
  ERROR: "#EF4444",
};

/**
 * Reemplaza las variables en una plantilla con los valores proporcionados
 */
export function procesarPlantilla(plantilla: string, variables: PlantillaVariables): string {
  let mensaje = plantilla;

  // Reemplazar cada variable
  mensaje = mensaje.replace(/{nombre}/g, variables.nombre);
  mensaje = mensaje.replace(/{empresa}/g, variables.empresa || "");
  mensaje = mensaje.replace(/{folio}/g, variables.folio);
  mensaje = mensaje.replace(/{modelo}/g, variables.modelo);
  mensaje = mensaje.replace(/{marca}/g, variables.marca);
  mensaje = mensaje.replace(/{cotizacion}/g, variables.cotizacion || "");
  mensaje = mensaje.replace(/{tecnico}/g, variables.tecnico || "Sin asignar");
  mensaje = mensaje.replace(/{fechaPromesa}/g, variables.fechaPromesa || "");

  return mensaje;
}

/**
 * Formatea un número de teléfono para WhatsApp (agrega código de país si no existe)
 */
export function formatearTelefono(telefono: string): string {
  // Remover espacios, guiones y paréntesis
  const limpio = telefono.replace(/[\s\-\(\)]/g, "");

  // Si empieza con +, dejarlo como está
  if (limpio.startsWith("+")) {
    return limpio;
  }

  // Si empieza con 52 (México), agregar +
  if (limpio.startsWith("52")) {
    return `+${limpio}`;
  }

  // Si es un número de 10 dígitos (México), agregar +52
  if (limpio.length === 10) {
    return `+52${limpio}`;
  }

  // Devolver como está si no coincide con ningún patrón
  return limpio;
}

/**
 * Genera el link de WhatsApp para envío manual
 */
export function generarLinkWhatsApp(telefono: string, mensaje: string): string {
  const telefonoFormateado = formatearTelefono(telefono).replace("+", "");
  const mensajeCodificado = encodeURIComponent(mensaje);
  return `https://wa.me/${telefonoFormateado}?text=${mensajeCodificado}`;
}

/**
 * Valida si un número de teléfono parece válido
 */
export function validarTelefono(telefono: string): boolean {
  const limpio = telefono.replace(/[\s\-\(\)\+]/g, "");
  // Debe tener entre 10 y 15 dígitos
  return /^\d{10,15}$/.test(limpio);
}
