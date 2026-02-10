import { describe, it, expect } from "vitest";
import { esTransicionValida, TRANSICIONES_VALIDAS } from "@/lib/constants/transitions";
import type { EstadoOrden } from "@prisma/client";

describe("esTransicionValida", () => {
  describe("Flujo principal hacia adelante", () => {
    const flujoNormal: [EstadoOrden, EstadoOrden][] = [
      ["RECIBIDO", "EN_DIAGNOSTICO"],
      ["EN_DIAGNOSTICO", "EN_REPARACION"],
      ["EN_REPARACION", "REPARADO"],
      ["REPARADO", "LISTO_ENTREGA"],
      ["LISTO_ENTREGA", "ENTREGADO"],
    ];

    flujoNormal.forEach(([desde, hacia]) => {
      it(`permite ${desde} → ${hacia}`, () => {
        expect(esTransicionValida(desde, hacia)).toBe(true);
      });
    });
  });

  describe("Flujos alternativos", () => {
    it("permite EN_DIAGNOSTICO → ESPERA_REFACCIONES", () => {
      expect(esTransicionValida("EN_DIAGNOSTICO", "ESPERA_REFACCIONES")).toBe(true);
    });

    it("permite EN_DIAGNOSTICO → COTIZACION_PENDIENTE", () => {
      expect(esTransicionValida("EN_DIAGNOSTICO", "COTIZACION_PENDIENTE")).toBe(true);
    });

    it("permite ESPERA_REFACCIONES → EN_REPARACION", () => {
      expect(esTransicionValida("ESPERA_REFACCIONES", "EN_REPARACION")).toBe(true);
    });

    it("permite COTIZACION_PENDIENTE → EN_REPARACION", () => {
      expect(esTransicionValida("COTIZACION_PENDIENTE", "EN_REPARACION")).toBe(true);
    });
  });

  describe("Retrocesos válidos", () => {
    const retrocesos: [EstadoOrden, EstadoOrden][] = [
      ["EN_DIAGNOSTICO", "RECIBIDO"],
      ["EN_REPARACION", "EN_DIAGNOSTICO"],
      ["EN_REPARACION", "ESPERA_REFACCIONES"],
      ["REPARADO", "EN_REPARACION"],
      ["ESPERA_REFACCIONES", "EN_DIAGNOSTICO"],
      ["COTIZACION_PENDIENTE", "EN_DIAGNOSTICO"],
    ];

    retrocesos.forEach(([desde, hacia]) => {
      it(`permite retroceso ${desde} → ${hacia}`, () => {
        expect(esTransicionValida(desde, hacia)).toBe(true);
      });
    });
  });

  describe("CANCELADO", () => {
    const estadosCancelables: EstadoOrden[] = [
      "RECIBIDO", "EN_DIAGNOSTICO", "ESPERA_REFACCIONES",
      "COTIZACION_PENDIENTE", "EN_REPARACION", "REPARADO", "LISTO_ENTREGA",
    ];

    estadosCancelables.forEach((estado) => {
      it(`permite cancelar desde ${estado}`, () => {
        expect(esTransicionValida(estado, "CANCELADO")).toBe(true);
      });
    });

    it("NO permite cancelar desde ENTREGADO", () => {
      expect(esTransicionValida("ENTREGADO", "CANCELADO")).toBe(false);
    });

    it("permite reactivar CANCELADO → RECIBIDO", () => {
      expect(esTransicionValida("CANCELADO", "RECIBIDO")).toBe(true);
    });
  });

  describe("Transiciones inválidas", () => {
    const invalidas: [EstadoOrden, EstadoOrden][] = [
      ["RECIBIDO", "ENTREGADO"],
      ["RECIBIDO", "REPARADO"],
      ["RECIBIDO", "LISTO_ENTREGA"],
      ["EN_DIAGNOSTICO", "ENTREGADO"],
      ["EN_DIAGNOSTICO", "LISTO_ENTREGA"],
      ["ENTREGADO", "RECIBIDO"],
      ["ENTREGADO", "EN_DIAGNOSTICO"],
    ];

    invalidas.forEach(([desde, hacia]) => {
      it(`rechaza ${desde} → ${hacia}`, () => {
        expect(esTransicionValida(desde, hacia)).toBe(false);
      });
    });
  });

  describe("Mismo estado", () => {
    it("retorna true cuando el estado no cambia", () => {
      expect(esTransicionValida("RECIBIDO", "RECIBIDO")).toBe(true);
      expect(esTransicionValida("EN_REPARACION", "EN_REPARACION")).toBe(true);
    });
  });

  describe("Completitud del mapa", () => {
    const todosLosEstados: EstadoOrden[] = [
      "RECIBIDO", "EN_DIAGNOSTICO", "ESPERA_REFACCIONES",
      "COTIZACION_PENDIENTE", "EN_REPARACION", "REPARADO",
      "LISTO_ENTREGA", "ENTREGADO", "CANCELADO",
    ];

    it("TRANSICIONES_VALIDAS tiene entrada para cada estado", () => {
      todosLosEstados.forEach((estado) => {
        expect(TRANSICIONES_VALIDAS).toHaveProperty(estado);
        expect(Array.isArray(TRANSICIONES_VALIDAS[estado])).toBe(true);
      });
    });

    it("ENTREGADO no tiene transiciones de salida", () => {
      expect(TRANSICIONES_VALIDAS["ENTREGADO"]).toHaveLength(0);
    });
  });
});
