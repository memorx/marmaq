import { z } from "zod";

// ============ ENUMS ============

const CategoriaEnum = z.enum(["REFACCION", "CONSUMIBLE", "HERRAMIENTA"]);

// ============ CREATE MATERIAL SCHEMA ============

export const CreateMaterialSchema = z.object({
  sku: z
    .string({ error: "El SKU es requerido" })
    .min(1, "El SKU es requerido")
    .max(50, "El SKU no puede exceder 50 caracteres"),
  nombre: z
    .string({ error: "El nombre es requerido" })
    .min(1, "El nombre es requerido")
    .max(200, "El nombre no puede exceder 200 caracteres"),
  descripcion: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional(),
  categoria: CategoriaEnum.optional().default("REFACCION"),
  stockActual: z.number().int("El stock debe ser un número entero").min(0, "El stock no puede ser negativo").optional().default(0),
  stockMinimo: z.number().int("El stock mínimo debe ser un número entero").min(0, "El stock mínimo no puede ser negativo").optional().default(5),
  precioCompra: z.number().min(0, "El precio de compra no puede ser negativo").optional().nullable(),
  precioVenta: z.number().min(0, "El precio de venta no puede ser negativo").optional().nullable(),
  activo: z.boolean().optional().default(true),
});

export type CreateMaterialInput = z.infer<typeof CreateMaterialSchema>;

// ============ UPDATE MATERIAL SCHEMA ============

export const UpdateMaterialSchema = z
  .object({
    sku: z.string().min(1, "El SKU es requerido").max(50, "El SKU no puede exceder 50 caracteres").optional(),
    nombre: z.string().min(1, "El nombre es requerido").max(200, "El nombre no puede exceder 200 caracteres").optional(),
    descripcion: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional().nullable(),
    categoria: CategoriaEnum.optional(),
    stockActual: z.number().int("El stock debe ser un número entero").min(0, "El stock no puede ser negativo").optional(),
    stockMinimo: z.number().int("El stock mínimo debe ser un número entero").min(0, "El stock mínimo no puede ser negativo").optional(),
    precioCompra: z.number().min(0, "El precio de compra no puede ser negativo").optional().nullable(),
    precioVenta: z.number().min(0, "El precio de venta no puede ser negativo").optional().nullable(),
    activo: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).some((key) => data[key as keyof typeof data] !== undefined),
    {
      message: "Debe proporcionar al menos un campo para actualizar",
    }
  );

export type UpdateMaterialInput = z.infer<typeof UpdateMaterialSchema>;
