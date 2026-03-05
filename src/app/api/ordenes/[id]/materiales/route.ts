import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { canAccessOrden, unauthorizedResponse } from "@/lib/auth/authorize";

type RouteParams = Promise<{ id: string }>;

const AgregarMaterialCatalogoSchema = z.object({
  materialId: z.string().min(1, "materialId es requerido"),
  cantidad: z.number().int().min(1, "cantidad debe ser al menos 1"),
  precioUnitario: z.number().optional(),
});

const AgregarMaterialManualSchema = z.object({
  descripcionManual: z.string().min(1, "descripcionManual es requerido"),
  cantidad: z.number().int().min(1, "cantidad debe ser al menos 1"),
  precioUnitario: z.number().min(0, "precioUnitario debe ser >= 0"),
});

// POST /api/ordenes/[id]/materiales - Agregar material a orden
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
      select: { id: true, tecnicoId: true, creadoPorId: true },
    });

    if (!orden) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    if (!canAccessOrden(session, orden)) {
      return unauthorizedResponse("No tienes permisos para modificar esta orden");
    }

    const body = await request.json();

    const hasMaterialId = body.materialId !== undefined && body.materialId !== null && body.materialId !== "";
    const hasDescripcionManual = body.descripcionManual !== undefined && body.descripcionManual !== null && body.descripcionManual !== "";

    // Validar que venga uno u otro, no ambos, no ninguno
    if (hasMaterialId && hasDescripcionManual) {
      return NextResponse.json(
        { error: "No se puede enviar materialId y descripcionManual al mismo tiempo" },
        { status: 400 }
      );
    }

    if (!hasMaterialId && !hasDescripcionManual) {
      return NextResponse.json(
        { error: "Se requiere materialId o descripcionManual" },
        { status: 400 }
      );
    }

    // === MATERIAL MANUAL ===
    if (hasDescripcionManual) {
      const parsed = AgregarMaterialManualSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0].message },
          { status: 400 }
        );
      }

      const { descripcionManual, cantidad, precioUnitario } = parsed.data;

      const materialUsado = await prisma.$transaction(async (tx) => {
        const created = await tx.materialUsado.create({
          data: {
            ordenId,
            esManual: true,
            descripcionManual,
            cantidad,
            precioUnitario,
          },
          include: { material: true },
        });

        await tx.historialOrden.create({
          data: {
            ordenId,
            usuarioId: session.user.id,
            accion: "MATERIAL_AGREGADO",
            detalles: {
              materialNombre: `(manual) ${descripcionManual}`,
              cantidad,
              esManual: true,
            },
          },
        });

        return created;
      });

      return NextResponse.json(materialUsado, { status: 201 });
    }

    // === MATERIAL DEL CATÁLOGO ===
    const parsed = AgregarMaterialCatalogoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { materialId, cantidad, precioUnitario } = parsed.data;

    // Verificar que el material existe y tiene stock
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 400 }
      );
    }

    if (material.stockActual < cantidad) {
      return NextResponse.json(
        { error: `Stock insuficiente. Disponible: ${material.stockActual}` },
        { status: 400 }
      );
    }

    // Transaction: crear MaterialUsado + decrementar stock + historial
    const materialUsado = await prisma.$transaction(async (tx) => {
      const created = await tx.materialUsado.create({
        data: {
          ordenId,
          materialId,
          cantidad,
          precioUnitario: precioUnitario ?? material.precioVenta,
        },
        include: { material: true },
      });

      await tx.material.update({
        where: { id: materialId },
        data: { stockActual: { decrement: cantidad } },
      });

      await tx.historialOrden.create({
        data: {
          ordenId,
          usuarioId: session.user.id,
          accion: "MATERIAL_AGREGADO",
          detalles: {
            materialNombre: material.nombre,
            cantidad,
          },
        },
      });

      return created;
    });

    return NextResponse.json(materialUsado, { status: 201 });
  } catch (error) {
    console.error("Error adding material:", error);
    return NextResponse.json(
      { error: "Error al agregar material" },
      { status: 500 }
    );
  }
}
