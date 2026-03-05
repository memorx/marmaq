import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
          data: { publicUrl: "https://example.com/avatars/user-1.png" },
        })),
      })),
    },
  },
  AVATARS_BUCKET: "avatars",
  generateAvatarPath: vi.fn(() => "user-1.png"),
  getAvatarPublicUrl: vi.fn(
    () => "https://example.com/avatars/user-1.png"
  ),
}));

import { POST, DELETE } from "@/app/api/usuarios/[id]/avatar/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { supabase } from "@/lib/supabase/client";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

function createFormDataWithImage(
  type = "image/png",
  size = 1024
): FormData {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(size)], { type });
  formData.append("file", blob, "avatar.png");
  return formData;
}

describe("POST /api/usuarios/[id]/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (supabase.storage.from as ReturnType<typeof vi.fn>).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: "https://example.com/avatars/user-1.png" },
      }),
    });

    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    mockPrisma.user.update.mockResolvedValue({
      id: "user-1",
      avatarUrl: "https://example.com/avatars/user-1.png",
    });
  });

  it("sube imagen correctamente y retorna 200 con avatarUrl", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });

    const formData = createFormDataWithImage();
    const request = new NextRequest(
      new URL("/api/usuarios/user-1/avatar", "http://localhost:3000"),
      { method: "POST", body: formData }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "user-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.avatarUrl).toBeDefined();
    expect(mockPrisma.user.update).toHaveBeenCalled();
  });

  it("rechaza archivo mayor a 2MB con 400", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });

    const formData = new FormData();
    // 3MB blob
    const blob = new Blob([new Uint8Array(3 * 1024 * 1024)], {
      type: "image/png",
    });
    formData.append("file", blob, "big.png");

    const request = new NextRequest(
      new URL("/api/usuarios/user-1/avatar", "http://localhost:3000"),
      { method: "POST", body: formData }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "user-1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("2MB");
  });

  it("rechaza formato no permitido (gif) con 400", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(100)], { type: "image/gif" });
    formData.append("file", blob, "avatar.gif");

    const request = new NextRequest(
      new URL("/api/usuarios/user-1/avatar", "http://localhost:3000"),
      { method: "POST", body: formData }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "user-1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("no permitido");
  });

  it("retorna 401 sin autenticación", async () => {
    mockAuth.mockResolvedValue(null);

    const formData = createFormDataWithImage();
    const request = new NextRequest(
      new URL("/api/usuarios/user-1/avatar", "http://localhost:3000"),
      { method: "POST", body: formData }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "user-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("retorna 403 cuando usuario intenta cambiar avatar ajeno (no SUPER_ADMIN)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2", name: "Otro", role: "TECNICO" },
    });

    const formData = createFormDataWithImage();
    const request = new NextRequest(
      new URL("/api/usuarios/user-1/avatar", "http://localhost:3000"),
      { method: "POST", body: formData }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "user-1" }),
    });

    expect(response.status).toBe(403);
  });
});

describe("DELETE /api/usuarios/[id]/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("elimina avatar correctamente y retorna avatarUrl null", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      avatarUrl: "https://example.com/avatars/user-1.png",
    });

    (supabase.storage.from as ReturnType<typeof vi.fn>).mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: null }),
    });

    mockPrisma.user.update.mockResolvedValue({
      id: "user-1",
      avatarUrl: null,
    });

    const request = new NextRequest(
      new URL("/api/usuarios/user-1/avatar", "http://localhost:3000"),
      { method: "DELETE" }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "user-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { avatarUrl: null },
    });
  });
});
