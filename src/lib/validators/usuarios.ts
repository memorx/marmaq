import { z } from "zod";

// ============ ENUMS ============

const RoleEnum = z.enum(["SUPER_ADMIN", "COORD_SERVICIO", "REFACCIONES", "TECNICO"]);

// ============ CREATE USUARIO SCHEMA ============

export const CreateUsuarioSchema = z.object({
  email: z
    .string({ error: "El email es requerido" })
    .email("Email inválido")
    .max(255, "El email no puede exceder 255 caracteres"),
  name: z
    .string({ error: "El nombre es requerido" })
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  password: z
    .string({ error: "La contraseña es requerida" })
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100, "La contraseña no puede exceder 100 caracteres"),
  role: RoleEnum,
  activo: z.boolean().optional().default(true),
});

export type CreateUsuarioInput = z.infer<typeof CreateUsuarioSchema>;

// ============ UPDATE USUARIO SCHEMA ============

export const UpdateUsuarioSchema = z
  .object({
    email: z.string().email("Email inválido").max(255, "El email no puede exceder 255 caracteres").optional(),
    name: z.string().min(1, "El nombre es requerido").max(100, "El nombre no puede exceder 100 caracteres").optional(),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(100, "La contraseña no puede exceder 100 caracteres").optional(),
    role: RoleEnum.optional(),
    activo: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).some((key) => data[key as keyof typeof data] !== undefined),
    {
      message: "Debe proporcionar al menos un campo para actualizar",
    }
  );

export type UpdateUsuarioInput = z.infer<typeof UpdateUsuarioSchema>;
