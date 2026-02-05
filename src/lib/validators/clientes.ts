import { z } from "zod";

// ============ CREATE CLIENTE SCHEMA ============

export const CreateClienteSchema = z.object({
  nombre: z
    .string({ error: "El nombre es requerido" })
    .min(1, "El nombre es requerido")
    .max(200, "El nombre no puede exceder 200 caracteres"),
  telefono: z
    .string({ error: "El teléfono es requerido" })
    .min(8, "El teléfono debe tener al menos 8 caracteres")
    .max(20, "El teléfono no puede exceder 20 caracteres"),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  empresa: z.string().max(200, "La empresa no puede exceder 200 caracteres").optional(),
  direccion: z.string().max(500, "La dirección no puede exceder 500 caracteres").optional(),
  ciudad: z.string().max(100, "La ciudad no puede exceder 100 caracteres").optional(),
  notas: z.string().max(2000, "Las notas no pueden exceder 2000 caracteres").optional(),
  esDistribuidor: z.boolean().optional().default(false),
  codigoDistribuidor: z.string().max(50, "El código no puede exceder 50 caracteres").optional(),
});

export type CreateClienteInput = z.infer<typeof CreateClienteSchema>;

// ============ UPDATE CLIENTE SCHEMA ============

export const UpdateClienteSchema = z
  .object({
    nombre: z.string().min(1, "El nombre es requerido").max(200, "El nombre no puede exceder 200 caracteres").optional(),
    telefono: z.string().min(8, "El teléfono debe tener al menos 8 caracteres").max(20, "El teléfono no puede exceder 20 caracteres").optional(),
    email: z
      .string()
      .email("Email inválido")
      .optional()
      .or(z.literal(""))
      .transform((val) => val || null),
    empresa: z.string().max(200, "La empresa no puede exceder 200 caracteres").optional().nullable(),
    direccion: z.string().max(500, "La dirección no puede exceder 500 caracteres").optional().nullable(),
    ciudad: z.string().max(100, "La ciudad no puede exceder 100 caracteres").optional().nullable(),
    notas: z.string().max(2000, "Las notas no pueden exceder 2000 caracteres").optional().nullable(),
    esDistribuidor: z.boolean().optional(),
    codigoDistribuidor: z.string().max(50, "El código no puede exceder 50 caracteres").optional().nullable(),
  })
  .refine(
    (data) => Object.keys(data).some((key) => data[key as keyof typeof data] !== undefined),
    {
      message: "Debe proporcionar al menos un campo para actualizar",
    }
  );

export type UpdateClienteInput = z.infer<typeof UpdateClienteSchema>;
