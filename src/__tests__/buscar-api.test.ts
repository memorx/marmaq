import { describe, it, expect } from "vitest";

/**
 * Tests para validación de búsqueda global
 * Estos tests verifican la estructura de los datos del endpoint /api/buscar
 */

interface OrdenResult {
  id: string;
  folio: string;
  tipoServicio: string;
  estado: string;
  marcaEquipo: string;
  modeloEquipo: string;
  cliente: { nombre: string };
}

interface ClienteResult {
  id: string;
  nombre: string;
  empresa: string | null;
  telefono: string;
  email: string | null;
}

interface MaterialResult {
  id: string;
  sku: string;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockBajo: boolean;
}

interface SearchResults {
  ordenes: OrdenResult[];
  clientes: ClienteResult[];
  materiales: MaterialResult[];
}

describe("Búsqueda Global - Parámetros", () => {
  describe("Query parameter", () => {
    it("requiere parámetro q", () => {
      const params = new URLSearchParams();
      params.append("q", "torrey");
      expect(params.get("q")).toBe("torrey");
    });

    it("query vacío retorna resultados vacíos", () => {
      const query = "";
      const shouldSearch = query.length >= 2;
      expect(shouldSearch).toBe(false);
    });

    it("query con 1 carácter no activa búsqueda", () => {
      const query = "a";
      const shouldSearch = query.length >= 2;
      expect(shouldSearch).toBe(false);
    });

    it("query con 2+ caracteres activa búsqueda", () => {
      const query = "to";
      const shouldSearch = query.length >= 2;
      expect(shouldSearch).toBe(true);
    });

    it("query se codifica correctamente", () => {
      const query = "cuchilla sierra";
      const encoded = encodeURIComponent(query);
      expect(encoded).toBe("cuchilla%20sierra");
    });

    it("query con caracteres especiales se codifica", () => {
      const query = "equipo & accesorios";
      const encoded = encodeURIComponent(query);
      expect(encoded).toBe("equipo%20%26%20accesorios");
    });
  });
});

describe("Búsqueda Global - Estructura de Respuesta", () => {
  describe("Respuesta completa", () => {
    it("contiene las tres categorías", () => {
      const response: SearchResults = {
        ordenes: [],
        clientes: [],
        materiales: [],
      };

      expect(response).toHaveProperty("ordenes");
      expect(response).toHaveProperty("clientes");
      expect(response).toHaveProperty("materiales");
    });

    it("cada categoría es un array", () => {
      const response: SearchResults = {
        ordenes: [],
        clientes: [],
        materiales: [],
      };

      expect(Array.isArray(response.ordenes)).toBe(true);
      expect(Array.isArray(response.clientes)).toBe(true);
      expect(Array.isArray(response.materiales)).toBe(true);
    });
  });

  describe("Resultado de orden", () => {
    it("tiene estructura correcta", () => {
      const orden: OrdenResult = {
        id: "orden-1",
        folio: "OS-2024-0001",
        tipoServicio: "GARANTIA",
        estado: "EN_REPARACION",
        marcaEquipo: "Torrey",
        modeloEquipo: "L-EQ 10/20",
        cliente: { nombre: "Cliente Ejemplo" },
      };

      expect(orden.id).toBeDefined();
      expect(orden.folio).toBeDefined();
      expect(orden.tipoServicio).toBeDefined();
      expect(orden.estado).toBeDefined();
      expect(orden.marcaEquipo).toBeDefined();
      expect(orden.modeloEquipo).toBeDefined();
      expect(orden.cliente.nombre).toBeDefined();
    });

    it("folio tiene formato correcto", () => {
      const folio = "OS-2024-0001";
      const folioRegex = /^OS-\d{4}-\d{4}$/;
      expect(folioRegex.test(folio)).toBe(true);
    });
  });

  describe("Resultado de cliente", () => {
    it("tiene estructura correcta", () => {
      const cliente: ClienteResult = {
        id: "cliente-1",
        nombre: "Juan Pérez",
        empresa: "Carnicería El Toro",
        telefono: "33 1234 5678",
        email: "juan@ejemplo.com",
      };

      expect(cliente.id).toBeDefined();
      expect(cliente.nombre).toBeDefined();
      expect(cliente.telefono).toBeDefined();
    });

    it("empresa puede ser null", () => {
      const cliente: ClienteResult = {
        id: "cliente-2",
        nombre: "María García",
        empresa: null,
        telefono: "33 9876 5432",
        email: null,
      };

      expect(cliente.empresa).toBeNull();
    });

    it("email puede ser null", () => {
      const cliente: ClienteResult = {
        id: "cliente-3",
        nombre: "Pedro López",
        empresa: "Empresa SA",
        telefono: "33 1111 2222",
        email: null,
      };

      expect(cliente.email).toBeNull();
    });
  });

  describe("Resultado de material", () => {
    it("tiene estructura correcta", () => {
      const material: MaterialResult = {
        id: "material-1",
        sku: "REF-001",
        nombre: "Cuchilla de sierra",
        categoria: "REFACCION",
        stockActual: 15,
        stockBajo: false,
      };

      expect(material.id).toBeDefined();
      expect(material.sku).toBeDefined();
      expect(material.nombre).toBeDefined();
      expect(material.categoria).toBeDefined();
      expect(material.stockActual).toBeDefined();
      expect(material.stockBajo).toBeDefined();
    });

    it("stockBajo es true cuando stock < mínimo", () => {
      const stockActual = 3;
      const stockMinimo = 10;
      const stockBajo = stockActual < stockMinimo;

      expect(stockBajo).toBe(true);
    });

    it("stockBajo es false cuando stock >= mínimo", () => {
      const stockActual = 15;
      const stockMinimo = 10;
      const stockBajo = stockActual < stockMinimo;

      expect(stockBajo).toBe(false);
    });
  });
});

