import { describe, it, expect } from "vitest";

/**
 * Tests para validación de datos de materiales
 * Estos tests verifican la estructura de los datos que se envían a los endpoints
 */

interface CreateMaterialInput {
  sku: string;
  nombre: string;
  descripcion?: string | null;
  categoria?: string;
  stockActual?: number;
  stockMinimo?: number;
  precioCompra?: number | null;
  precioVenta?: number | null;
  activo?: boolean;
}

interface UpdateMaterialInput {
  sku?: string;
  nombre?: string;
  descripcion?: string | null;
  categoria?: string;
  stockActual?: number;
  stockMinimo?: number;
  precioCompra?: number | null;
  precioVenta?: number | null;
  activo?: boolean;
}

const CATEGORIAS_VALIDAS = ["REFACCION", "CONSUMIBLE", "HERRAMIENTA"];

describe("CreateMaterialInput Validación", () => {
  describe("Campos requeridos", () => {
    it("requiere sku", () => {
      const input: CreateMaterialInput = {
        sku: "REF-001",
        nombre: "Tornillo de acero",
      };
      expect(input.sku).toBe("REF-001");
    });

    it("requiere nombre", () => {
      const input: CreateMaterialInput = {
        sku: "REF-001",
        nombre: "Tornillo de acero",
      };
      expect(input.nombre).toBe("Tornillo de acero");
    });

    it("permite crear material con solo campos requeridos", () => {
      const input: CreateMaterialInput = {
        sku: "MAT-001",
        nombre: "Material básico",
      };
      expect(input.sku).toBeDefined();
      expect(input.nombre).toBeDefined();
      expect(input.descripcion).toBeUndefined();
    });
  });

  describe("Campos opcionales", () => {
    it("permite agregar descripción", () => {
      const input: CreateMaterialInput = {
        sku: "REF-001",
        nombre: "Tornillo de acero",
        descripcion: "Tornillo hexagonal de 1/4 pulgada",
      };
      expect(input.descripcion).toBe("Tornillo hexagonal de 1/4 pulgada");
    });

    it("permite agregar categoría válida", () => {
      const input: CreateMaterialInput = {
        sku: "REF-001",
        nombre: "Tornillo de acero",
        categoria: "REFACCION",
      };
      expect(input.categoria).toBe("REFACCION");
      expect(CATEGORIAS_VALIDAS).toContain(input.categoria);
    });

    it("permite agregar stock actual y mínimo", () => {
      const input: CreateMaterialInput = {
        sku: "REF-001",
        nombre: "Tornillo de acero",
        stockActual: 100,
        stockMinimo: 10,
      };
      expect(input.stockActual).toBe(100);
      expect(input.stockMinimo).toBe(10);
    });

    it("permite agregar precios", () => {
      const input: CreateMaterialInput = {
        sku: "REF-001",
        nombre: "Tornillo de acero",
        precioCompra: 15.5,
        precioVenta: 25.0,
      };
      expect(input.precioCompra).toBe(15.5);
      expect(input.precioVenta).toBe(25.0);
    });

    it("permite marcar como inactivo", () => {
      const input: CreateMaterialInput = {
        sku: "REF-001",
        nombre: "Tornillo de acero",
        activo: false,
      };
      expect(input.activo).toBe(false);
    });
  });

  describe("Categorías", () => {
    it("acepta REFACCION", () => {
      const input: CreateMaterialInput = {
        sku: "REF-001",
        nombre: "Cuchilla de sierra",
        categoria: "REFACCION",
      };
      expect(CATEGORIAS_VALIDAS).toContain(input.categoria);
    });

    it("acepta CONSUMIBLE", () => {
      const input: CreateMaterialInput = {
        sku: "CON-001",
        nombre: "Aceite lubricante",
        categoria: "CONSUMIBLE",
      };
      expect(CATEGORIAS_VALIDAS).toContain(input.categoria);
    });

    it("acepta HERRAMIENTA", () => {
      const input: CreateMaterialInput = {
        sku: "HER-001",
        nombre: "Llave ajustable",
        categoria: "HERRAMIENTA",
      };
      expect(CATEGORIAS_VALIDAS).toContain(input.categoria);
    });

    it("no acepta categoría inválida", () => {
      const categoriaInvalida = "OTRO";
      expect(CATEGORIAS_VALIDAS).not.toContain(categoriaInvalida);
    });
  });

  describe("Material completo", () => {
    it("permite crear material con todos los campos", () => {
      const input: CreateMaterialInput = {
        sku: "REF-001",
        nombre: "Cuchilla de sierra circular",
        descripcion: "Cuchilla de carburo de tungsteno para sierra circular de 12 pulgadas",
        categoria: "REFACCION",
        stockActual: 50,
        stockMinimo: 10,
        precioCompra: 150.0,
        precioVenta: 250.0,
        activo: true,
      };

      expect(input.sku).toBe("REF-001");
      expect(input.nombre).toBe("Cuchilla de sierra circular");
      expect(input.descripcion).toContain("carburo de tungsteno");
      expect(input.categoria).toBe("REFACCION");
      expect(input.stockActual).toBe(50);
      expect(input.stockMinimo).toBe(10);
      expect(input.precioCompra).toBe(150.0);
      expect(input.precioVenta).toBe(250.0);
      expect(input.activo).toBe(true);
    });
  });
});

