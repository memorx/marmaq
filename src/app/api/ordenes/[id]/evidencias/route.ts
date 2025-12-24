import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { supabase, EVIDENCIAS_BUCKET, generateEvidenciaPath, getEvidenciaPublicUrl } from "@/lib/supabase/client";
import { TipoEvidencia } from "@prisma/client";

type RouteParams = Promise<{ id: string }>;

// Tipos de evidencia válidos
const TIPOS_VALIDOS: TipoEvidencia[] = [
  "RECEPCION",
  "DIAGNOSTICO",
  "REPARACION",
  "ENTREGA",
  "FACTURA",
  "OTRO",
];

// GET /api/ordenes/[id]/evidencias - Listar evidencias de una orden
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const evidencias = await prisma.evidencia.findMany({
      where: { ordenId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(evidencias);
  } catch (error) {
    console.error("Error fetching evidencias:", error);
    return NextResponse.json(
      { error: "Error al obtener evidencias" },
      { status: 500 }
    );
  }
}

// POST /api/ordenes/[id]/evidencias - Subir nuevas evidencias
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: ordenId } = await params;

    // Verificar que la orden existe
    const orden = await prisma.orden.findUnique({
      where: { id: ordenId },
      select: { id: true, folio: true },
    });

    if (!orden) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // Parsear FormData
    const formData = await request.formData();
    const tipo = formData.get("tipo") as TipoEvidencia;
    const descripcion = formData.get("descripcion") as string | null;
    const files = formData.getAll("files") as File[];

    // Validar tipo
    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json(
        { error: `Tipo de evidencia inválido. Válidos: ${TIPOS_VALIDOS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validar que hay archivos
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No se recibieron archivos" },
        { status: 400 }
      );
    }

    // Validar tipos de archivo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipo de archivo no permitido: ${file.type}. Permitidos: JPG, PNG, WebP, HEIC` },
          { status: 400 }
        );
      }
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `Archivo muy grande: ${file.name}. Máximo 10MB` },
          { status: 400 }
        );
      }
    }

    // Subir archivos a Supabase Storage
    const evidenciasCreadas = [];

    for (const file of files) {
      // Generar path único
      const filePath = generateEvidenciaPath(ordenId, tipo, file.name);

      // Convertir File a ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Subir a Supabase
      const { error: uploadError } = await supabase.storage
        .from(EVIDENCIAS_BUCKET)
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Error uploading to Supabase:", uploadError);
        return NextResponse.json(
          { error: `Error al subir ${file.name}: ${uploadError.message}` },
          { status: 500 }
        );
      }

      // Obtener URL pública
      const publicUrl = getEvidenciaPublicUrl(filePath);

      // Crear registro en base de datos
      const evidencia = await prisma.evidencia.create({
        data: {
          ordenId,
          tipo,
          url: publicUrl,
          filename: file.name,
          descripcion: descripcion || null,
        },
      });

      evidenciasCreadas.push(evidencia);
    }

    return NextResponse.json(
      {
        message: `${evidenciasCreadas.length} evidencia(s) subida(s) exitosamente`,
        evidencias: evidenciasCreadas,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading evidencias:", error);
    return NextResponse.json(
      { error: "Error al subir evidencias" },
      { status: 500 }
    );
  }
}

// DELETE /api/ordenes/[id]/evidencias?evidenciaId=xxx - Eliminar una evidencia
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: ordenId } = await params;
    const { searchParams } = new URL(request.url);
    const evidenciaId = searchParams.get("evidenciaId");

    if (!evidenciaId) {
      return NextResponse.json(
        { error: "evidenciaId es requerido" },
        { status: 400 }
      );
    }

    // Buscar la evidencia
    const evidencia = await prisma.evidencia.findFirst({
      where: {
        id: evidenciaId,
        ordenId,
      },
    });

    if (!evidencia) {
      return NextResponse.json(
        { error: "Evidencia no encontrada" },
        { status: 404 }
      );
    }

    // Extraer el path del archivo de la URL
    const urlParts = evidencia.url.split(`${EVIDENCIAS_BUCKET}/`);
    if (urlParts.length > 1) {
      const filePath = urlParts[1];

      // Eliminar de Supabase Storage
      const { error: deleteError } = await supabase.storage
        .from(EVIDENCIAS_BUCKET)
        .remove([filePath]);

      if (deleteError) {
        console.error("Error deleting from Supabase:", deleteError);
        // Continuar aunque falle la eliminación del storage
      }
    }

    // Eliminar registro de la base de datos
    await prisma.evidencia.delete({
      where: { id: evidenciaId },
    });

    return NextResponse.json({ message: "Evidencia eliminada exitosamente" });
  } catch (error) {
    console.error("Error deleting evidencia:", error);
    return NextResponse.json(
      { error: "Error al eliminar evidencia" },
      { status: 500 }
    );
  }
}
