import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { supabase, FIRMAS_BUCKET, generateFirmaPath, generateFirmaFotoPath, getFirmaPublicUrl } from "@/lib/supabase/client";
import { canAccessOrden, canViewOrden, unauthorizedResponse } from "@/lib/auth/authorize";

type RouteParams = Promise<{ id: string }>;

const FIRMA_FOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FIRMA_FOTO_MAX_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/ordenes/[id]/firma - Guardar firma del cliente (digital o foto)
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
      select: {
        id: true,
        folio: true,
        estado: true,
        firmaClienteUrl: true,
        firmaFotoUrl: true,
        tecnicoId: true,
        creadoPorId: true,
      },
    });

    if (!orden) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    if (!canAccessOrden(session, orden)) {
      return unauthorizedResponse("No tienes permisos para acceder a esta orden");
    }

    // Parsear FormData
    const formData = await request.formData();
    const firmaFotoFile = formData.get("firmaFoto") as File | null;
    const firmaFile = formData.get("firma") as File | null;

    // === FOTO DE FIRMA EN PAPEL ===
    if (firmaFotoFile) {
      // Validar tipo de archivo
      if (!FIRMA_FOTO_TYPES.includes(firmaFotoFile.type)) {
        return NextResponse.json(
          { error: "Formato no válido. Solo se aceptan JPEG, PNG o WebP" },
          { status: 400 }
        );
      }

      // Validar tamaño
      if (firmaFotoFile.size > FIRMA_FOTO_MAX_SIZE) {
        return NextResponse.json(
          { error: "La imagen es muy grande. Máximo 5MB" },
          { status: 400 }
        );
      }

      // Generar path único
      const ext = firmaFotoFile.type.split("/")[1] === "jpeg" ? "jpg" : firmaFotoFile.type.split("/")[1];
      const filePath = generateFirmaFotoPath(ordenId, ext);

      // Convertir File a Buffer
      const arrayBuffer = await firmaFotoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Si ya existe una foto anterior, eliminarla del storage
      if (orden.firmaFotoUrl) {
        const urlParts = orden.firmaFotoUrl.split(`${FIRMAS_BUCKET}/`);
        if (urlParts.length > 1) {
          await supabase.storage
            .from(FIRMAS_BUCKET)
            .remove([urlParts[1]]);
        }
      }

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(FIRMAS_BUCKET)
        .upload(filePath, buffer, {
          contentType: firmaFotoFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Error uploading firma foto to Supabase:", uploadError);
        return NextResponse.json(
          { error: `Error al subir la foto de firma: ${uploadError.message}` },
          { status: 500 }
        );
      }

      // Obtener URL pública
      const firmaFotoUrl = getFirmaPublicUrl(filePath);

      // Actualizar orden
      await prisma.orden.update({
        where: { id: ordenId },
        data: { firmaFotoUrl },
      });

      // Registrar en historial
      await prisma.historialOrden.create({
        data: {
          ordenId,
          usuarioId: session.user.id,
          accion: "ORDEN_EDITADA",
          detalles: {
            campo: "firmaFoto",
            descripcion: "Foto de firma en papel subida",
          },
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Foto de firma guardada exitosamente",
          firmaFotoUrl,
        },
        { status: 201 }
      );
    }

    // === FIRMA DIGITAL (comportamiento original) ===
    if (firmaFile) {
      // Verificar si ya tiene firma digital (write-once)
      if (orden.firmaClienteUrl) {
        return NextResponse.json(
          { error: "La orden ya tiene una firma registrada" },
          { status: 400 }
        );
      }

      // Validar tipo de archivo
      if (!firmaFile.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "El archivo debe ser una imagen" },
          { status: 400 }
        );
      }

      // Validar tamaño (máximo 2MB para una firma)
      const maxSize = 2 * 1024 * 1024;
      if (firmaFile.size > maxSize) {
        return NextResponse.json(
          { error: "La imagen de firma es muy grande. Máximo 2MB" },
          { status: 400 }
        );
      }

      // Generar path único
      const filePath = generateFirmaPath(ordenId);

      // Convertir File a Buffer
      const arrayBuffer = await firmaFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(FIRMAS_BUCKET)
        .upload(filePath, buffer, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        console.error("Error uploading firma to Supabase:", uploadError);
        return NextResponse.json(
          { error: `Error al subir la firma: ${uploadError.message}` },
          { status: 500 }
        );
      }

      // Obtener URL pública
      const firmaUrl = getFirmaPublicUrl(filePath);

      // Actualizar orden con la firma
      const firmaFecha = new Date();
      await prisma.orden.update({
        where: { id: ordenId },
        data: {
          firmaClienteUrl: firmaUrl,
          firmaFecha,
        },
      });

      // Registrar en historial
      await prisma.historialOrden.create({
        data: {
          ordenId,
          usuarioId: session.user.id,
          accion: "ORDEN_EDITADA",
          detalles: {
            campo: "firma",
            descripcion: "Firma del cliente capturada",
          },
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Firma guardada exitosamente",
          firmaUrl,
          firmaFecha: firmaFecha.toISOString(),
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: "No se recibió la imagen de firma" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error saving firma:", error);
    return NextResponse.json(
      { error: "Error al guardar la firma" },
      { status: 500 }
    );
  }
}

// GET /api/ordenes/[id]/firma - Obtener información de la firma
export async function GET(
  _request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: ordenId } = await params;

    const orden = await prisma.orden.findUnique({
      where: { id: ordenId },
      select: {
        id: true,
        folio: true,
        firmaClienteUrl: true,
        firmaFotoUrl: true,
        firmaFecha: true,
        tecnicoId: true,
        creadoPorId: true,
      },
    });

    if (!orden) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    if (!canViewOrden(session, orden)) {
      return unauthorizedResponse("No tienes permisos para ver esta orden");
    }

    return NextResponse.json({
      hasFirma: !!orden.firmaClienteUrl,
      firmaUrl: orden.firmaClienteUrl,
      hasFirmaFoto: !!orden.firmaFotoUrl,
      firmaFotoUrl: orden.firmaFotoUrl,
      firmaFecha: orden.firmaFecha,
    });
  } catch (error) {
    console.error("Error fetching firma:", error);
    return NextResponse.json(
      { error: "Error al obtener información de la firma" },
      { status: 500 }
    );
  }
}

