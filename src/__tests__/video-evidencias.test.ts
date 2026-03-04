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
    evidencia: {
      create: vi.fn(),
      findMany: vi.fn(),
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
        upload: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
  },
  EVIDENCIAS_BUCKET: "evidencias",
  generateEvidenciaPath: vi.fn((_ordenId: string, _tipo: string, filename: string) => `ordenes/test/${filename}`),
  getEvidenciaPublicUrl: vi.fn((path: string) => `https://example.com/storage/${path}`),
}));

import { POST } from "@/app/api/ordenes/[id]/evidencias/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  orden: { findUnique: ReturnType<typeof vi.fn> };
  evidencia: { create: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  historialOrden: { create: ReturnType<typeof vi.fn> };
};

function createParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id });
}

function createUploadRequest(files: { name: string; type: string; size: number }[], tipo = "DIAGNOSTICO"): NextRequest {
  // Create mock file objects with controlled name, type, size, and arrayBuffer
  const mockFiles = files.map((f) => ({
    name: f.name,
    type: f.type,
    size: f.size,
    arrayBuffer: async () => new ArrayBuffer(8),
  }));

  const request = new NextRequest(
    new URL("http://localhost:3000/api/ordenes/orden-1/evidencias"),
    { method: "POST" }
  );

  // Mock formData() so the handler receives our exact objects with correct size/name
  vi.spyOn(request, "formData").mockResolvedValue({
    get: (key: string) => {
      if (key === "tipo") return tipo;
      return null;
    },
    getAll: (key: string) => {
      if (key === "files") return mockFiles;
      return [];
    },
  } as unknown as FormData);

  return request;
}

const mockOrden = {
  id: "orden-1",
  folio: "OS-2026-03-001",
  tecnicoId: "tec-1",
  creadoPorId: "admin-1",
};

describe("POST /api/ordenes/[id]/evidencias — video support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", name: "Admin", role: "SUPER_ADMIN" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue(mockOrden);
    mockPrisma.evidencia.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "ev-" + Math.random().toString(36).slice(2, 8),
      ordenId: data.ordenId,
      tipo: data.tipo,
      url: data.url,
      filename: data.filename,
      descripcion: data.descripcion,
      esVideo: data.esVideo || false,
      createdAt: new Date(),
    }));
    mockPrisma.historialOrden.create.mockResolvedValue({});
  });

  it("acepta video MP4", async () => {
    const request = createUploadRequest([
      { name: "video.mp4", type: "video/mp4", size: 20 * 1024 * 1024 },
    ]);
    const params = createParams("orden-1");

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.evidencias).toHaveLength(1);
    expect(data.evidencias[0].esVideo).toBe(true);
    expect(data.evidencias[0].filename).toBe("video.mp4");
  });

  it("acepta video MOV (QuickTime)", async () => {
    const request = createUploadRequest([
      { name: "clip.mov", type: "video/quicktime", size: 15 * 1024 * 1024 },
    ]);
    const params = createParams("orden-1");

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.evidencias).toHaveLength(1);
    expect(data.evidencias[0].esVideo).toBe(true);
  });

  it("acepta video WebM", async () => {
    const request = createUploadRequest([
      { name: "clip.webm", type: "video/webm", size: 5 * 1024 * 1024 },
    ]);
    const params = createParams("orden-1");

    const response = await POST(request, { params });

    expect(response.status).toBe(201);
  });

  it("rechaza video mayor a 50MB", async () => {
    const request = createUploadRequest([
      { name: "huge.mp4", type: "video/mp4", size: 60 * 1024 * 1024 },
    ]);
    const params = createParams("orden-1");

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("video es muy grande");
    expect(data.error).toContain("50MB");
  });

  it("sigue aceptando imágenes normalmente", async () => {
    const request = createUploadRequest([
      { name: "foto.jpg", type: "image/jpeg", size: 2 * 1024 * 1024 },
    ]);
    const params = createParams("orden-1");

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.evidencias).toHaveLength(1);
    expect(data.evidencias[0].esVideo).toBe(false);
  });

  it("rechaza imágenes mayores a 10MB", async () => {
    const request = createUploadRequest([
      { name: "huge.jpg", type: "image/jpeg", size: 15 * 1024 * 1024 },
    ]);
    const params = createParams("orden-1");

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Máximo 10MB");
  });

  it("rechaza formatos no permitidos (.exe)", async () => {
    const request = createUploadRequest([
      { name: "malware.exe", type: "application/x-msdownload", size: 1024 },
    ]);
    const params = createParams("orden-1");

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("no permitido");
  });

  it("rechaza PDF", async () => {
    const request = createUploadRequest([
      { name: "doc.pdf", type: "application/pdf", size: 1024 },
    ]);
    const params = createParams("orden-1");

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("no permitido");
  });

  it("acepta mezcla de fotos y videos", async () => {
    const request = createUploadRequest([
      { name: "foto.jpg", type: "image/jpeg", size: 2 * 1024 * 1024 },
      { name: "clip.mp4", type: "video/mp4", size: 20 * 1024 * 1024 },
    ]);
    const params = createParams("orden-1");

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.evidencias).toHaveLength(2);
    // First is photo, second is video
    const foto = data.evidencias.find((e: { filename: string }) => e.filename === "foto.jpg");
    const video = data.evidencias.find((e: { filename: string }) => e.filename === "clip.mp4");
    expect(foto.esVideo).toBe(false);
    expect(video.esVideo).toBe(true);
  });
});
