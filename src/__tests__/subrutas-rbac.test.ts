import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    orden: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    evidencia: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    historialOrden: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock supabase
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "https://example.com/test.png" },
        })),
      })),
    },
  },
  EVIDENCIAS_BUCKET: "evidencias",
  FIRMAS_BUCKET: "firmas",
  generateEvidenciaPath: vi.fn(() => "ordenes/orden-1/evidencia.png"),
  getEvidenciaPublicUrl: vi.fn(() => "https://example.com/evidencia.png"),
  generateFirmaPath: vi.fn(() => "ordenes/orden-1/firma.png"),
  getFirmaPublicUrl: vi.fn(() => "https://example.com/firma.png"),
}));

// Mock pdfkit
vi.mock("pdfkit", () => {
  class MockPDFDocument {
    private handlers: Record<string, ((...args: unknown[]) => void)[]> = {};

    constructor() {
      setTimeout(() => {
        this.emit("data", Buffer.from("mock-pdf"));
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
    text() { return this; }
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

import { GET as getEvidencias, POST as postEvidencias, DELETE as deleteEvidencias } from "@/app/api/ordenes/[id]/evidencias/route";
import { GET as getFirma, POST as postFirma, DELETE as deleteFirma } from "@/app/api/ordenes/[id]/firma/route";
import { GET as getHistorial } from "@/app/api/ordenes/[id]/historial/route";
import { GET as getPdf } from "@/app/api/ordenes/[id]/pdf/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  orden: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  evidencia: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  historialOrden: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// Shared mock orden data
const mockOrdenForTecnico1 = {
  id: "orden-1",
  folio: "OS-2024-0001",
  tecnicoId: "tecnico-1",
  creadoPorId: "admin-1",
};

const mockOrdenForVendedor1 = {
  id: "orden-2",
  folio: "OS-2024-0002",
  tecnicoId: "tecnico-1",
  creadoPorId: "vendedor-1",
};

// PDF needs full orden data
const mockOrdenFullForPdf = {
  ...mockOrdenForTecnico1,
  fechaRecepcion: new Date("2024-01-15"),
  tipoServicio: "POR_COBRAR",
  estado: "REPARADO",
  marcaEquipo: "TORREY",
  modeloEquipo: "L-EQ 10",
  serieEquipo: "ABC123",
  condicionEquipo: "BUENA",
  accesorios: null,
  fallaReportada: "No enciende",
  diagnostico: "Fuente dañada",
  cotizacion: 1500,
  cotizacionAprobada: true,
  numeroFactura: null,
  fechaFactura: null,
  numeroRepare: null,
  coordenadasGPS: null,
  firmaClienteUrl: null,
  firmaFecha: null,
  cliente: {
    id: "cliente-1",
    nombre: "Test Cliente",
    empresa: "Empresa Test",
    telefono: "1234567890",
    email: "test@test.com",
  },
  tecnico: { id: "tecnico-1", name: "Técnico Test" },
  materialesUsados: [],
};

describe("Sub-rutas RBAC: canAccessOrden", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============ EVIDENCIAS GET ============
  describe("GET /api/ordenes/[id]/evidencias", () => {
    beforeEach(() => {
      mockPrisma.evidencia.findMany.mockResolvedValue([]);
    });

    it("TECNICO accede a su propia orden → 200", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "tecnico-1", name: "Técnico", role: "TECNICO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenForTecnico1);

      const response = await getEvidencias(
        createRequest("/api/ordenes/orden-1/evidencias"),
        createParams("orden-1")
      );

      expect(response.status).toBe(200);
    });

    it("TECNICO intenta acceder a orden de otro técnico → 403", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "tecnico-2", name: "Otro Técnico", role: "TECNICO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenForTecnico1);

      const response = await getEvidencias(
        createRequest("/api/ordenes/orden-1/evidencias"),
        createParams("orden-1")
      );

      expect(response.status).toBe(403);
    });

    it("COORD_SERVICIO accede a cualquier orden → 200", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "coord-1", name: "Coordinador", role: "COORD_SERVICIO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenForTecnico1);

      const response = await getEvidencias(
        createRequest("/api/ordenes/orden-1/evidencias"),
        createParams("orden-1")
      );

      expect(response.status).toBe(200);
    });

    it("VENDEDOR accede a orden que NO creó → 403", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "vendedor-2", name: "Otro Vendedor", role: "VENDEDOR" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenForVendedor1);

      const response = await getEvidencias(
        createRequest("/api/ordenes/orden-2/evidencias"),
        createParams("orden-2")
      );

      expect(response.status).toBe(403);
    });

    it("VENDEDOR accede a orden que creó → 200", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "vendedor-1", name: "Vendedor", role: "VENDEDOR" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenForVendedor1);

      const response = await getEvidencias(
        createRequest("/api/ordenes/orden-2/evidencias"),
        createParams("orden-2")
      );

      expect(response.status).toBe(200);
    });

    it("SUPER_ADMIN accede a cualquier orden → 200", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-1", name: "Admin", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenForTecnico1);

      const response = await getEvidencias(
        createRequest("/api/ordenes/orden-1/evidencias"),
        createParams("orden-1")
      );

      expect(response.status).toBe(200);
    });
  });

  // ============ EVIDENCIAS POST ============
  describe("POST /api/ordenes/[id]/evidencias", () => {
    it("TECNICO intenta subir evidencia a orden de otro técnico → 403", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "tecnico-2", name: "Otro Técnico", role: "TECNICO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenForTecnico1);

      const formData = new FormData();
      formData.append("tipo", "DIAGNOSTICO");
      const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
      formData.append("files", blob, "test.png");

      const request = new NextRequest(
        new URL("/api/ordenes/orden-1/evidencias", "http://localhost:3000"),
        { method: "POST", body: formData }
      );
      const response = await postEvidencias(request, createParams("orden-1"));

      expect(response.status).toBe(403);
    });
  });

  // ============ EVIDENCIAS DELETE ============
  describe("DELETE /api/ordenes/[id]/evidencias", () => {
    it("TECNICO intenta eliminar evidencia de orden de otro técnico → 403", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "tecnico-2", name: "Otro Técnico", role: "TECNICO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenForTecnico1);

      const response = await deleteEvidencias(
        createRequest("/api/ordenes/orden-1/evidencias?evidenciaId=ev-1", { method: "DELETE" }),
        createParams("orden-1")
      );

      expect(response.status).toBe(403);
    });
  });

  // ============ FIRMA GET ============
  describe("GET /api/ordenes/[id]/firma", () => {
    it("TECNICO accede a firma de su orden → 200", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "tecnico-1", name: "Técnico", role: "TECNICO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue({
        ...mockOrdenForTecnico1,
        firmaClienteUrl: null,
        firmaFecha: null,
      });

      const response = await getFirma(
        createRequest("/api/ordenes/orden-1/firma"),
        createParams("orden-1")
      );

      expect(response.status).toBe(200);
    });

    it("TECNICO intenta ver firma de orden de otro técnico → 403", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "tecnico-2", name: "Otro Técnico", role: "TECNICO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue({
        ...mockOrdenForTecnico1,
        firmaClienteUrl: null,
        firmaFecha: null,
      });

      const response = await getFirma(
        createRequest("/api/ordenes/orden-1/firma"),
        createParams("orden-1")
      );

      expect(response.status).toBe(403);
    });

    it("COORD_SERVICIO accede a firma de cualquier orden → 200", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "coord-1", name: "Coordinador", role: "COORD_SERVICIO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue({
        ...mockOrdenForTecnico1,
        firmaClienteUrl: "https://example.com/firma.png",
        firmaFecha: new Date(),
      });

      const response = await getFirma(
        createRequest("/api/ordenes/orden-1/firma"),
        createParams("orden-1")
      );

      expect(response.status).toBe(200);
    });

    it("VENDEDOR intenta ver firma de orden que NO creó → 403", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "vendedor-2", name: "Otro Vendedor", role: "VENDEDOR" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue({
        ...mockOrdenForVendedor1,
        firmaClienteUrl: null,
        firmaFecha: null,
      });

      const response = await getFirma(
        createRequest("/api/ordenes/orden-2/firma"),
        createParams("orden-2")
      );

      expect(response.status).toBe(403);
    });
  });

  // ============ FIRMA POST ============
  describe("POST /api/ordenes/[id]/firma", () => {
    it("TECNICO intenta guardar firma en orden de otro técnico → 403", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "tecnico-2", name: "Otro Técnico", role: "TECNICO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue({
        ...mockOrdenForTecnico1,
        estado: "LISTO_ENTREGA",
        firmaClienteUrl: null,
      });

      const formData = new FormData();
      const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
      formData.append("firma", blob, "firma.png");

      const request = new NextRequest(
        new URL("/api/ordenes/orden-1/firma", "http://localhost:3000"),
        { method: "POST", body: formData }
      );
      const response = await postFirma(request, createParams("orden-1"));

      expect(response.status).toBe(403);
    });
  });

  // ============ FIRMA DELETE ============
  describe("DELETE /api/ordenes/[id]/firma", () => {
    it("TECNICO intenta eliminar firma aunque sea su orden → 403 (solo SUPER_ADMIN)", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "tecnico-1", name: "Técnico", role: "TECNICO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue({
        ...mockOrdenForTecnico1,
        firmaClienteUrl: "https://example.com/firma.png",
      });

      const response = await deleteFirma(
        createRequest("/api/ordenes/orden-1/firma", { method: "DELETE" }),
        createParams("orden-1")
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Sin permisos para eliminar firmas");
    });
  });

  // ============ HISTORIAL GET ============
  describe("GET /api/ordenes/[id]/historial", () => {
    beforeEach(() => {
      mockPrisma.historialOrden.findMany.mockResolvedValue([]);
    });

    it("TECNICO accede a historial de su orden → 200", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "tecnico-1", name: "Técnico", role: "TECNICO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenForTecnico1);

      const response = await getHistorial(
        createRequest("/api/ordenes/orden-1/historial"),
        createParams("orden-1")
      );

      expect(response.status).toBe(200);
    });

    it("TECNICO intenta ver historial de orden de otro técnico → 403", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "tecnico-2", name: "Otro Técnico", role: "TECNICO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenForTecnico1);

      const response = await getHistorial(
        createRequest("/api/ordenes/orden-1/historial"),
        createParams("orden-1")
      );

      expect(response.status).toBe(403);
    });

    it("COORD_SERVICIO accede a historial de cualquier orden → 200", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "coord-1", name: "Coordinador", role: "COORD_SERVICIO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenForTecnico1);

      const response = await getHistorial(
        createRequest("/api/ordenes/orden-1/historial"),
        createParams("orden-1")
      );

      expect(response.status).toBe(200);
    });

    it("VENDEDOR intenta ver historial de orden que NO creó → 403", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "vendedor-2", name: "Otro Vendedor", role: "VENDEDOR" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenForVendedor1);

      const response = await getHistorial(
        createRequest("/api/ordenes/orden-2/historial"),
        createParams("orden-2")
      );

      expect(response.status).toBe(403);
    });
  });

  // ============ PDF GET ============
  describe("GET /api/ordenes/[id]/pdf", () => {
    it("TECNICO accede a PDF de su orden → 200", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "tecnico-1", name: "Técnico", role: "TECNICO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenFullForPdf);

      const response = await getPdf(
        createRequest("/api/ordenes/orden-1/pdf"),
        createParams("orden-1")
      );

      expect(response.status).toBe(200);
    });

    it("TECNICO intenta acceder a PDF de orden de otro técnico → 403", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "tecnico-2", name: "Otro Técnico", role: "TECNICO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenFullForPdf);

      const response = await getPdf(
        createRequest("/api/ordenes/orden-1/pdf"),
        createParams("orden-1")
      );

      expect(response.status).toBe(403);
    });

    it("COORD_SERVICIO accede a PDF de cualquier orden → 200", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "coord-1", name: "Coordinador", role: "COORD_SERVICIO" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenFullForPdf);

      const response = await getPdf(
        createRequest("/api/ordenes/orden-1/pdf"),
        createParams("orden-1")
      );

      expect(response.status).toBe(200);
    });

    it("VENDEDOR intenta acceder a PDF de orden que NO creó → 403", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "vendedor-2", name: "Otro Vendedor", role: "VENDEDOR" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenFullForPdf);

      const response = await getPdf(
        createRequest("/api/ordenes/orden-1/pdf"),
        createParams("orden-1")
      );

      expect(response.status).toBe(403);
    });

    it("REFACCIONES accede a PDF de cualquier orden → 200", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "refacciones-1", name: "Refacciones", role: "REFACCIONES" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrdenFullForPdf);

      const response = await getPdf(
        createRequest("/api/ordenes/orden-1/pdf"),
        createParams("orden-1")
      );

      expect(response.status).toBe(200);
    });
  });
});
