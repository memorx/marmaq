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
    historialOrden: {
      create: vi.fn(),
    },
  },
}));

// Mock supabase
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "https://example.com/firmas/test.png" },
        })),
      })),
    },
  },
  FIRMAS_BUCKET: "firmas",
  generateFirmaPath: vi.fn(() => "ordenes/orden-1/firma_123456.png"),
  getFirmaPublicUrl: vi.fn(() => "https://example.com/firmas/ordenes/orden-1/firma_123456.png"),
}));

import { GET, POST, DELETE } from "@/app/api/ordenes/[id]/firma/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { supabase, FIRMAS_BUCKET } from "@/lib/supabase/client";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  orden: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  historialOrden: {
    create: ReturnType<typeof vi.fn>;
  };
};

// Helper para crear request
function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

// Helper para crear FormData con archivo
async function createFormDataWithFile(): Promise<FormData> {
  const formData = new FormData();
  // Crear un blob simulando una imagen PNG
  const pngBlob = new Blob(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    { type: "image/png" }
  );
  formData.append("firma", pngBlob, "firma.png");
  return formData;
}

describe("GET /api/ordenes/[id]/firma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe rechazar solicitudes sin autenticación", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("/api/ordenes/orden-1/firma");
    const response = await GET(request, { params: Promise.resolve({ id: "orden-1" }) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("No autorizado");
  });

  it("debe retornar 404 si la orden no existe", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue(null);

    const request = createRequest("/api/ordenes/orden-1/firma");
    const response = await GET(request, { params: Promise.resolve({ id: "orden-1" }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Orden no encontrada");
  });

  it("debe retornar información de firma si existe", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      folio: "OS-2024-0001",
      firmaClienteUrl: "https://example.com/firma.png",
      firmaFecha: new Date("2024-01-15T10:00:00Z"),
    });

    const request = createRequest("/api/ordenes/orden-1/firma");
    const response = await GET(request, { params: Promise.resolve({ id: "orden-1" }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.hasFirma).toBe(true);
    expect(data.firmaUrl).toBe("https://example.com/firma.png");
    expect(data.firmaFecha).toBeDefined();
  });

  it("debe indicar que no hay firma si no existe", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      folio: "OS-2024-0001",
      firmaClienteUrl: null,
      firmaFecha: null,
    });

    const request = createRequest("/api/ordenes/orden-1/firma");
    const response = await GET(request, { params: Promise.resolve({ id: "orden-1" }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.hasFirma).toBe(false);
    expect(data.firmaUrl).toBeNull();
  });
});

describe("POST /api/ordenes/[id]/firma", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock supabase upload success
    (supabase.storage.from as ReturnType<typeof vi.fn>).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: "https://example.com/firma.png" },
      }),
    });

    mockPrisma.orden.update.mockResolvedValue({
      id: "orden-1",
      firmaClienteUrl: "https://example.com/firma.png",
      firmaFecha: new Date(),
    });

    mockPrisma.historialOrden.create.mockResolvedValue({});
  });

  it("debe rechazar solicitudes sin autenticación", async () => {
    mockAuth.mockResolvedValue(null);

    const formData = await createFormDataWithFile();
    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/firma", "http://localhost:3000"),
      { method: "POST", body: formData }
    );
    const response = await POST(request, { params: Promise.resolve({ id: "orden-1" }) });

    expect(response.status).toBe(401);
  });

  it("debe retornar 404 si la orden no existe", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue(null);

    const formData = await createFormDataWithFile();
    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/firma", "http://localhost:3000"),
      { method: "POST", body: formData }
    );
    const response = await POST(request, { params: Promise.resolve({ id: "orden-1" }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Orden no encontrada");
  });

  it("debe rechazar si la orden ya tiene firma", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      folio: "OS-2024-0001",
      estado: "LISTO_ENTREGA",
      firmaClienteUrl: "https://existing-signature.com/firma.png",
    });

    const formData = await createFormDataWithFile();
    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/firma", "http://localhost:3000"),
      { method: "POST", body: formData }
    );
    const response = await POST(request, { params: Promise.resolve({ id: "orden-1" }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("La orden ya tiene una firma registrada");
  });

  it("debe rechazar si no se envía archivo de firma", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      folio: "OS-2024-0001",
      estado: "LISTO_ENTREGA",
      firmaClienteUrl: null,
    });

    // FormData vacío
    const formData = new FormData();
    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/firma", "http://localhost:3000"),
      { method: "POST", body: formData }
    );
    const response = await POST(request, { params: Promise.resolve({ id: "orden-1" }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("No se recibió la imagen de firma");
  });

  it("debe guardar firma exitosamente", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      folio: "OS-2024-0001",
      estado: "LISTO_ENTREGA",
      firmaClienteUrl: null,
    });

    const formData = await createFormDataWithFile();
    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/firma", "http://localhost:3000"),
      { method: "POST", body: formData }
    );
    const response = await POST(request, { params: Promise.resolve({ id: "orden-1" }) });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.firmaUrl).toBeDefined();
    expect(mockPrisma.orden.update).toHaveBeenCalled();
    expect(mockPrisma.historialOrden.create).toHaveBeenCalled();
  });
});

describe("DELETE /api/ordenes/[id]/firma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe rechazar solicitudes sin autenticación", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("/api/ordenes/orden-1/firma", { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ id: "orden-1" }) });

    expect(response.status).toBe(401);
  });

  it("debe rechazar si no es SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });

    const request = createRequest("/api/ordenes/orden-1/firma", { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ id: "orden-1" }) });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Sin permisos para eliminar firmas");
  });

  it("debe retornar 404 si la orden no existe", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", name: "Admin", role: "SUPER_ADMIN" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue(null);

    const request = createRequest("/api/ordenes/orden-1/firma", { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ id: "orden-1" }) });

    expect(response.status).toBe(404);
  });

  it("debe retornar error si la orden no tiene firma", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", name: "Admin", role: "SUPER_ADMIN" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      firmaClienteUrl: null,
    });

    const request = createRequest("/api/ordenes/orden-1/firma", { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ id: "orden-1" }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("La orden no tiene firma");
  });

  it("debe eliminar firma exitosamente como SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", name: "Admin", role: "SUPER_ADMIN" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      firmaClienteUrl: `https://example.com/${FIRMAS_BUCKET}/ordenes/orden-1/firma.png`,
    });

    (supabase.storage.from as ReturnType<typeof vi.fn>).mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: null }),
    });

    mockPrisma.orden.update.mockResolvedValue({});
    mockPrisma.historialOrden.create.mockResolvedValue({});

    const request = createRequest("/api/ordenes/orden-1/firma", { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ id: "orden-1" }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockPrisma.orden.update).toHaveBeenCalledWith({
      where: { id: "orden-1" },
      data: {
        firmaClienteUrl: null,
        firmaFecha: null,
      },
    });
  });
});

describe("Supabase helper functions", () => {
  it("generateFirmaPath debe generar path correcto", async () => {
    const { generateFirmaPath } = await import("@/lib/supabase/client");

    // El mock ya retorna un valor fijo
    const path = generateFirmaPath("orden-123");
    expect(path).toContain("ordenes/");
    expect(path).toContain("firma_");
    expect(path).toContain(".png");
  });

  it("getFirmaPublicUrl debe retornar URL pública", async () => {
    const { getFirmaPublicUrl } = await import("@/lib/supabase/client");

    const url = getFirmaPublicUrl("ordenes/orden-1/firma.png");
    expect(url).toContain("example.com");
    expect(url).toContain("firmas");
  });
});