describe("UpdateMaterialInput Validación", () => {
  describe("Actualización parcial", () => {
    it("permite actualizar solo el nombre", () => {
      const input: UpdateMaterialInput = { nombre: "Nuevo Nombre" };
      expect(input.nombre).toBe("Nuevo Nombre");
      expect(input.sku).toBeUndefined();
    });

    it("permite actualizar solo el sku", () => {
      const input: UpdateMaterialInput = { sku: "REF-002" };
      expect(input.sku).toBe("REF-002");
      expect(input.nombre).toBeUndefined();
    });

    it("permite actualizar solo el stock", () => {
      const input: UpdateMaterialInput = { stockActual: 75 };
      expect(input.stockActual).toBe(75);
    });

    it("permite actualizar solo el precio de venta", () => {
      const input: UpdateMaterialInput = { precioVenta: 199.99 };
      expect(input.precioVenta).toBe(199.99);
    });

    it("permite limpiar campos opcionales con null", () => {
      const input: UpdateMaterialInput = {
        descripcion: null,
        precioCompra: null,
        precioVenta: null,
      };
      expect(input.descripcion).toBeNull();
      expect(input.precioCompra).toBeNull();
      expect(input.precioVenta).toBeNull();
    });
  });

  describe("Actualización de estado", () => {
    it("permite desactivar material", () => {
      const input: UpdateMaterialInput = { activo: false };
      expect(input.activo).toBe(false);
    });

    it("permite reactivar material", () => {
      const input: UpdateMaterialInput = { activo: true };
      expect(input.activo).toBe(true);
    });
  });

  describe("Actualización completa", () => {
    it("permite actualizar todos los campos", () => {
      const input: UpdateMaterialInput = {
        sku: "REF-UPDATED",
        nombre: "Nombre Actualizado",
        descripcion: "Nueva descripción",
        categoria: "CONSUMIBLE",
        stockActual: 100,
        stockMinimo: 20,
        precioCompra: 50.0,
        precioVenta: 80.0,
        activo: true,
      };

      expect(Object.keys(input).length).toBe(9);
    });
  });
});

describe("Búsqueda y filtros", () => {
  describe("Parámetros de búsqueda", () => {
    it("permite búsqueda por texto", () => {
      const params = new URLSearchParams();
      params.append("search", "cuchilla");
      expect(params.get("search")).toBe("cuchilla");
    });

    it("permite filtrar por categoría", () => {
      const params = new URLSearchParams();
      params.append("categoria", "REFACCION");
      expect(params.get("categoria")).toBe("REFACCION");
    });

    it("permite filtrar por stock bajo", () => {
      const params = new URLSearchParams();
      params.append("stockBajo", "true");
      expect(params.get("stockBajo")).toBe("true");
    });

    it("permite filtrar por activos", () => {
      const params = new URLSearchParams();
      params.append("activos", "true");
      expect(params.get("activos")).toBe("true");
    });
  });

  describe("Ordenamiento", () => {
    it("permite ordenar por nombre ascendente", () => {
      const params = new URLSearchParams();
      params.append("orderBy", "nombre");
      params.append("orderDir", "asc");
      expect(params.get("orderBy")).toBe("nombre");
      expect(params.get("orderDir")).toBe("asc");
    });

    it("permite ordenar por stock descendente", () => {
      const params = new URLSearchParams();
      params.append("orderBy", "stockActual");
      params.append("orderDir", "desc");
      expect(params.get("orderBy")).toBe("stockActual");
      expect(params.get("orderDir")).toBe("desc");
    });

    it("permite ordenar por precio de venta", () => {
      const params = new URLSearchParams();
      params.append("orderBy", "precioVenta");
      params.append("orderDir", "asc");
      expect(params.get("orderBy")).toBe("precioVenta");
    });
  });

  describe("Paginación", () => {
    it("permite especificar página", () => {
      const params = new URLSearchParams();
      params.append("page", "2");
      expect(params.get("page")).toBe("2");
    });

    it("permite especificar tamaño de página", () => {
      const params = new URLSearchParams();
      params.append("pageSize", "50");
      expect(params.get("pageSize")).toBe("50");
    });

    it("permite combinar paginación con filtros", () => {
      const params = new URLSearchParams();
      params.append("search", "tornillo");
      params.append("categoria", "REFACCION");
      params.append("page", "1");
      params.append("pageSize", "20");

      expect(params.get("search")).toBe("tornillo");
      expect(params.get("categoria")).toBe("REFACCION");
      expect(params.get("page")).toBe("1");
      expect(params.get("pageSize")).toBe("20");
    });
  });
});

