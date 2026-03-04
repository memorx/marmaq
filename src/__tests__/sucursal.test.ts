import { describe, it, expect } from "vitest";
import { CreateOrdenSchema, UpdateOrdenSchema } from "@/lib/validators/ordenes";
import { SUCURSAL_LABELS, SUCURSAL_SHORT_LABELS } from "@/lib/constants/labels";

describe("Sucursal — Zod validation", () => {
  const baseData = {
    tipoServicio: "GARANTIA",
    marcaEquipo: "Torrey",
    modeloEquipo: "L-EQ",
    fallaReportada: "No enciende",
    clienteId: "cm7abc123def456ghi789jkl",
  };

  it("CreateOrdenSchema acepta sucursal válida", () => {
    const result = CreateOrdenSchema.safeParse({ ...baseData, sucursal: "LA_PAZ" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sucursal).toBe("LA_PAZ");
    }
  });

  it("CreateOrdenSchema acepta ABASTOS", () => {
    const result = CreateOrdenSchema.safeParse({ ...baseData, sucursal: "ABASTOS" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sucursal).toBe("ABASTOS");
    }
  });

  it("CreateOrdenSchema rechaza sucursal inválida", () => {
    const result = CreateOrdenSchema.safeParse({ ...baseData, sucursal: "INVALIDA" });
    expect(result.success).toBe(false);
  });

  it("CreateOrdenSchema usa default MEXICALTZINGO cuando no se envía sucursal", () => {
    const result = CreateOrdenSchema.safeParse(baseData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sucursal).toBe("MEXICALTZINGO");
    }
  });

  it("UpdateOrdenSchema acepta sucursal opcional", () => {
    const result = UpdateOrdenSchema.safeParse({ sucursal: "ABASTOS" });
    expect(result.success).toBe(true);
  });

  it("UpdateOrdenSchema acepta payload sin sucursal", () => {
    const result = UpdateOrdenSchema.safeParse({ prioridad: "ALTA" });
    expect(result.success).toBe(true);
  });

  it("UpdateOrdenSchema rechaza sucursal inválida", () => {
    const result = UpdateOrdenSchema.safeParse({ sucursal: "OTRA" });
    expect(result.success).toBe(false);
  });
});

describe("Sucursal — Labels", () => {
  it("SUCURSAL_LABELS tiene las 3 sucursales", () => {
    expect(SUCURSAL_LABELS).toHaveProperty("MEXICALTZINGO");
    expect(SUCURSAL_LABELS).toHaveProperty("LA_PAZ");
    expect(SUCURSAL_LABELS).toHaveProperty("ABASTOS");
    expect(Object.keys(SUCURSAL_LABELS)).toHaveLength(3);
  });

  it("SUCURSAL_SHORT_LABELS tiene las 3 sucursales con abreviaciones", () => {
    expect(SUCURSAL_SHORT_LABELS.MEXICALTZINGO).toBe("MEX");
    expect(SUCURSAL_SHORT_LABELS.LA_PAZ).toBe("PAZ");
    expect(SUCURSAL_SHORT_LABELS.ABASTOS).toBe("ABA");
  });
});
