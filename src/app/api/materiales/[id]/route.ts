import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = Promise<{ id: string }>;

const CATEGORIAS_VALIDAS = ["REFACCION", "CONSUMIBLE", "HERRAMIENTA"];

// GET /api/materiales/[id] - Obtener un material por ID
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

    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        usos: {
          select: {
            id: true,
            cantidad: true,
            precioUnitario: true,
            createdAt: true,
            orden: {
              select: {
                id: true,
                folio: true,
                estado: true,
                cliente: {
                  select: {
                    nombre: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: {
          select: { usos: true },
        },
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    // Agregar flag de stock bajo
    const materialConAlerta = {
      ...material,
      stockBajo: material.stockActual < material.stockMinimo,
    };

    return NextResponse.json(materialConAlerta);
  } catch (error) {
    console.error("Error fetching material:", error);
    return NextResponse.json(
      { error: "Error al obtener material" },
      { status: 500 }
    );
  }
}

// PATCH /api/materiales/[id] - Actualizar material
export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo admins y refacciones pueden editar materiales
    const allowedRoles = ["SUPER_ADMIN", "COORD_SERVICIO", "REFACCIONES"];
    if (!allowedRoles.includes(session.user.role as string)) {
      return NextResponse.json(
        { error: "No tienes permisos para editar materiales" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Verificar que el material existe
    const materialExistente = await prisma.material.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!materialExistente) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    // Validar categoría si se proporciona
    if (body.categoria && !CATEGORIAS_VALIDAS.includes(body.categoria)) {
      return NextResponse.json(
        { error: `Categoría inválida. Válidas: ${CATEGORIAS_VALIDAS.join(", ")}` },
        { status: 400 }
      );
    }

    // Preparar datos de actualización
    const updateData: Prisma.MaterialUpdateInput = {};

    if (body.sku !== undefined) {
      updateData.sku = body.sku.toUpperCase().trim();
    }
    if (body.nombre !== undefined) {
      updateData.nombre = body.nombre.trim();
    }
    if (body.descripcion !== undefined) {
      updateData.descripcion = body.descripcion?.trim() || null;
    }
    if (body.categoria !== undefined) {
      updateData.categoria = body.categoria;
    }
    if (body.stockActual !== undefined) {
      updateData.stockActual = body.stockActual;
    }
    if (body.stockMinimo !== undefined) {
      updateData.stockMinimo = body.stockMinimo;
    }
    if (body.precioCompra !== undefined) {
      updateData.precioCompra = body.precioCompra;
    }
    if (body.precioVenta !== undefined) {
      updateData.precioVenta = body.precioVenta;
    }
    if (body.activo !== undefined) {
      updateData.activo = body.activo;
    }

    // Actualizar material
    const material = await prisma.material.update({
      where: { id },
      data: updateData,
    });

    // Agregar flag de stock bajo
    const materialConAlerta = {
      ...material,
      stockBajo: material.stockActual < material.stockMinimo,
    };

    return NextResponse.json(materialConAlerta);
  } catch (error) {
    console.error("Error updating material:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe un material con ese SKU" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Error al actualizar material" },
      { status: 500 }
    );
  }
}

// DELETE /api/materiales/[id] - Eliminar material
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo admins pueden eliminar materiales
    const allowedRoles = ["SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role as string)) {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar materiales" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verificar que el material existe
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        _count: {
          select: { usos: true },
        },
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    // No permitir eliminar si tiene usos en órdenes
    if (material._count.usos > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar el material porque se ha usado en ${material._count.usos} orden(es)`,
        },
        { status: 400 }
      );
    }

    // Eliminar material
    await prisma.material.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Material eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting material:", error);
    return NextResponse.json(
      { error: "Error al eliminar material" },
      { status: 500 }
    );
  }
}
