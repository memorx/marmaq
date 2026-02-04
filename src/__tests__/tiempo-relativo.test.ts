import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { tiempoRelativo } from "@/lib/utils/tiempo-relativo";

describe("tiempoRelativo", () => {
  beforeEach(() => {
    // Mock Date to a fixed time: 2024-01-15 12:00:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("segundos", () => {
    it("retorna 'ahora' para menos de 60 segundos", () => {
      const fecha = new Date("2024-01-15T11:59:30Z"); // 30 segundos antes
      expect(tiempoRelativo(fecha)).toBe("ahora");
    });

    it("retorna 'ahora' para 0 segundos", () => {
      const fecha = new Date("2024-01-15T12:00:00Z");
      expect(tiempoRelativo(fecha)).toBe("ahora");
    });
  });

  describe("minutos", () => {
    it("retorna 'hace X min' para menos de 60 minutos", () => {
      const fecha = new Date("2024-01-15T11:55:00Z"); // 5 minutos antes
      expect(tiempoRelativo(fecha)).toBe("hace 5 min");
    });

    it("retorna 'hace 1 min' para 1 minuto", () => {
      const fecha = new Date("2024-01-15T11:59:00Z");
      expect(tiempoRelativo(fecha)).toBe("hace 1 min");
    });

    it("retorna 'hace 59 min' para 59 minutos", () => {
      const fecha = new Date("2024-01-15T11:01:00Z");
      expect(tiempoRelativo(fecha)).toBe("hace 59 min");
    });
  });

  describe("horas", () => {
    it("retorna 'hace Xh' para menos de 24 horas", () => {
      const fecha = new Date("2024-01-15T09:00:00Z"); // 3 horas antes
      expect(tiempoRelativo(fecha)).toBe("hace 3h");
    });

    it("retorna 'hace 1h' para 1 hora", () => {
      const fecha = new Date("2024-01-15T11:00:00Z");
      expect(tiempoRelativo(fecha)).toBe("hace 1h");
    });

    it("retorna 'hace 23h' para 23 horas", () => {
      const fecha = new Date("2024-01-14T13:00:00Z");
      expect(tiempoRelativo(fecha)).toBe("hace 23h");
    });
  });

  describe("días", () => {
    it("retorna 'hace 1 día' para 1 día", () => {
      const fecha = new Date("2024-01-14T12:00:00Z");
      expect(tiempoRelativo(fecha)).toBe("hace 1 día");
    });

    it("retorna 'hace Xd' para 2-6 días", () => {
      const fecha = new Date("2024-01-12T12:00:00Z"); // 3 días antes
      expect(tiempoRelativo(fecha)).toBe("hace 3d");
    });

    it("retorna 'hace 6d' para 6 días", () => {
      const fecha = new Date("2024-01-09T12:00:00Z");
      expect(tiempoRelativo(fecha)).toBe("hace 6d");
    });
  });

  describe("semanas", () => {
    it("retorna 'hace 1 semana' para 1 semana", () => {
      const fecha = new Date("2024-01-08T12:00:00Z");
      expect(tiempoRelativo(fecha)).toBe("hace 1 semana");
    });

    it("retorna 'hace X semanas' para 2-3 semanas", () => {
      const fecha = new Date("2024-01-01T12:00:00Z"); // 2 semanas antes
      expect(tiempoRelativo(fecha)).toBe("hace 2 semanas");
    });

    it("retorna 'hace 3 semanas' para 3 semanas", () => {
      const fecha = new Date("2023-12-25T12:00:00Z");
      expect(tiempoRelativo(fecha)).toBe("hace 3 semanas");
    });
  });

  describe("meses", () => {
    it("retorna 'hace 1 mes' para 1 mes", () => {
      const fecha = new Date("2023-12-15T12:00:00Z");
      expect(tiempoRelativo(fecha)).toBe("hace 1 mes");
    });

    it("retorna 'hace X meses' para varios meses", () => {
      const fecha = new Date("2023-10-15T12:00:00Z"); // 3 meses antes
      expect(tiempoRelativo(fecha)).toBe("hace 3 meses");
    });

    it("retorna 'hace 11 meses' para 11 meses", () => {
      const fecha = new Date("2023-02-15T12:00:00Z");
      expect(tiempoRelativo(fecha)).toBe("hace 11 meses");
    });
  });

  describe("años", () => {
    it("retorna 'hace 1 año' para 1 año", () => {
      const fecha = new Date("2023-01-15T12:00:00Z");
      expect(tiempoRelativo(fecha)).toBe("hace 1 año");
    });

    it("retorna 'hace X años' para varios años", () => {
      const fecha = new Date("2021-01-15T12:00:00Z"); // 3 años antes
      expect(tiempoRelativo(fecha)).toBe("hace 3 años");
    });
  });

  describe("fechas futuras", () => {
    it("retorna 'ahora' para fechas en el futuro", () => {
      const fecha = new Date("2024-01-15T13:00:00Z"); // 1 hora en el futuro
      expect(tiempoRelativo(fecha)).toBe("ahora");
    });
  });

  describe("entrada como string", () => {
    it("acepta string ISO como entrada", () => {
      expect(tiempoRelativo("2024-01-15T11:55:00Z")).toBe("hace 5 min");
    });

    it("acepta string de fecha como entrada", () => {
      expect(tiempoRelativo("2024-01-14T12:00:00Z")).toBe("hace 1 día");
    });
  });
});