// DELETE /api/ordenes/[id]/firma - Eliminar firma (solo admin)
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

    const orden = await prisma.orden.findUnique({
      where: { id: ordenId },
      select: {
        id: true,
        firmaClienteUrl: true,
        firmaFotoUrl: true,
        tecnicoId: true,
        creadoPorId: true,
      },
    });

    if (!orden) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    if (!canAccessOrden(session, orden)) {
      return unauthorizedResponse("No tienes permisos para acceder a esta orden");
    }

    // Solo SUPER_ADMIN puede eliminar firmas
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Sin permisos para eliminar firmas" },
        { status: 403 }
      );
    }

    const tipo = request.nextUrl.searchParams.get("tipo");

    if (tipo === "foto") {
      // Eliminar foto de firma en papel
      if (!orden.firmaFotoUrl) {
        return NextResponse.json(
          { error: "La orden no tiene foto de firma" },
          { status: 400 }
        );
      }

      // Eliminar del storage
      const urlParts = orden.firmaFotoUrl.split(`${FIRMAS_BUCKET}/`);
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const { error: deleteError } = await supabase.storage
          .from(FIRMAS_BUCKET)
          .remove([filePath]);

        if (deleteError) {
          console.error("Error deleting firma foto from Supabase:", deleteError);
        }
      }

      await prisma.orden.update({
        where: { id: ordenId },
        data: { firmaFotoUrl: null },
      });

      await prisma.historialOrden.create({
        data: {
          ordenId,
          usuarioId: session.user.id,
          accion: "ORDEN_EDITADA",
          detalles: {
            campo: "firmaFoto",
            descripcion: "Foto de firma en papel eliminada por administrador",
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Foto de firma eliminada exitosamente",
      });
    }

    // Comportamiento por defecto: eliminar firma digital
    if (!orden.firmaClienteUrl) {
      return NextResponse.json(
        { error: "La orden no tiene firma" },
        { status: 400 }
      );
    }

    // Extraer el path del archivo de la URL
    const urlParts = orden.firmaClienteUrl.split(`${FIRMAS_BUCKET}/`);
    if (urlParts.length > 1) {
      const filePath = urlParts[1];

      // Eliminar de Supabase Storage
      const { error: deleteError } = await supabase.storage
        .from(FIRMAS_BUCKET)
        .remove([filePath]);

      if (deleteError) {
        console.error("Error deleting firma from Supabase:", deleteError);
      }
    }

    // Actualizar orden
    await prisma.orden.update({
      where: { id: ordenId },
      data: {
        firmaClienteUrl: null,
        firmaFecha: null,
      },
    });

    // Registrar en historial
    await prisma.historialOrden.create({
      data: {
        ordenId,
        usuarioId: session.user.id,
        accion: "ORDEN_EDITADA",
        detalles: {
          campo: "firma",
          descripcion: "Firma eliminada por administrador",
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Firma eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error deleting firma:", error);
    return NextResponse.json(
      { error: "Error al eliminar la firma" },
      { status: 500 }
    );
  }
}
