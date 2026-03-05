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
          data: { publicUrl: "https://example.com/firmas/test.jpg" },
        })),
      })),
    },
  },
  FIRMAS_BUCKET: "firmas",
  generateFirmaPath: vi.fn(() => "ordenes/orden-1/firma_123456.png"),
  generateFirmaFotoPath: vi.fn(() => "ordenes/orden-1/firma_foto_123456.jpg"),
  getFirmaPublicUrl: vi.fn(() => "https://example.com/firmas/ordenes/orden-1/firma_foto_123456.jpg"),
}));

import { POST, DELETE } from "@/app/api/ordenes/[id]/firma/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { supabase } from "@/lib/supabase/client";

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

// Helper para crear FormData con foto de firma
function createFormDataWithFirmaFoto(
  type = "image/jpeg",
  size?: number
): FormData {
  const formData = new FormData();
  const content = size
    ? new Uint8Array(size)
    : new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG header
  const blob = new Blob([content], { type });
  formData.append("firmaFoto", blob, "firma_papel.jpg");
  return formData;
}

describe("POST /api/ordenes/[id]/firma — Foto de firma en papel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (supabase.storage.from as ReturnType<typeof vi.fn>).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: "https://example.com/firmas/test.jpg" },
      }),
    });

    mockPrisma.orden.update.mockResolvedValue({
      id: "orden-1",
      firmaFotoUrl: "https://example.com/firmas/ordenes/orden-1/firma_foto_123456.jpg",
    });

    mockPrisma.historialOrden.create.mockResolvedValue({});
  });

  it("debe subir foto de firma correctamente → 201 + firmaFotoUrl", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      folio: "OS-2024-0001",
      estado: "LISTO_ENTREGA",
      firmaClienteUrl: null,
      firmaFotoUrl: null,
      tecnicoId: "user-1",
      creadoPorId: "admin-1",
    });

    const formData = createFormDataWithFirmaFoto("image/jpeg");
    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/firma", "http://localhost:3000"),
      { method: "POST", body: formData }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "orden-1" }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.firmaFotoUrl).toBeDefined();
    expect(mockPrisma.orden.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "orden-1" },
        data: expect.objectContaining({ firmaFotoUrl: expect.any(String) }),
      })
    );
    expect(mockPrisma.historialOrden.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          detalles: expect.objectContaining({
            campo: "firmaFoto",
            descripcion: "Foto de firma en papel subida",
          }),
        }),
      })
    );
  });

  it("debe rechazar archivo >5MB → 400", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      folio: "OS-2024-0001",
      estado: "LISTO_ENTREGA",
      firmaClienteUrl: null,
      firmaFotoUrl: null,
      tecnicoId: "user-1",
      creadoPorId: "admin-1",
    });

    // 6MB file
    const formData = createFormDataWithFirmaFoto(
      "image/jpeg",
      6 * 1024 * 1024
    );
    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/firma", "http://localhost:3000"),
      { method: "POST", body: formData }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "orden-1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("5MB");
  });

  it("debe rechazar formato no imagen → 400", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      folio: "OS-2024-0001",
      estado: "LISTO_ENTREGA",
      firmaClienteUrl: null,
      firmaFotoUrl: null,
      tecnicoId: "user-1",
      creadoPorId: "admin-1",
    });

    const formData = new FormData();
    const blob = new Blob(["test content"], { type: "application/pdf" });
    formData.append("firmaFoto", blob, "documento.pdf");

    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/firma", "http://localhost:3000"),
      { method: "POST", body: formData }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "orden-1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Formato no válido");
  });

  it("debe rechazar sin autenticación → 401", async () => {
    mockAuth.mockResolvedValue(null);

    const formData = createFormDataWithFirmaFoto("image/jpeg");
    const request = new NextRequest(
      new URL("/api/ordenes/orden-1/firma", "http://localhost:3000"),
      { method: "POST", body: formData }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "orden-1" }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("No autorizado");
  });
});

describe("DELETE /api/ordenes/[id]/firma?tipo=foto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe eliminar firmaFotoUrl con ?tipo=foto → 200", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", name: "Admin", role: "SUPER_ADMIN" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      firmaClienteUrl: null,
      firmaFotoUrl: "https://example.com/firmas/ordenes/orden-1/firma_foto.jpg",
      tecnicoId: "admin-1",
      creadoPorId: "admin-1",
    });

    (supabase.storage.from as ReturnType<typeof vi.fn>).mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: null }),
    });

    mockPrisma.orden.update.mockResolvedValue({});
    mockPrisma.historialOrden.create.mockResolvedValue({});

    const request = new NextRequest(
      new URL(
        "/api/ordenes/orden-1/firma?tipo=foto",
        "http://localhost:3000"
      ),
      { method: "DELETE" }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "orden-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockPrisma.orden.update).toHaveBeenCalledWith({
      where: { id: "orden-1" },
      data: { firmaFotoUrl: null },
    });
  });
});
