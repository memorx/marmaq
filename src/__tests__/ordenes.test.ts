import { describe, it, expect } from "vitest";
import {
  calcularSemaforo,
  STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  SEMAFORO_CONFIG,
  PRIORIDAD_LABELS,
} from "@/types/ordenes";
import type { Orden } from "@prisma/client";

// Mock de orden base para tests
const createMockOrden = (overrides: Partial<Orden> = {}): Orden => ({
  id: "test-id",
  folio: "OS-2024-0001",
  tipoServicio: "GARANTIA",
  estado: "RECIBIDO",
  prioridad: "NORMAL",
  clienteId: "client-id",
  tecnicoId: null,
  creadoPorId: "user-id",
  marcaEquipo: "Torrey",
  modeloEquipo: "L-EQ 10/20",
  serieEquipo: null,
  accesorios: null,
  condicionEquipo: "REGULAR",
  fallaReportada: "Test falla",
  diagnostico: null,
  notasTecnico: null,
  numeroFactura: null,
  fechaFactura: null,
  numeroRepare: null,
  coordenadasGPS: null,
  fechaRecepcion: new Date(),
  fechaPromesa: null,
  fechaReparacion: null,
  fechaEntrega: null,
  cotizacion: null,
  cotizacionAprobada: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("calcularSemaforo", () => {
  it("devuelve AZUL para orden RECIBIDO hoy", () => {
    const orden = createMockOrden({
      estado: "RECIBIDO",
      fechaRecepcion: new Date(),
    });
    expect(calcularSemaforo(orden)).toBe("AZUL");
  });

  it("devuelve NARANJA para orden en ESPERA_REFACCIONES", () => {
    const orden = createMockOrden({
      estado: "ESPERA_REFACCIONES",
      fechaRecepcion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });
    expect(calcularSemaforo(orden)).toBe("NARANJA");
  });

  it("devuelve AMARILLO para EN_DIAGNOSTICO más de 72 horas", () => {
    const orden = createMockOrden({
      estado: "EN_DIAGNOSTICO",
      fechaRecepcion: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 días
    });
    expect(calcularSemaforo(orden)).toBe("AMARILLO");
  });

  it("devuelve AMARILLO para COTIZACION_PENDIENTE más de 72 horas", () => {
    const orden = createMockOrden({
      estado: "COTIZACION_PENDIENTE",
      fechaRecepcion: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });
    expect(calcularSemaforo(orden)).toBe("AMARILLO");
  });

  it("devuelve ROJO para LISTO_ENTREGA más de 5 días", () => {
    const orden = createMockOrden({
      estado: "LISTO_ENTREGA",
      fechaRecepcion: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      fechaReparacion: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
    expect(calcularSemaforo(orden)).toBe("ROJO");
  });

  it("devuelve VERDE para orden EN_REPARACION reciente", () => {
    const orden = createMockOrden({
      estado: "EN_REPARACION",
      fechaRecepcion: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });
    expect(calcularSemaforo(orden)).toBe("VERDE");
  });

  it("devuelve VERDE para orden REPARADO", () => {
    const orden = createMockOrden({
      estado: "REPARADO",
      fechaRecepcion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });
    expect(calcularSemaforo(orden)).toBe("VERDE");
  });

  it("devuelve VERDE para EN_DIAGNOSTICO menos de 72 horas", () => {
    const orden = createMockOrden({
      estado: "EN_DIAGNOSTICO",
      fechaRecepcion: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 día
    });
    expect(calcularSemaforo(orden)).toBe("VERDE");
  });
});

describe("STATUS_LABELS", () => {
  it("contiene todos los estados esperados", () => {
    const expectedStates = [
      "RECIBIDO",
      "EN_DIAGNOSTICO",
      "ESPERA_REFACCIONES",
      "COTIZACION_PENDIENTE",
      "EN_REPARACION",
      "REPARADO",
      "LISTO_ENTREGA",
      "ENTREGADO",
      "CANCELADO",
    ];

    expectedStates.forEach((state) => {
      expect(STATUS_LABELS).toHaveProperty(state);
      expect(typeof STATUS_LABELS[state as keyof typeof STATUS_LABELS]).toBe("string");
    });
  });

  it("tiene labels legibles en español", () => {
    expect(STATUS_LABELS.RECIBIDO).toBe("Recibido");
    expect(STATUS_LABELS.EN_DIAGNOSTICO).toBe("En Diagnóstico");
    expect(STATUS_LABELS.ESPERA_REFACCIONES).toBe("Espera Refacciones");
    expect(STATUS_LABELS.ENTREGADO).toBe("Entregado");
  });
});

describe("SERVICE_TYPE_LABELS", () => {
  it("contiene todos los tipos de servicio", () => {
    const expectedTypes = ["GARANTIA", "CENTRO_SERVICIO", "POR_COBRAR", "REPARE"];

    expectedTypes.forEach((type) => {
      expect(SERVICE_TYPE_LABELS).toHaveProperty(type);
    });
  });

  it("tiene labels correctos", () => {
    expect(SERVICE_TYPE_LABELS.GARANTIA).toBe("Garantía");
    expect(SERVICE_TYPE_LABELS.CENTRO_SERVICIO).toBe("Centro Servicio");
    expect(SERVICE_TYPE_LABELS.POR_COBRAR).toBe("Por Cobrar");
    expect(SERVICE_TYPE_LABELS.REPARE).toBe("REPARE");
  });
});

describe("PRIORIDAD_LABELS", () => {
  it("contiene todas las prioridades", () => {
    expect(PRIORIDAD_LABELS.BAJA).toBe("Baja");
    expect(PRIORIDAD_LABELS.NORMAL).toBe("Normal");
    expect(PRIORIDAD_LABELS.ALTA).toBe("Alta");
    expect(PRIORIDAD_LABELS.URGENTE).toBe("Urgente");
  });
});

describe("SEMAFORO_CONFIG", () => {
  it("tiene configuración para todos los colores", () => {
    const colors = ["ROJO", "NARANJA", "AMARILLO", "AZUL", "VERDE"];

    colors.forEach((color) => {
      const config = SEMAFORO_CONFIG[color as keyof typeof SEMAFORO_CONFIG];
      expect(config).toHaveProperty("color");
      expect(config).toHaveProperty("label");
      expect(config).toHaveProperty("description");
      expect(config.color).toMatch(/^#[0-9A-Fa-f]{6}$/); // Hex color
    });
  });

  it("tiene colores válidos", () => {
    expect(SEMAFORO_CONFIG.ROJO.color).toBe("#DC2626");
    expect(SEMAFORO_CONFIG.VERDE.color).toBe("#16A34A");
    expect(SEMAFORO_CONFIG.AZUL.color).toBe("#2563EB");
  });
});
