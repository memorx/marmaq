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
    },
  },
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
}));

// Mock pdfkit - definir clase dentro del factory
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

import { GET } from "@/app/api/ordenes/[id]/pdf/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  orden: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

// Helper para crear request
function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

// Helper para crear params
function createParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id });
}

// Datos de prueba
const mockOrden = {
  id: "orden-123",
  folio: "OS-2024-0001",
  fechaRecepcion: new Date("2024-01-15"),
  tipoServicio: "POR_COBRAR",
  estado: "REPARADO",
  marcaEquipo: "TORREY",
  modeloEquipo: "L-EQ 10",
  serieEquipo: "ABC123",
  condicionEquipo: "Buen estado",
  accesorios: "Charola, adaptador",
  fallaReportada: "No enciende el equipo",
  diagnostico: "Fuente de poder dañada. Se reemplazó por nueva.",
  cotizacion: 1500.00,
  cotizacionAprobada: true,
  numeroFactura: null,
  fechaFactura: null,
  numeroRepare: null,
  coordenadasGPS: null,
  tecnicoId: "tecnico-1",
  creadoPorId: "admin-1",
  cliente: {
    id: "cliente-1",
    nombre: "Juan Pérez",
    empresa: "Carnicería El Toro",
    telefono: "3311234567",
    email: "juan@example.com",
  },
  tecnico: {
    id: "tecnico-1",
    name: "Carlos Técnico",
  },
  materialesUsados: [
    {
      id: "mu-1",
      cantidad: 1,
      precioUnitario: 800,
      material: {
        id: "mat-1",
        nombre: "Fuente de poder 12V",
        sku: "FP-12V-001",
      },
    },
  ],
};

describe("GET /api/ordenes/[id]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Autenticación", () => {
    it("debe rechazar solicitudes sin autenticación", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createRequest("/api/ordenes/orden-123/pdf");
      const params = createParams("orden-123");

      const response = await GET(request, { params });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("No autorizado");
    });

    it("debe rechazar si no hay usuario en la sesión", async () => {
      mockAuth.mockResolvedValue({ user: null });

      const request = createRequest("/api/ordenes/orden-123/pdf");
      const params = createParams("orden-123");

      const response = await GET(request, { params });

      expect(response.status).toBe(401);
    });
  });

  describe("Validación de orden", () => {
    it("debe retornar 404 si la orden no existe", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(null);

      const request = createRequest("/api/ordenes/orden-inexistente/pdf");
      const params = createParams("orden-inexistente");

      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Orden no encontrada");
    });
  });

  describe("Generación de PDF exitosa", () => {
    it("debe generar PDF correctamente", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrden);

      const request = createRequest("/api/ordenes/orden-123/pdf");
      const params = createParams("orden-123");

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/pdf");
      expect(response.headers.get("Content-Disposition")).toContain("hoja-servicio-OS-2024-0001.pdf");
    });

    it("debe generar PDF para orden sin materiales", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue({
        ...mockOrden,
        materialesUsados: [],
      });

      const request = createRequest("/api/ordenes/orden-123/pdf");
      const params = createParams("orden-123");

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });

    it("debe generar PDF para orden de GARANTIA", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue({
        ...mockOrden,
        tipoServicio: "GARANTIA",
        numeroFactura: "FACT-2024-001",
        fechaFactura: new Date("2024-01-01"),
        cotizacion: null,
      });

      const request = createRequest("/api/ordenes/orden-123/pdf");
      const params = createParams("orden-123");

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });

    it("debe generar PDF para orden REPARE", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue({
        ...mockOrden,
        tipoServicio: "REPARE",
        numeroRepare: "REP-2024-001",
        coordenadasGPS: "20.6597,-103.3496",
        cotizacion: null,
      });

      const request = createRequest("/api/ordenes/orden-123/pdf");
      const params = createParams("orden-123");

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });

    it("debe generar PDF para orden sin técnico asignado", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue({
        ...mockOrden,
        tecnico: null,
      });

      const request = createRequest("/api/ordenes/orden-123/pdf");
      const params = createParams("orden-123");

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });

    it("debe generar PDF para orden sin diagnóstico", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue({
        ...mockOrden,
        diagnostico: null,
      });

      const request = createRequest("/api/ordenes/orden-123/pdf");
      const params = createParams("orden-123");

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });
  });

  describe("Consultas a base de datos", () => {
    it("debe consultar la orden con las relaciones correctas", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrden);

      const request = createRequest("/api/ordenes/orden-123/pdf");
      const params = createParams("orden-123");

      await GET(request, { params });

      expect(mockPrisma.orden.findUnique).toHaveBeenCalledWith({
        where: { id: "orden-123" },
        include: {
          cliente: true,
          tecnico: {
            select: { id: true, name: true },
          },
          materialesUsados: {
            include: {
              material: true,
            },
          },
        },
      });
    });
  });

  describe("Headers de respuesta", () => {
    it("debe incluir Content-Type application/pdf", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrden);

      const request = createRequest("/api/ordenes/orden-123/pdf");
      const params = createParams("orden-123");

      const response = await GET(request, { params });

      expect(response.headers.get("Content-Type")).toBe("application/pdf");
    });

    it("debe incluir Content-Disposition con nombre de archivo", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue(mockOrden);

      const request = createRequest("/api/ordenes/orden-123/pdf");
      const params = createParams("orden-123");

      const response = await GET(request, { params });

      const disposition = response.headers.get("Content-Disposition");
      expect(disposition).toContain("inline");
      expect(disposition).toContain("hoja-servicio-OS-2024-0001.pdf");
    });
  });

  describe("Diferentes tipos de servicio", () => {
    it("debe generar PDF para CENTRO_SERVICIO", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findUnique.mockResolvedValue({
        ...mockOrden,
        tipoServicio: "CENTRO_SERVICIO",
        cotizacion: null,
      });

      const request = createRequest("/api/ordenes/orden-123/pdf");
      const params = createParams("orden-123");

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });
  });

  describe("Roles de usuario", () => {
    const roles = ["SUPER_ADMIN", "COORD_SERVICIO", "REFACCIONES"];

    roles.forEach((role) => {
      it(`debe permitir acceso a usuario con rol ${role}`, async () => {
        mockAuth.mockResolvedValue({
          user: { id: "user-1", name: "Test User", role },
        });
        mockPrisma.orden.findUnique.mockResolvedValue(mockOrden);

        const request = createRequest("/api/ordenes/orden-123/pdf");
        const params = createParams("orden-123");

        const response = await GET(request, { params });

        expect(response.status).toBe(200);
      });
    });
  });
});
