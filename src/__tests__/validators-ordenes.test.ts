import { describe, it, expect } from "vitest";
import { CreateOrdenSchema, UpdateOrdenSchema } from "@/lib/validators/ordenes";

describe("validators ordenes — cuid IDs", () => {
  it("CreateOrdenSchema acepta clienteId con formato cuid", () => {
    const data = {
      tipoServicio: "GARANTIA",
      marcaEquipo: "Torrey",
      modeloEquipo: "L-EQ",
      fallaReportada: "No enciende",
      clienteId: "cm7abc123def456ghi789jkl",
    };
    const result = CreateOrdenSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("CreateOrdenSchema rechaza clienteId vacío", () => {
    const data = {
      tipoServicio: "GARANTIA",
      marcaEquipo: "Torrey",
      modeloEquipo: "L-EQ",
      fallaReportada: "No enciende",
      clienteId: "",
    };
    const result = CreateOrdenSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("CreateOrdenSchema acepta tecnicoId con formato cuid", () => {
    const data = {
      tipoServicio: "GARANTIA",
      marcaEquipo: "Torrey",
      modeloEquipo: "L-EQ",
      fallaReportada: "No enciende",
      clienteId: "cm7abc123def456ghi789jkl",
      tecnicoId: "cm7xyz789abc123def456ghi",
    };
    const result = CreateOrdenSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("UpdateOrdenSchema acepta tecnicoId cuid", () => {
    const data = { tecnicoId: "cm7test000000000000000001" };
    const result = UpdateOrdenSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("UpdateOrdenSchema acepta tecnicoId null", () => {
    const data = { tecnicoId: null };
    const result = UpdateOrdenSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("CreateOrdenSchema acepta accesorios como JSON object", () => {
    const data = {
      tipoServicio: "GARANTIA",
      marcaEquipo: "Torrey",
      modeloEquipo: "L-EQ",
      fallaReportada: "No enciende",
      clienteId: "cm7abc123def456ghi789jkl",
      accesorios: { "Plato": true, "Eliminador": true, "Cable": false },
    };
    const result = CreateOrdenSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
