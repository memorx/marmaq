import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

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
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    historialOrden: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock lucide-react for component tests
vi.mock("lucide-react", () => ({
  Package: () => <span data-testid="package-icon">Package</span>,
  Plus: () => <span data-testid="plus-icon">Plus</span>,
  Trash2: () => <span data-testid="trash-icon">Trash2</span>,
  X: () => <span>X</span>,
  Search: () => <span>Search</span>,
  PenLine: () => <span>PenLine</span>,
}));

import { POST } from "@/app/api/ordenes/[id]/materiales/route";
import { DELETE } from "@/app/api/ordenes/[id]/materiales/[materialUsadoId]/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { AgregarMaterialModal } from "@/components/ordenes/AgregarMaterialModal";
import { MaterialesCard } from "@/components/ordenes/MaterialesCard";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  orden: { findUnique: ReturnType<typeof vi.fn> };
  material: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  materialUsado: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  historialOrden: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function createParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id });
}

function createDeleteParams(
  id: string,
  materialUsadoId: string
): Promise<{ id: string; materialUsadoId: string }> {
  return Promise.resolve({ id, materialUsadoId });
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

const unassignedTecnicoSession = {
  user: { id: "tech-other", name: "Other Tech", role: "TECNICO" },
};

describe("POST /api/ordenes/[id]/materiales", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.orden.findUnique.mockResolvedValue(mockOrden);
    mockPrisma.material.findUnique.mockResolvedValue(mockMaterial);
  });

  it("crea MaterialUsado correctamente (201)", async () => {
    const createdMU = {
      id: "mu-1",
      ordenId: "orden-1",
      materialId: "mat-1",
      cantidad: 3,
      precioUnitario: 15.5,
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

    const request = createRequest("/api/ordenes/orden-1/materiales", {
      method: "POST",
      body: JSON.stringify({ materialId: "mat-1", cantidad: 3 }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: createParams("orden-1") });
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.materialId).toBe("mat-1");
    expect(data.cantidad).toBe(3);
  });

  it("actualiza stock (decrementa material.stockActual)", async () => {
    let materialUpdateArgs: unknown = null;
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        materialUsado: {
          create: vi.fn().mockResolvedValue({
            id: "mu-1",
            ordenId: "orden-1",
            materialId: "mat-1",
            cantidad: 5,
            precioUnitario: 15.5,
            material: mockMaterial,
          }),
        },
        material: {
          update: vi.fn().mockImplementation((args: unknown) => {
            materialUpdateArgs = args;
            return {};
          }),
        },
        historialOrden: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });
    mockAuth.mockResolvedValue(adminSession);

    const request = createRequest("/api/ordenes/orden-1/materiales", {
      method: "POST",
      body: JSON.stringify({ materialId: "mat-1", cantidad: 5 }),
      headers: { "Content-Type": "application/json" },
    });

    await POST(request, { params: createParams("orden-1") });
    expect(materialUpdateArgs).toEqual({
      where: { id: "mat-1" },
      data: { stockActual: { decrement: 5 } },
    });
  });

  it("retorna 400 con materialId inválido", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockPrisma.material.findUnique.mockResolvedValue(null);

    const request = createRequest("/api/ordenes/orden-1/materiales", {
      method: "POST",
      body: JSON.stringify({ materialId: "no-existe", cantidad: 1 }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: createParams("orden-1") });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("no encontrado");
  });

  it("retorna 401 sin autenticación", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("/api/ordenes/orden-1/materiales", {
      method: "POST",
      body: JSON.stringify({ materialId: "mat-1", cantidad: 1 }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: createParams("orden-1") });
    expect(response.status).toBe(401);
  });

  it("retorna 403 para TECNICO no asignado", async () => {
    mockAuth.mockResolvedValue(unassignedTecnicoSession);

    const request = createRequest("/api/ordenes/orden-1/materiales", {
      method: "POST",
      body: JSON.stringify({ materialId: "mat-1", cantidad: 1 }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: createParams("orden-1") });
    expect(response.status).toBe(403);
  });
});

describe("DELETE /api/ordenes/[id]/materiales/[materialUsadoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.orden.findUnique.mockResolvedValue(mockOrden);
  });

  it("restaura stock (incrementa material.stockActual)", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const mockMU = {
      id: "mu-1",
      ordenId: "orden-1",
      materialId: "mat-1",
      cantidad: 3,
      material: { id: "mat-1", nombre: "Tornillo M8" },
    };
    mockPrisma.materialUsado.findFirst.mockResolvedValue(mockMU);

    let materialUpdateArgs: unknown = null;
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        material: {
          update: vi.fn().mockImplementation((args: unknown) => {
            materialUpdateArgs = args;
            return {};
          }),
        },
        materialUsado: { delete: vi.fn().mockResolvedValue({}) },
        historialOrden: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const request = createRequest(
      "/api/ordenes/orden-1/materiales/mu-1",
      { method: "DELETE" }
    );
    const response = await DELETE(request, {
      params: createDeleteParams("orden-1", "mu-1"),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(materialUpdateArgs).toEqual({
      where: { id: "mat-1" },
      data: { stockActual: { increment: 3 } },
    });
  });
});

describe("AgregarMaterialModal", () => {
  it("muestra input de búsqueda cuando está abierto", () => {
    render(
      <AgregarMaterialModal
        isOpen={true}
        onClose={vi.fn()}
        ordenId="orden-1"
        onSuccess={vi.fn()}
      />
    );

    expect(
      screen.getByPlaceholderText("Buscar material por nombre o SKU...")
    ).toBeInTheDocument();
  });
});

describe("MaterialesCard", () => {
  it("muestra botón Agregar con onClick cuando canEdit es true", () => {
    render(
      <MaterialesCard
        materialesUsados={[]}
        ordenId="orden-1"
        canEdit={true}
        onMaterialChanged={vi.fn()}
      />
    );

    const button = screen.getByText("Agregar");
    expect(button).toBeInTheDocument();
  });
});
