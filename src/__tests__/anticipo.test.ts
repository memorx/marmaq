import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { CreateOrdenSchema } from "@/lib/validators/ordenes";

// ============ VALIDATOR TESTS ============

describe("Anticipo — Validators", () => {
  it("CreateOrdenSchema acepta anticipo numérico válido", () => {
    const data = {
      tipoServicio: "POR_COBRAR",
      marcaEquipo: "Torrey",
      modeloEquipo: "L-EQ",
      fallaReportada: "No enciende",
      clienteId: "cm7abc123def456ghi789jkl",
      anticipo: 500.50,
    };
    const result = CreateOrdenSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.anticipo).toBe(500.50);
    }
  });

  it("CreateOrdenSchema rechaza anticipo negativo", () => {
    const data = {
      tipoServicio: "POR_COBRAR",
      marcaEquipo: "Torrey",
      modeloEquipo: "L-EQ",
      fallaReportada: "No enciende",
      clienteId: "cm7abc123def456ghi789jkl",
      anticipo: -100,
    };
    const result = CreateOrdenSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("CreateOrdenSchema acepta orden sin anticipo (campo opcional)", () => {
    const data = {
      tipoServicio: "POR_COBRAR",
      marcaEquipo: "Torrey",
      modeloEquipo: "L-EQ",
      fallaReportada: "No enciende",
      clienteId: "cm7abc123def456ghi789jkl",
    };
    const result = CreateOrdenSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.anticipo).toBeUndefined();
    }
  });
});

// ============ API TESTS ============

// Mock auth
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    orden: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
    historialEstado: { create: vi.fn() },
    historialOrden: { create: vi.fn() },
  },
}));

// Mock folio generator
vi.mock("@/lib/utils/folio-generator", () => ({
  crearOrdenConFolio: vi.fn(),
  FolioGenerationError: class extends Error {},
}));

// Mock notification triggers
vi.mock("@/lib/notificaciones/notification-triggers", () => ({
  notificarOrdenCreada: vi.fn().mockResolvedValue(undefined),
  notificarCambioEstado: vi.fn().mockResolvedValue(undefined),
  notificarTecnicoReasignado: vi.fn().mockResolvedValue(undefined),
  notificarPrioridadUrgente: vi.fn().mockResolvedValue(undefined),
  notificarCotizacionModificada: vi.fn().mockResolvedValue(undefined),
  notificarOrdenCancelada: vi.fn().mockResolvedValue(undefined),
}));

// Mock transitions
vi.mock("@/lib/constants/transitions", () => ({
  esTransicionValida: vi.fn(() => true),
  TRANSICIONES_VALIDAS: {},
}));

import { POST } from "@/app/api/ordenes/route";
import { GET, PATCH } from "@/app/api/ordenes/[id]/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { crearOrdenConFolio } from "@/lib/utils/folio-generator";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  orden: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};
const mockCrearOrden = crearOrdenConFolio as ReturnType<typeof vi.fn>;

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function createParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id });
}

const adminSession = {
  user: { id: "admin-1", name: "Admin", role: "SUPER_ADMIN" },
};

describe("Anticipo — API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/ordenes crea orden POR_COBRAR con anticipo correctamente", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const createdOrden = {
      id: "orden-new",
      folio: "OS-2026-03-001",
      tipoServicio: "POR_COBRAR",
      anticipo: 1000,
      tecnicoId: null,
      marcaEquipo: "Torrey",
      modeloEquipo: "L-EQ",
    };

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        cliente: { create: vi.fn() },
        historialEstado: { create: vi.fn() },
        historialOrden: { create: vi.fn() },
      };
      // The crearOrdenConFolio mock is called inside the transaction callback
      mockCrearOrden.mockResolvedValue(createdOrden);
      return fn(tx);
    });

    const request = createRequest("/api/ordenes", {
      method: "POST",
      body: JSON.stringify({
        tipoServicio: "POR_COBRAR",
        marcaEquipo: "Torrey",
        modeloEquipo: "L-EQ",
        fallaReportada: "No enciende",
        clienteId: "client-1",
        anticipo: 1000,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.anticipo).toBe(1000);
  });

  it("PATCH /api/ordenes/[id] actualiza anticipo correctamente", async () => {
    mockAuth.mockResolvedValue(adminSession);

    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      estado: "RECIBIDO",
      tecnicoId: null,
      creadoPorId: "admin-1",
      tipoServicio: "POR_COBRAR",
      cotizacion: null,
      cotizacionAprobada: false,
      diagnostico: null,
      notasTecnico: null,
      prioridad: "NORMAL",
    });

    const updatedOrden = {
      id: "orden-1",
      folio: "OS-2026-03-001",
      tipoServicio: "POR_COBRAR",
      anticipo: 500,
      estado: "RECIBIDO",
      tecnicoId: null,
      creadoPorId: "admin-1",
      cotizacion: null,
      fechaRecepcion: new Date(),
    };

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        orden: { update: vi.fn().mockResolvedValue(updatedOrden) },
        historialEstado: { create: vi.fn() },
        historialOrden: { create: vi.fn() },
      };
      return fn(tx);
    });

    const request = createRequest("/api/ordenes/orden-1", {
      method: "PATCH",
      body: JSON.stringify({ anticipo: 500 }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: createParams("orden-1") });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.anticipo).toBe(500);
  });

  it("GET /api/ordenes/[id] retorna anticipo en la respuesta", async () => {
    mockAuth.mockResolvedValue(adminSession);

    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      folio: "OS-2026-03-001",
      tipoServicio: "POR_COBRAR",
      estado: "RECIBIDO",
      anticipo: 750.50,
      tecnicoId: null,
      creadoPorId: "admin-1",
      fechaRecepcion: new Date(),
      cliente: { id: "c1", nombre: "Test" },
      tecnico: null,
      creadoPor: { id: "admin-1", name: "Admin", email: "a@t.com" },
      evidencias: [],
      materialesUsados: [],
      historial: [],
    });

    const request = createRequest("/api/ordenes/orden-1");
    const response = await GET(request, { params: createParams("orden-1") });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.anticipo).toBe(750.50);
  });
});

