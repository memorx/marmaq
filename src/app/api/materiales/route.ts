import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Categorías válidas
const CATEGORIAS_VALIDAS = ["REFACCION", "CONSUMIBLE", "HERRAMIENTA"];

// GET /api/materiales - Listar materiales con búsqueda, filtros y paginación
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const categoria = searchParams.get("categoria");
    const stockBajo = searchParams.get("stockBajo") === "true";
    const activos = searchParams.get("activos") !== "false";
    const orderBy = searchParams.get("orderBy") || "nombre";
    const orderDir = searchParams.get("orderDir") || "asc";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    // Construir filtro
    const where: Prisma.MaterialWhereInput = {};

    // Búsqueda por SKU, nombre o descripción
    if (search) {
      where.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { nombre: { contains: search, mode: "insensitive" } },
        { descripcion: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filtro por categoría
    if (categoria && CATEGORIAS_VALIDAS.includes(categoria)) {
      where.categoria = categoria;
    }

    // Filtro por stock bajo
    if (stockBajo) {
      where.stockActual = {
        lt: prisma.material.fields.stockMinimo,
      };
    }

    // Filtro por activos
    if (activos) {
      where.activo = true;
    }

    // Ordenamiento
    type OrderByField = "nombre" | "sku" | "stockActual" | "precioVenta" | "categoria";
    const validOrderFields: OrderByField[] = ["nombre", "sku", "stockActual", "precioVenta", "categoria"];
    const sortField = validOrderFields.includes(orderBy as OrderByField)
      ? (orderBy as OrderByField)
      : "nombre";
    const sortDir = orderDir === "desc" ? "desc" : "asc";

    // Contar total
    const total = await prisma.material.count({ where });

    // Obtener materiales paginados
    const materiales = await prisma.material.findMany({
      where,
      select: {
        id: true,
        sku: true,
        nombre: true,
        descripcion: true,
        categoria: true,
        stockActual: true,
        stockMinimo: true,
        precioCompra: true,
        precioVenta: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { usos: true },
        },
      },
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Agregar flag de stock bajo
    const materialesConAlerta = materiales.map((m) => ({
      ...m,
      stockBajo: m.stockActual < m.stockMinimo,
    }));

    return NextResponse.json({
      materiales: materialesConAlerta,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching materiales:", error);
    return NextResponse.json(
      { error: "Error al obtener materiales" },
      { status: 500 }
    );
  }
}

// POST /api/materiales - Crear nuevo material
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo admins y refacciones pueden crear materiales
    const allowedRoles = ["SUPER_ADMIN", "COORD_SERVICIO", "REFACCIONES"];
    if (!allowedRoles.includes(session.user.role as string)) {
      return NextResponse.json(
        { error: "No tienes permisos para crear materiales" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validar campos requeridos
    if (!body.sku || !body.nombre) {
      return NextResponse.json(
        { error: "SKU y nombre son requeridos" },
        { status: 400 }
      );
    }

    // Validar categoría
    if (body.categoria && !CATEGORIAS_VALIDAS.includes(body.categoria)) {
      return NextResponse.json(
        { error: `Categoría inválida. Válidas: ${CATEGORIAS_VALIDAS.join(", ")}` },
        { status: 400 }
      );
    }

    // Crear material
    const material = await prisma.material.create({
      data: {
        sku: body.sku.toUpperCase().trim(),
        nombre: body.nombre.trim(),
        descripcion: body.descripcion?.trim() || null,
        categoria: body.categoria || "REFACCION",
        stockActual: body.stockActual ?? 0,
        stockMinimo: body.stockMinimo ?? 5,
        precioCompra: body.precioCompra ?? null,
        precioVenta: body.precioVenta ?? null,
        activo: body.activo ?? true,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error("Error creating material:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe un material con ese SKU" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Error al crear material" },
      { status: 500 }
    );
  }
}
