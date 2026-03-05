import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import {
  supabase,
  AVATARS_BUCKET,
  generateAvatarPath,
  getAvatarPublicUrl,
} from "@/lib/supabase/client";

type RouteParams = Promise<{ id: string }>;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

// POST /api/usuarios/[id]/avatar — Subir/cambiar foto de perfil
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: userId } = await params;

    // RBAC: solo el propio usuario o SUPER_ADMIN
    if (session.user.id !== userId && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para cambiar este avatar" },
        { status: 403 }
      );
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Parsear FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se recibió archivo" },
        { status: 400 }
      );
    }

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Tipo de archivo no permitido: ${file.type}. Permitidos: JPG, PNG, WebP`,
        },
        { status: 400 }
      );
    }

    // Validar tamaño
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "El archivo excede el tamaño máximo de 2MB" },
        { status: 400 }
      );
    }

    // Generar path y subir a Supabase
    const filePath = generateAvatarPath(userId, file.name);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading avatar to Supabase:", uploadError);
      return NextResponse.json(
        { error: `Error al subir avatar: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Obtener URL pública
    const avatarUrl = getAvatarPublicUrl(filePath);

    // Actualizar usuario en BD
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { error: "Error al subir avatar" },
      { status: 500 }
    );
  }
}

// DELETE /api/usuarios/[id]/avatar — Quitar foto de perfil
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: userId } = await params;

    // RBAC: solo el propio usuario o SUPER_ADMIN
    if (session.user.id !== userId && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar este avatar" },
        { status: 403 }
      );
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, avatarUrl: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Eliminar de Supabase Storage si tiene avatar
    if (user.avatarUrl) {
      const urlParts = user.avatarUrl.split(`${AVATARS_BUCKET}/`);
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const { error: deleteError } = await supabase.storage
          .from(AVATARS_BUCKET)
          .remove([filePath]);

        if (deleteError) {
          console.error("Error deleting avatar from Supabase:", deleteError);
        }
      }
    }

    // Limpiar en BD
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting avatar:", error);
    return NextResponse.json(
      { error: "Error al eliminar avatar" },
      { status: 500 }
    );
  }
}