// ============ PDF TESTS ============

const pdfTextCalls = vi.hoisted(() => [] as string[]);

// Mock pdfkit
vi.mock("pdfkit", () => {
  class MockPDFDocument {
    private handlers: Record<string, ((...args: unknown[]) => void)[]> = {};

    constructor() {
      setTimeout(() => {
        this.emit("data", Buffer.from("mock-pdf-content"));
        this.emit("end");
      }, 0);
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      if (!this.handlers[event]) this.handlers[event] = [];
      this.handlers[event].push(handler);
      return this;
    }

    emit(event: string, ...args: unknown[]) {
      this.handlers[event]?.forEach((h) => h(...args));
    }

    fontSize() { return this; }
    fillColor() { return this; }
    font() { return this; }
    text(content?: string) { if (content !== undefined) pdfTextCalls.push(String(content)); return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    strokeColor() { return this; }
    lineWidth() { return this; }
    stroke() { return this; }
    rect() { return this; }
    fill() { return this; }
    image() { return this; }
    addPage() { return this; }
    heightOfString() { return 20; }
    end() {
      setTimeout(() => {
        this.emit("data", Buffer.from("mock-pdf-final"));
        this.emit("end");
      }, 0);
    }
  }

  return { default: MockPDFDocument };
});

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
}));

import { GET as PDF_GET } from "@/app/api/ordenes/[id]/pdf/route";

const mockPdfOrden = {
  id: "orden-123",
  folio: "OS-2024-0001",
  fechaRecepcion: new Date("2024-01-15"),
  tipoServicio: "POR_COBRAR",
  estado: "REPARADO",
  marcaEquipo: "TORREY",
  modeloEquipo: "L-EQ 10",
  serieEquipo: "ABC123",
  condicionEquipo: "Buen estado",
  accesorios: null,
  fallaReportada: "No enciende",
  diagnostico: "Fuente dañada",
  cotizacion: 1500,
  cotizacionAprobada: true,
  anticipo: 500,
  numeroFactura: null,
  fechaFactura: null,
  numeroRepare: null,
  coordenadasGPS: null,
  tecnicoId: "tech-1",
  creadoPorId: "admin-1",
  firmaClienteUrl: null,
  firmaFecha: null,
  cliente: {
    id: "c1",
    nombre: "Test Cliente",
    empresa: null,
    telefono: "1234567890",
    email: null,
  },
  tecnico: { id: "tech-1", name: "Técnico" },
  materialesUsados: [],
};

describe("Anticipo — PDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pdfTextCalls.length = 0;
  });

  it("PDF comprobante para POR_COBRAR con anticipo contiene ANTICIPO", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockPrisma.orden.findUnique.mockResolvedValue(mockPdfOrden);

    const request = createRequest("/api/ordenes/orden-123/pdf?tipo=comprobante");
    const response = await PDF_GET(request, { params: createParams("orden-123") });

    expect(response.status).toBe(200);
    expect(pdfTextCalls.some((t) => t.includes("ANTICIPO"))).toBe(true);
    expect(pdfTextCalls.some((t) => t.includes("$500"))).toBe(true);
  });

  it("PDF comprobante para GARANTIA no contiene campo anticipo", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockPrisma.orden.findUnique.mockResolvedValue({
      ...mockPdfOrden,
      tipoServicio: "GARANTIA",
      anticipo: null,
      cotizacion: null,
    });

    pdfTextCalls.length = 0;
    const request = createRequest("/api/ordenes/orden-123/pdf?tipo=comprobante");
    await PDF_GET(request, { params: createParams("orden-123") });

    expect(pdfTextCalls.some((t) => t.includes("ANTICIPO"))).toBe(false);
  });
});
