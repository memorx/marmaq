import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RESULTADOS_POR_CATEGORIA = 5;

interface SugerenciaEquipo {
  serie: string;
  marca: string;
  modelo: string;
  totalOrdenes: number;
}

interface ResultadoBusqueda {
  ordenes: Array<{
    id: string;
    folio: string;
    tipoServicio: string;
    estado: string;
    marcaEquipo: string;
    modeloEquipo: string;
    cliente: { nombre: string };
  }>;
  clientes: Array<{
    id: string;
    nombre: string;
    empresa: string | null;
    telefono: string;
    email: string | null;
  }>;
  materiales: Array<{
    id: string;
    sku: string;
    nombre: string;
    categoria: string;
    stockActual: number;
    stockBajo: boolean;
  }>;
  sugerenciaEquipo: SugerenciaEquipo | null;
}

// GET /api/buscar?q=texto - Búsqueda global
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json<ResultadoBusqueda>({
        ordenes: [],
        clientes: [],
        materiales: [],
        sugerenciaEquipo: null,
      });
    }

    // Ejecutar búsquedas en paralelo
    const [ordenes, clientes, materiales] = await Promise.all([
      // Buscar en órdenes
      prisma.orden.findMany({
        where: {
          OR: [
            { folio: { contains: query, mode: "insensitive" } },
            { modeloEquipo: { contains: query, mode: "insensitive" } },
            { serieEquipo: { contains: query, mode: "insensitive" } },
            { marcaEquipo: { contains: query, mode: "insensitive" } },
            { fallaReportada: { contains: query, mode: "insensitive" } },
            { cliente: { nombre: { contains: query, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          folio: true,
          tipoServicio: true,
          estado: true,
          marcaEquipo: true,
          modeloEquipo: true,
          serieEquipo: true,
          cliente: {
            select: {
              nombre: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_RESULTADOS_POR_CATEGORIA,
      }),

      // Buscar en clientes
      prisma.cliente.findMany({
        where: {
          OR: [
            { nombre: { contains: query, mode: "insensitive" } },
            { empresa: { contains: query, mode: "insensitive" } },
            { telefono: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          nombre: true,
          empresa: true,
          telefono: true,
          email: true,
        },
        orderBy: { nombre: "asc" },
        take: MAX_RESULTADOS_POR_CATEGORIA,
      }),

      // Buscar en materiales
      prisma.material.findMany({
        where: {
          activo: true,
          OR: [
            { sku: { contains: query, mode: "insensitive" } },
            { nombre: { contains: query, mode: "insensitive" } },
            { descripcion: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          sku: true,
          nombre: true,
          categoria: true,
          stockActual: true,
          stockMinimo: true,
        },
        orderBy: { nombre: "asc" },
        take: MAX_RESULTADOS_POR_CATEGORIA,
      }),
    ]);

    // Agregar flag de stockBajo a materiales
    const materialesConAlerta = materiales.map((m) => ({
      id: m.id,
      sku: m.sku,
      nombre: m.nombre,
      categoria: m.categoria,
      stockActual: m.stockActual,
      stockBajo: m.stockActual < m.stockMinimo,
    }));

    // Build equipment suggestion if a serial number match is found
    let sugerenciaEquipo: SugerenciaEquipo | null = null;
    const ordenConSerie = ordenes.find(
      (o) =>
        o.serieEquipo &&
        o.serieEquipo.toLowerCase().includes(query.toLowerCase())
    );

    if (ordenConSerie?.serieEquipo) {
      const totalOrdenes = await prisma.orden.count({
        where: {
          serieEquipo: { equals: ordenConSerie.serieEquipo, mode: "insensitive" },
        },
      });

      if (totalOrdenes > 1) {
        sugerenciaEquipo = {
          serie: ordenConSerie.serieEquipo,
          marca: ordenConSerie.marcaEquipo,
          modelo: ordenConSerie.modeloEquipo,
          totalOrdenes,
        };
      }
    }

    // Strip serieEquipo from ordenes response to keep backward compatibility
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ordenesResponse = ordenes.map(({ serieEquipo: _serie, ...rest }) => rest);

    return NextResponse.json<ResultadoBusqueda>({
      ordenes: ordenesResponse,
      clientes,
      materiales: materialesConAlerta,
      sugerenciaEquipo,
    });
  } catch (error) {
    console.error("Error en búsqueda global:", error);
    return NextResponse.json(
      { error: "Error al realizar la búsqueda" },
      { status: 500 }
    );
  }
}