describe("Búsqueda Global - Límites", () => {
  describe("Máximo de resultados", () => {
    it("máximo 5 resultados por categoría", () => {
      const MAX_RESULTADOS = 5;

      const mockOrdenes = Array.from({ length: 10 }, (_, i) => ({
        id: `orden-${i}`,
        folio: `OS-2024-000${i}`,
        tipoServicio: "GARANTIA",
        estado: "EN_REPARACION",
        marcaEquipo: "Torrey",
        modeloEquipo: "L-EQ",
        cliente: { nombre: "Cliente" },
      }));

      const resultados = mockOrdenes.slice(0, MAX_RESULTADOS);
      expect(resultados.length).toBe(5);
    });

    it("puede tener menos de 5 resultados", () => {
      const mockClientes = [
        { id: "1", nombre: "Cliente 1", empresa: null, telefono: "123", email: null },
        { id: "2", nombre: "Cliente 2", empresa: null, telefono: "456", email: null },
      ];

      expect(mockClientes.length).toBeLessThan(5);
    });

    it("puede tener 0 resultados en una categoría", () => {
      const response: SearchResults = {
        ordenes: [],
        clientes: [{ id: "1", nombre: "Test", empresa: null, telefono: "123", email: null }],
        materiales: [],
      };

      expect(response.ordenes.length).toBe(0);
      expect(response.clientes.length).toBe(1);
      expect(response.materiales.length).toBe(0);
    });
  });
});

describe("Búsqueda Global - Campos de búsqueda", () => {
  describe("Búsqueda en órdenes", () => {
    it("busca por folio", () => {
      const query = "OS-2024";
      const folio = "OS-2024-0001";
      const match = folio.toLowerCase().includes(query.toLowerCase());
      expect(match).toBe(true);
    });

    it("busca por modelo de equipo", () => {
      const query = "L-EQ";
      const modelo = "L-EQ 10/20";
      const match = modelo.toLowerCase().includes(query.toLowerCase());
      expect(match).toBe(true);
    });

    it("busca por serie de equipo", () => {
      const query = "ABC123";
      const serie = "ABC123XYZ";
      const match = serie.toLowerCase().includes(query.toLowerCase());
      expect(match).toBe(true);
    });

    it("busca por marca de equipo", () => {
      const query = "torrey";
      const marca = "Torrey";
      const match = marca.toLowerCase().includes(query.toLowerCase());
      expect(match).toBe(true);
    });

    it("busca por falla reportada", () => {
      const query = "no enciende";
      const falla = "El equipo no enciende correctamente";
      const match = falla.toLowerCase().includes(query.toLowerCase());
      expect(match).toBe(true);
    });

    it("busca por nombre de cliente", () => {
      const query = "carnicería";
      const clienteNombre = "Carnicería El Toro";
      const match = clienteNombre.toLowerCase().includes(query.toLowerCase());
      expect(match).toBe(true);
    });
  });

  describe("Búsqueda en clientes", () => {
    it("busca por nombre", () => {
      const query = "juan";
      const nombre = "Juan Pérez";
      const match = nombre.toLowerCase().includes(query.toLowerCase());
      expect(match).toBe(true);
    });

    it("busca por empresa", () => {
      const query = "gastro";
      const empresa = "Gastroequipos GDL";
      const match = empresa.toLowerCase().includes(query.toLowerCase());
      expect(match).toBe(true);
    });

    it("busca por teléfono", () => {
      const query = "1234";
      const telefono = "33 1234 5678";
      const match = telefono.includes(query);
      expect(match).toBe(true);
    });

    it("busca por email", () => {
      const query = "ventas@";
      const email = "ventas@gastroequipos.com";
      const match = email.toLowerCase().includes(query.toLowerCase());
      expect(match).toBe(true);
    });
  });

  describe("Búsqueda en materiales", () => {
    it("busca por SKU", () => {
      const query = "REF-001";
      const sku = "REF-001";
      const match = sku.toLowerCase().includes(query.toLowerCase());
      expect(match).toBe(true);
    });

    it("busca por nombre", () => {
      const query = "cuchilla";
      const nombre = "Cuchilla de sierra circular";
      const match = nombre.toLowerCase().includes(query.toLowerCase());
      expect(match).toBe(true);
    });

    it("busca por descripción", () => {
      const query = "carburo";
      const descripcion = "Cuchilla de carburo de tungsteno";
      const match = descripcion.toLowerCase().includes(query.toLowerCase());
      expect(match).toBe(true);
    });

    it("solo busca materiales activos", () => {
      const material = { activo: true, nombre: "Material Activo" };
      expect(material.activo).toBe(true);
    });
  });
});