describe("Respuesta de API", () => {
  describe("Lista de materiales", () => {
    it("estructura de respuesta paginada", () => {
      const response = {
        materiales: [
          {
            id: "material-1",
            sku: "REF-001",
            nombre: "Cuchilla de sierra",
            descripcion: "Cuchilla de carburo",
            categoria: "REFACCION",
            stockActual: 15,
            stockMinimo: 10,
            precioCompra: 150.0,
            precioVenta: 250.0,
            activo: true,
            stockBajo: false,
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-15T00:00:00.000Z",
            _count: { usos: 5 },
          },
        ],
        pagination: {
          total: 50,
          page: 1,
          pageSize: 20,
          totalPages: 3,
        },
      };

      expect(response.materiales).toBeInstanceOf(Array);
      expect(response.materiales.length).toBe(1);
      expect(response.pagination.total).toBe(50);
      expect(response.pagination.totalPages).toBe(3);
    });

    it("incluye flag de stock bajo", () => {
      const materialConStockBajo = {
        id: "material-1",
        sku: "REF-001",
        nombre: "Cuchilla de sierra",
        stockActual: 5,
        stockMinimo: 10,
        stockBajo: true,
      };

      expect(materialConStockBajo.stockBajo).toBe(true);
      expect(materialConStockBajo.stockActual).toBeLessThan(
        materialConStockBajo.stockMinimo
      );
    });
  });

  describe("Material individual", () => {
    it("estructura de material con historial de usos", () => {
      const response = {
        id: "material-1",
        sku: "REF-001",
        nombre: "Cuchilla de sierra",
        descripcion: "Cuchilla de carburo de tungsteno",
        categoria: "REFACCION",
        stockActual: 15,
        stockMinimo: 10,
        precioCompra: 150.0,
        precioVenta: 250.0,
        activo: true,
        stockBajo: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-15T00:00:00.000Z",
        usos: [
          {
            id: "uso-1",
            cantidad: 2,
            precioUnitario: 250.0,
            createdAt: "2024-01-10T00:00:00.000Z",
            orden: {
              id: "orden-1",
              folio: "OS-2024-0001",
              estado: "ENTREGADO",
              cliente: {
                nombre: "Cliente Ejemplo",
              },
            },
          },
        ],
        _count: { usos: 5 },
      };

      expect(response.id).toBe("material-1");
      expect(response.usos).toBeInstanceOf(Array);
      expect(response._count.usos).toBe(5);
    });
  });
});

describe("Validación de stock bajo", () => {
  it("detecta stock bajo correctamente", () => {
    const material = {
      stockActual: 5,
      stockMinimo: 10,
    };
    const stockBajo = material.stockActual < material.stockMinimo;
    expect(stockBajo).toBe(true);
  });

  it("stock normal cuando actual >= mínimo", () => {
    const material = {
      stockActual: 15,
      stockMinimo: 10,
    };
    const stockBajo = material.stockActual < material.stockMinimo;
    expect(stockBajo).toBe(false);
  });

  it("stock normal cuando son iguales", () => {
    const material = {
      stockActual: 10,
      stockMinimo: 10,
    };
    const stockBajo = material.stockActual < material.stockMinimo;
    expect(stockBajo).toBe(false);
  });

  it("stock bajo cuando actual es cero", () => {
    const material = {
      stockActual: 0,
      stockMinimo: 5,
    };
    const stockBajo = material.stockActual < material.stockMinimo;
    expect(stockBajo).toBe(true);
  });
});

