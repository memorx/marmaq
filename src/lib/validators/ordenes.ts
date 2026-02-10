import { z } from "zod";

// ============ ENUMS ============

const TipoServicioEnum = z.enum([
  "GARANTIA",
  "CENTRO_SERVICIO",
  "POR_COBRAR",
  "REPARE",
]);

const PrioridadEnum = z.enum(["BAJA", "NORMAL", "ALTA", "URGENTE"]);

const CondicionEquipoEnum = z.enum(["BUENA", "REGULAR", "MALA"]);

const EstadoOrdenEnum = z.enum([
  "RECIBIDO",
  "EN_DIAGNOSTICO",
  "ESPERA_REFACCIONES",
  "COTIZACION_PENDIENTE",
  "EN_REPARACION",
  "REPARADO",
  "LISTO_ENTREGA",
  "ENTREGADO",
  "CANCELADO",
]);

// ============ CLIENTE NUEVO (anidado) ============

const ClienteNuevoSchema = z.object({
  nombre: z
    .string({ error: "El nombre del cliente es requerido" })
    .min(1, "El nombre del cliente es requerido")
    .max(200, "El nombre no puede exceder 200 caracteres"),
  empresa: z.string().max(200, "La empresa no puede exceder 200 caracteres").optional(),
  telefono: z
    .string({ error: "El teléfono del cliente es requerido" })
    .min(8, "El teléfono debe tener al menos 8 caracteres")
    .max(20, "El teléfono no puede exceder 20 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  direccion: z.string().max(500, "La dirección no puede exceder 500 caracteres").optional(),
  ciudad: z.string().max(100, "La ciudad no puede exceder 100 caracteres").optional(),
  esDistribuidor: z.boolean().optional(),
  codigoDistribuidor: z.string().max(50, "El código no puede exceder 50 caracteres").optional(),
});

// ============ CREATE ORDEN SCHEMA ============

export const CreateOrdenSchema = z
  .object({
    // Tipo de servicio (requerido)
    tipoServicio: TipoServicioEnum,

    // Cliente (uno de los dos debe estar presente)
    clienteId: z.string().min(1, "ID de cliente inválido").optional(),
    clienteNuevo: ClienteNuevoSchema.optional(),

    // Equipo (requeridos)
    marcaEquipo: z
      .string({ error: "La marca del equipo es requerida" })
      .min(1, "La marca del equipo es requerida")
      .max(100, "La marca no puede exceder 100 caracteres"),
    modeloEquipo: z
      .string({ error: "El modelo del equipo es requerido" })
      .min(1, "El modelo del equipo es requerido")
      .max(100, "El modelo no puede exceder 100 caracteres"),
    serieEquipo: z.string().max(100, "La serie no puede exceder 100 caracteres").optional(),
    condicionEquipo: CondicionEquipoEnum.optional(),
    accesorios: z.record(z.string(), z.boolean()).optional(),

    // Problema (requerido)
    fallaReportada: z
      .string({ error: "La descripción de la falla es requerida" })
      .min(1, "La descripción de la falla es requerida")
      .max(5000, "La descripción no puede exceder 5000 caracteres"),

    // Garantía
    numeroFactura: z.string().max(100, "El número de factura no puede exceder 100 caracteres").optional(),
    fechaFactura: z.string().optional(), // ISO date string

    // REPARE
    numeroRepare: z.string().max(100, "El número REPARE no puede exceder 100 caracteres").optional(),
    coordenadasGPS: z.string().max(100, "Las coordenadas no pueden exceder 100 caracteres").optional(),

    // Fechas
    fechaPromesa: z.string().optional(), // ISO date string

    // Asignación
    prioridad: PrioridadEnum.optional(),
    tecnicoId: z.string().min(1, "ID de técnico inválido").optional(),
  })
  .refine((data) => data.clienteId || data.clienteNuevo, {
    message: "Debe especificar un cliente existente o crear uno nuevo",
    path: ["clienteId"],
  });

export type CreateOrdenInput = z.infer<typeof CreateOrdenSchema>;

// ============ UPDATE ORDEN SCHEMA ============

export const UpdateOrdenSchema = z
  .object({
    // Estado
    estado: EstadoOrdenEnum.optional(),

    // Prioridad
    prioridad: PrioridadEnum.optional(),

    // Técnico
    tecnicoId: z.string().min(1, "ID de técnico inválido").nullable().optional(),

    // Diagnóstico y notas
    diagnostico: z.string().max(5000, "El diagnóstico no puede exceder 5000 caracteres").optional(),
    notasTecnico: z.string().max(5000, "Las notas no pueden exceder 5000 caracteres").optional(),

    // Cotización
    cotizacion: z.number().min(0, "La cotización debe ser un número positivo").optional(),
    cotizacionAprobada: z.boolean().optional(),

    // Fechas
    fechaPromesa: z.string().nullable().optional(), // ISO date string

    // Datos del equipo
    marcaEquipo: z.string().max(100, "La marca no puede exceder 100 caracteres").optional(),
    modeloEquipo: z.string().max(100, "El modelo no puede exceder 100 caracteres").optional(),
    serieEquipo: z.string().max(100, "La serie no puede exceder 100 caracteres").optional(),
    condicionEquipo: CondicionEquipoEnum.optional(),
    accesorios: z.record(z.string(), z.boolean()).optional(),
    fallaReportada: z.string().max(5000, "La descripción no puede exceder 5000 caracteres").optional(),

    // Garantía
    numeroFactura: z.string().max(100, "El número de factura no puede exceder 100 caracteres").optional(),
    fechaFactura: z.string().nullable().optional(), // ISO date string

    // REPARE
    numeroRepare: z.string().max(100, "El número REPARE no puede exceder 100 caracteres").optional(),
    coordenadasGPS: z.string().max(100, "Las coordenadas no pueden exceder 100 caracteres").optional(),
  })
  .refine(
    (data) => Object.keys(data).some((key) => data[key as keyof typeof data] !== undefined),
    {
      message: "Debe proporcionar al menos un campo para actualizar",
    }
  );

export type UpdateOrdenInput = z.infer<typeof UpdateOrdenSchema>;