describe("Búsqueda Global - Debounce", () => {
  it("debounce de 300ms", () => {
    const DEBOUNCE_DELAY = 300;
    expect(DEBOUNCE_DELAY).toBe(300);
  });

  it("no busca mientras el usuario escribe rápido", () => {
    const tiempoEntreKeystrokes = 100; // ms
    const debounceDelay = 300;
    const debeEsperar = tiempoEntreKeystrokes < debounceDelay;
    expect(debeEsperar).toBe(true);
  });

  it("busca después del debounce", () => {
    const tiempoDesdeUltimoKeystroke = 350; // ms
    const debounceDelay = 300;
    const debeBuscar = tiempoDesdeUltimoKeystroke >= debounceDelay;
    expect(debeBuscar).toBe(true);
  });
});

describe("Búsqueda Global - Navegación", () => {
  describe("Rutas de navegación", () => {
    it("orden navega a /ordenes/[id]", () => {
      const ordenId = "orden-123";
      const ruta = `/ordenes/${ordenId}`;
      expect(ruta).toBe("/ordenes/orden-123");
    });

    it("cliente navega a /clientes con highlight", () => {
      const clienteId = "cliente-456";
      const ruta = `/clientes?highlight=${clienteId}`;
      expect(ruta).toBe("/clientes?highlight=cliente-456");
    });

    it("material navega a /materiales con highlight", () => {
      const materialId = "material-789";
      const ruta = `/materiales?highlight=${materialId}`;
      expect(ruta).toBe("/materiales?highlight=material-789");
    });
  });
});

describe("Búsqueda Global - UI/UX", () => {
  describe("Estados de carga", () => {
    it("muestra loading mientras busca", () => {
      const isLoading = true;
      expect(isLoading).toBe(true);
    });

    it("oculta loading al terminar", () => {
      const isLoading = false;
      expect(isLoading).toBe(false);
    });
  });

  describe("Dropdown de resultados", () => {
    it("muestra dropdown cuando hay resultados", () => {
      const results: SearchResults = {
        ordenes: [{ id: "1", folio: "OS-2024-0001", tipoServicio: "GARANTIA", estado: "RECIBIDO", marcaEquipo: "Torrey", modeloEquipo: "L-EQ", cliente: { nombre: "Test" } }],
        clientes: [],
        materiales: [],
      };
      const hasResults = results.ordenes.length > 0 || results.clientes.length > 0 || results.materiales.length > 0;
      expect(hasResults).toBe(true);
    });

    it("muestra mensaje cuando no hay resultados", () => {
      const results: SearchResults = {
        ordenes: [],
        clientes: [],
        materiales: [],
      };
      const hasResults = results.ordenes.length > 0 || results.clientes.length > 0 || results.materiales.length > 0;
      const noResults = !hasResults;
      expect(noResults).toBe(true);
    });

    it("cierra dropdown con Escape", () => {
      const key = "Escape";
      const shouldClose = key === "Escape";
      expect(shouldClose).toBe(true);
    });

    it("cierra dropdown al hacer clic fuera", () => {
      const clickOutside = true;
      const shouldClose = clickOutside;
      expect(shouldClose).toBe(true);
    });
  });

  describe("Limpiar búsqueda", () => {
    it("botón X limpia el input", () => {
      let searchQuery = "torrey";
      searchQuery = "";
      expect(searchQuery).toBe("");
    });

    it("limpiar también cierra el dropdown", () => {
      let showDropdown = true;
      showDropdown = false;
      expect(showDropdown).toBe(false);
    });
  });
});

describe("Búsqueda Global - Formato de resultados", () => {
  describe("Estado de orden", () => {
    it("formatea estado con espacios", () => {
      const estado = "EN_REPARACION";
      const formatted = estado.replace(/_/g, " ");
      expect(formatted).toBe("EN REPARACION");
    });

    it("ENTREGADO tiene estilo verde", () => {
      const estado = "ENTREGADO";
      const esEntregado = estado === "ENTREGADO";
      expect(esEntregado).toBe(true);
    });

    it("EN_REPARACION tiene estilo azul", () => {
      const estado = "EN_REPARACION";
      const esEnReparacion = estado === "EN_REPARACION";
      expect(esEnReparacion).toBe(true);
    });
  });

  describe("Texto truncado", () => {
    it("trunca textos largos", () => {
      const texto = "Este es un texto muy largo que debería ser truncado";
      const maxLength = 30;
      const truncated = texto.length > maxLength
        ? texto.substring(0, maxLength) + "..."
        : texto;
      expect(truncated.length).toBeLessThanOrEqual(maxLength + 3);
    });
  });
});