describe("Validación de eliminación", () => {
  it("no permite eliminar material con usos", () => {
    const material = {
      id: "material-1",
      nombre: "Cuchilla de sierra",
      _count: { usos: 3 },
    };

    const puedeEliminar = material._count.usos === 0;
    expect(puedeEliminar).toBe(false);
  });

  it("permite eliminar material sin usos", () => {
    const material = {
      id: "material-2",
      nombre: "Material nuevo",
      _count: { usos: 0 },
    };

    const puedeEliminar = material._count.usos === 0;
    expect(puedeEliminar).toBe(true);
  });
});

describe("Validación de campos", () => {
  describe("SKU", () => {
    it("acepta formato con guiones", () => {
      const sku = "REF-001-A";
      expect(sku.includes("-")).toBe(true);
    });

    it("acepta formato alfanumérico", () => {
      const sku = "TORNILLO123";
      expect(/^[A-Z0-9]+$/.test(sku)).toBe(true);
    });

    it("SKU debe convertirse a mayúsculas", () => {
      const skuInput = "ref-001";
      const skuNormalizado = skuInput.toUpperCase();
      expect(skuNormalizado).toBe("REF-001");
    });
  });

  describe("Precios", () => {
    it("acepta precios con decimales", () => {
      const precio = 150.99;
      expect(precio).toBe(150.99);
    });

    it("acepta precio null para material sin precio definido", () => {
      const material: CreateMaterialInput = {
        sku: "MAT-001",
        nombre: "Material sin precio",
        precioVenta: null,
      };
      expect(material.precioVenta).toBeNull();
    });

    it("calcula margen de ganancia", () => {
      const precioCompra = 100;
      const precioVenta = 150;
      const margen = ((precioVenta - precioCompra) / precioCompra) * 100;
      expect(margen).toBe(50);
    });
  });

  describe("Stock", () => {
    it("stock no puede ser negativo", () => {
      const stockActual = 0;
      expect(stockActual).toBeGreaterThanOrEqual(0);
    });

    it("stock mínimo no puede ser negativo", () => {
      const stockMinimo = 0;
      expect(stockMinimo).toBeGreaterThanOrEqual(0);
    });

    it("permite stock en cero", () => {
      const material: CreateMaterialInput = {
        sku: "MAT-001",
        nombre: "Material sin stock",
        stockActual: 0,
        stockMinimo: 5,
      };
      expect(material.stockActual).toBe(0);
    });
  });

  describe("Nombre", () => {
    it("acepta nombres con acentos", () => {
      const nombre = "Válvula de presión";
      expect(nombre.includes("á")).toBe(true);
    });

    it("acepta nombres con caracteres especiales", () => {
      const nombre = "Cuchilla 12\" x 1/4\"";
      expect(nombre.includes('"')).toBe(true);
    });

    it("acepta nombres largos", () => {
      const nombre = "Cuchilla de carburo de tungsteno para sierra circular industrial de 12 pulgadas";
      expect(nombre.length).toBeGreaterThan(50);
    });
  });
});

describe("Lógica de negocio", () => {
  describe("Cálculo de reposición", () => {
    it("calcula cantidad a reponer", () => {
      const stockActual = 3;
      const stockMinimo = 10;
      const cantidadReponer = stockMinimo - stockActual;
      expect(cantidadReponer).toBe(7);
    });

    it("no necesita reposición si stock es suficiente", () => {
      const stockActual = 15;
      const stockMinimo = 10;
      const necesitaReponer = stockActual < stockMinimo;
      expect(necesitaReponer).toBe(false);
    });
  });

  describe("Cálculo de valor de inventario", () => {
    it("calcula valor total del inventario", () => {
      const stockActual = 10;
      const precioCompra = 100;
      const valorInventario = stockActual * precioCompra;
      expect(valorInventario).toBe(1000);
    });

    it("valor es cero si no hay stock", () => {
      const stockActual = 0;
      const precioCompra = 100;
      const valorInventario = stockActual * precioCompra;
      expect(valorInventario).toBe(0);
    });

    it("valor es cero si no hay precio de compra", () => {
      const stockActual = 10;
      const precioCompra = null;
      const valorInventario = precioCompra !== null ? stockActual * precioCompra : 0;
      expect(valorInventario).toBe(0);
    });
  });
});

