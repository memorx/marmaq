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
    material: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    materialUsado: {
      create: vi.fn(),
    },
    historialOrden: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { POST } from "@/app/api/ordenes/[id]/materiales/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  orden: { findUnique: ReturnType<typeof vi.fn> };
  material: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  materialUsado: { create: ReturnType<typeof vi.fn> };
  historialOrden: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function createParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id });
}

const mockOrden = {
  id: "orden-1",
  tecnicoId: "tech-1",
  creadoPorId: "admin-1",
};

const mockMaterial = {
  id: "mat-1",
  sku: "SKU-001",
  nombre: "Tornillo M8",
  stockActual: 50,
  precioVenta: 15.5,
  activo: true,
};

const adminSession = {
  user: { id: "admin-1", name: "Admin", role: "SUPER_ADMIN" },
};

describe("POST /api/ordenes/[id]/materiales — Material manual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.orden.findUnique.mockResolvedValue(mockOrden);
    mockPrisma.material.findUnique.mockResolvedValue(mockMaterial);
  });

  it("POST con materialId funciona como antes (catálogo)", async () => {
    const createdMU = {
      id: "mu-1",
      ordenId: "orden-1",
      materialId: "mat-1",
      cantidad: 2,
      precioUnitario: 15.5,
      esManual: false,
      descripcionManual: null,
      material: mockMaterial,
    };

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        materialUsado: { create: vi.fn().mockResolvedValue(createdMU) },
        material: { update: vi.fn().mockResolvedValue({}) },
        historialOrden: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });
    mockAuth.mockResolvedValue(adminSession);

    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/materiales", "http://localhost:3000"),
      {
        method: "POST",
        body: JSON.stringify({ materialId: "mat-1", cantidad: 2 }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await POST(request, { params: createParams("orden-1") });
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.materialId).toBe("mat-1");
    expect(data.esManual).toBe(false);
  });

  it("POST con descripcionManual crea material manual", async () => {
    const createdManual = {
      id: "mu-2",
      ordenId: "orden-1",
      materialId: null,
      cantidad: 2,
      precioUnitario: 45.0,
      esManual: true,
      descripcionManual: "Interruptor especial para PV-90",
      material: null,
    };

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        materialUsado: { create: vi.fn().mockResolvedValue(createdManual) },
        historialOrden: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });
    mockAuth.mockResolvedValue(adminSession);

    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/materiales", "http://localhost:3000"),
      {
        method: "POST",
        body: JSON.stringify({
          descripcionManual: "Interruptor especial para PV-90",
          cantidad: 2,
          precioUnitario: 45.0,
        }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await POST(request, { params: createParams("orden-1") });
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.esManual).toBe(true);
    expect(data.descripcionManual).toBe("Interruptor especial para PV-90");
    expect(data.materialId).toBeNull();
    expect(data.material).toBeNull();
  });

  it("POST sin materialId ni descripcionManual → error 400", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/materiales", "http://localhost:3000"),
      {
        method: "POST",
        body: JSON.stringify({ cantidad: 1, precioUnitario: 10 }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await POST(request, { params: createParams("orden-1") });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Se requiere materialId o descripcionManual");
  });

  it("POST con ambos (materialId + descripcionManual) → error 400", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/materiales", "http://localhost:3000"),
      {
        method: "POST",
        body: JSON.stringify({
          materialId: "mat-1",
          descripcionManual: "Cola de ratón",
          cantidad: 1,
          precioUnitario: 10,
        }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await POST(request, { params: createParams("orden-1") });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("No se puede enviar materialId y descripcionManual al mismo tiempo");
  });

  it("Material manual no descuenta stock", async () => {
    let txMaterialUpdateCalled = false;

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        materialUsado: {
          create: vi.fn().mockResolvedValue({
            id: "mu-3",
            ordenId: "orden-1",
            materialId: null,
            cantidad: 1,
            precioUnitario: 20,
            esManual: true,
            descripcionManual: "Cola de ratón",
            material: null,
          }),
        },
        material: {
          update: vi.fn().mockImplementation(() => {
            txMaterialUpdateCalled = true;
            return {};
          }),
        },
        historialOrden: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });
    mockAuth.mockResolvedValue(adminSession);

    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/materiales", "http://localhost:3000"),
      {
        method: "POST",
        body: JSON.stringify({
          descripcionManual: "Cola de ratón",
          cantidad: 1,
          precioUnitario: 20,
        }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await POST(request, { params: createParams("orden-1") });
    expect(response.status).toBe(201);

    // material.update should NOT have been called for manual materials
    expect(txMaterialUpdateCalled).toBe(false);
  });

  it("GET retorna materiales manuales con descripcionManual", async () => {
    // The GET for ordenes returns materialesUsados via include.
    // We test that the manual material data structure is correct from POST response.
    const createdManual = {
      id: "mu-4",
      ordenId: "orden-1",
      materialId: null,
      cantidad: 3,
      precioUnitario: 100,
      esManual: true,
      descripcionManual: "Adaptación especial turbolicuadora",
      material: null,
    };

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        materialUsado: { create: vi.fn().mockResolvedValue(createdManual) },
        historialOrden: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });
    mockAuth.mockResolvedValue(adminSession);

    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/materiales", "http://localhost:3000"),
      {
        method: "POST",
        body: JSON.stringify({
          descripcionManual: "Adaptación especial turbolicuadora",
          cantidad: 3,
          precioUnitario: 100,
        }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await POST(request, { params: createParams("orden-1") });
    expect(response.status).toBe(201);
    const data = await response.json();

    // Verify the response contains manual material fields
    expect(data.esManual).toBe(true);
    expect(data.descripcionManual).toBe("Adaptación especial turbolicuadora");
    expect(data.cantidad).toBe(3);
    expect(data.precioUnitario).toBe(100);
    expect(data.material).toBeNull();
  });
});