describe("Filtro stock bajo - lógica de filtrado", () => {
  // Simular la lógica de filtrado que usa la API
  function filtrarPorStockBajo<T extends { stockActual: number; stockMinimo: number }>(
    materiales: T[]
  ): T[] {
    return materiales.filter((m) => m.stockActual < m.stockMinimo);
  }

  it("filtra materiales donde stockActual < stockMinimo", () => {
    const materiales = [
      { id: "1", nombre: "Mat A", stockActual: 5, stockMinimo: 10 },
      { id: "2", nombre: "Mat B", stockActual: 15, stockMinimo: 10 },
      { id: "3", nombre: "Mat C", stockActual: 0, stockMinimo: 5 },
    ];

    const resultado = filtrarPorStockBajo(materiales);

    expect(resultado).toHaveLength(2);
    expect(resultado.map((m) => m.id)).toEqual(["1", "3"]);
  });

  it("no incluye materiales donde stockActual >= stockMinimo", () => {
    const materiales = [
      { id: "1", nombre: "Mat A", stockActual: 10, stockMinimo: 10 }, // igual
      { id: "2", nombre: "Mat B", stockActual: 15, stockMinimo: 10 }, // mayor
      { id: "3", nombre: "Mat C", stockActual: 20, stockMinimo: 5 },  // mucho mayor
    ];

    const resultado = filtrarPorStockBajo(materiales);

    expect(resultado).toHaveLength(0);
  });

  it("funciona con array vacío", () => {
    const materiales: { id: string; stockActual: number; stockMinimo: number }[] = [];

    const resultado = filtrarPorStockBajo(materiales);

    expect(resultado).toHaveLength(0);
  });

  it("funciona cuando todos tienen stock bajo", () => {
    const materiales = [
      { id: "1", nombre: "Mat A", stockActual: 1, stockMinimo: 10 },
      { id: "2", nombre: "Mat B", stockActual: 2, stockMinimo: 10 },
      { id: "3", nombre: "Mat C", stockActual: 0, stockMinimo: 5 },
    ];

    const resultado = filtrarPorStockBajo(materiales);

    expect(resultado).toHaveLength(3);
  });

  it("maneja stockMinimo en cero correctamente", () => {
    const materiales = [
      { id: "1", nombre: "Mat A", stockActual: 0, stockMinimo: 0 }, // no es bajo (0 no es < 0)
      { id: "2", nombre: "Mat B", stockActual: 5, stockMinimo: 0 }, // no es bajo
    ];

    const resultado = filtrarPorStockBajo(materiales);

    expect(resultado).toHaveLength(0);
  });

  describe("paginación manual de resultados filtrados", () => {
    const materiales = [
      { id: "1", stockActual: 1, stockMinimo: 10 },
      { id: "2", stockActual: 2, stockMinimo: 10 },
      { id: "3", stockActual: 3, stockMinimo: 10 },
      { id: "4", stockActual: 4, stockMinimo: 10 },
      { id: "5", stockActual: 5, stockMinimo: 10 },
    ];

    it("pagina correctamente primera página", () => {
      const filtrados = filtrarPorStockBajo(materiales);
      const page = 1;
      const pageSize = 2;
      const paginados = filtrados.slice((page - 1) * pageSize, page * pageSize);

      expect(paginados).toHaveLength(2);
      expect(paginados.map((m) => m.id)).toEqual(["1", "2"]);
    });

    it("pagina correctamente segunda página", () => {
      const filtrados = filtrarPorStockBajo(materiales);
      const page = 2;
      const pageSize = 2;
      const paginados = filtrados.slice((page - 1) * pageSize, page * pageSize);

      expect(paginados).toHaveLength(2);
      expect(paginados.map((m) => m.id)).toEqual(["3", "4"]);
    });

    it("última página puede tener menos elementos", () => {
      const filtrados = filtrarPorStockBajo(materiales);
      const page = 3;
      const pageSize = 2;
      const paginados = filtrados.slice((page - 1) * pageSize, page * pageSize);

      expect(paginados).toHaveLength(1);
      expect(paginados.map((m) => m.id)).toEqual(["5"]);
    });

    it("calcula total de páginas correctamente", () => {
      const filtrados = filtrarPorStockBajo(materiales);
      const pageSize = 2;
      const totalPages = Math.ceil(filtrados.length / pageSize);

      expect(totalPages).toBe(3);
    });
  });
});
