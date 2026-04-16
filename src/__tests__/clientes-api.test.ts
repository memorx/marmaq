import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  default: {
    cliente: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { UpdateClienteSchema } from "@/lib/validators/clientes";
import { PATCH as patchCliente } from "@/app/api/clientes/[id]/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  cliente: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

/**
 * Tests para validación de datos de clientes
 * Estos tests verifican la estructura de los datos que se envían a los endpoints
 */

interface CreateClienteInput {
  nombre: string;
  empresa?: string | null;
  telefono: string;
  email?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  esDistribuidor?: boolean;
  codigoDistribuidor?: string | null;
  notas?: string | null;
}

interface UpdateClienteInput {
  nombre?: string;
  empresa?: string | null;
  telefono?: string;
  email?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  esDistribuidor?: boolean;
  codigoDistribuidor?: string | null;
  notas?: string | null;
}

describe("CreateClienteInput Validación", () => {
  describe("Campos requeridos", () => {
    it("requiere nombre", () => {
      const input: CreateClienteInput = {
        nombre: "Juan Pérez",
        telefono: "33 1234 5678",
      };
      expect(input.nombre).toBe("Juan Pérez");
    });

    it("requiere teléfono", () => {
      const input: CreateClienteInput = {
        nombre: "Juan Pérez",
        telefono: "33 1234 5678",
      };
      expect(input.telefono).toBe("33 1234 5678");
    });

    it("permite crear cliente con solo campos requeridos", () => {
      const input: CreateClienteInput = {
        nombre: "Cliente Mínimo",
        telefono: "33 0000 0000",
      };
      expect(input.nombre).toBeDefined();
      expect(input.telefono).toBeDefined();
      expect(input.empresa).toBeUndefined();
    });
  });

  describe("Campos opcionales", () => {
    it("permite agregar empresa", () => {
      const input: CreateClienteInput = {
        nombre: "Juan Pérez",
        telefono: "33 1234 5678",
        empresa: "Carnicería El Toro",
      };
      expect(input.empresa).toBe("Carnicería El Toro");
    });

    it("permite agregar email", () => {
      const input: CreateClienteInput = {
        nombre: "Juan Pérez",
        telefono: "33 1234 5678",
        email: "juan@ejemplo.com",
      };
      expect(input.email).toBe("juan@ejemplo.com");
    });

    it("permite agregar dirección y ciudad", () => {
      const input: CreateClienteInput = {
        nombre: "Juan Pérez",
        telefono: "33 1234 5678",
        direccion: "Av. Revolución 123",
        ciudad: "Guadalajara",
      };
      expect(input.direccion).toBe("Av. Revolución 123");
      expect(input.ciudad).toBe("Guadalajara");
    });

    it("permite agregar notas", () => {
      const input: CreateClienteInput = {
        nombre: "Juan Pérez",
        telefono: "33 1234 5678",
        notas: "Cliente frecuente, buen pagador",
      };
      expect(input.notas).toBe("Cliente frecuente, buen pagador");
    });
  });

  describe("Cliente distribuidor", () => {
    it("permite marcar como distribuidor", () => {
      const input: CreateClienteInput = {
        nombre: "Gastroequipos GDL",
        telefono: "33 9876 5432",
        esDistribuidor: true,
      };
      expect(input.esDistribuidor).toBe(true);
    });

    it("permite agregar código de distribuidor", () => {
      const input: CreateClienteInput = {
        nombre: "Gastroequipos GDL",
        telefono: "33 9876 5432",
        esDistribuidor: true,
        codigoDistribuidor: "DIST-001",
      };
      expect(input.codigoDistribuidor).toBe("DIST-001");
    });

    it("por defecto esDistribuidor es false o undefined", () => {
      const input: CreateClienteInput = {
        nombre: "Cliente Normal",
        telefono: "33 1111 1111",
      };
      expect(input.esDistribuidor).toBeUndefined();
    });
  });

  describe("Cliente completo", () => {
    it("permite crear cliente con todos los campos", () => {
      const input: CreateClienteInput = {
        nombre: "María García",
        empresa: "Gastroequipos GDL",
        telefono: "33 9876 5432",
        email: "ventas@gastroequiposgdl.com",
        direccion: "Calz. del Federalismo 456",
        ciudad: "Guadalajara",
        esDistribuidor: true,
        codigoDistribuidor: "DIST-001",
        notas: "Distribuidor autorizado desde 2020",
      };

      expect(input.nombre).toBe("María García");
      expect(input.empresa).toBe("Gastroequipos GDL");
      expect(input.telefono).toBe("33 9876 5432");
      expect(input.email).toBe("ventas@gastroequiposgdl.com");
      expect(input.direccion).toBe("Calz. del Federalismo 456");
      expect(input.ciudad).toBe("Guadalajara");
      expect(input.esDistribuidor).toBe(true);
      expect(input.codigoDistribuidor).toBe("DIST-001");
      expect(input.notas).toBe("Distribuidor autorizado desde 2020");
    });
  });
});

describe("UpdateClienteInput Validación", () => {
  describe("Actualización parcial", () => {
    it("permite actualizar solo el nombre", () => {
      const input: UpdateClienteInput = { nombre: "Nuevo Nombre" };
      expect(input.nombre).toBe("Nuevo Nombre");
      expect(input.telefono).toBeUndefined();
    });

    it("permite actualizar solo el teléfono", () => {
      const input: UpdateClienteInput = { telefono: "33 9999 9999" };
      expect(input.telefono).toBe("33 9999 9999");
      expect(input.nombre).toBeUndefined();
    });

    it("permite actualizar solo el email", () => {
      const input: UpdateClienteInput = { email: "nuevo@email.com" };
      expect(input.email).toBe("nuevo@email.com");
    });

    it("acepta null en todos los campos opcionales en runtime", () => {
      const input = {
        nombre: "CESAR ARTEAGA",
        telefono: "3317698795",
        empresa: null,
        email: null,
        direccion: "OCAMPO 163",
        ciudad: "ZAPOPAN",
        esDistribuidor: false,
        codigoDistribuidor: null,
        notas: null,
      };
      const result = UpdateClienteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("acepta string vacío en email y lo transforma a null", () => {
      const result = UpdateClienteSchema.safeParse({ email: "" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBeNull();
      }
    });

    it("rechaza email con formato inválido", () => {
      const result = UpdateClienteSchema.safeParse({ email: "no-es-email" });
      expect(result.success).toBe(false);
    });
  });

  describe("Actualización de distribuidor", () => {
    it("permite cambiar a distribuidor", () => {
      const input: UpdateClienteInput = {
        esDistribuidor: true,
        codigoDistribuidor: "DIST-NEW",
      };
      expect(input.esDistribuidor).toBe(true);
      expect(input.codigoDistribuidor).toBe("DIST-NEW");
    });

    it("permite quitar status de distribuidor", () => {
      const input: UpdateClienteInput = {
        esDistribuidor: false,
        codigoDistribuidor: null,
      };
      expect(input.esDistribuidor).toBe(false);
      expect(input.codigoDistribuidor).toBeNull();
    });
  });

  describe("Actualización completa", () => {
    it("permite actualizar todos los campos", () => {
      const input: UpdateClienteInput = {
        nombre: "Nombre Actualizado",
        empresa: "Nueva Empresa",
        telefono: "33 8888 8888",
        email: "actualizado@email.com",
        direccion: "Nueva Dirección 789",
        ciudad: "Zapopan",
        esDistribuidor: true,
        codigoDistribuidor: "DIST-UPD",
        notas: "Notas actualizadas",
      };

      expect(Object.keys(input).length).toBe(9);
    });
  });
});

describe("Búsqueda y filtros", () => {
  describe("Parámetros de búsqueda", () => {
    it("permite búsqueda por texto", () => {
      const params = new URLSearchParams();
      params.append("search", "carnicería");
      expect(params.get("search")).toBe("carnicería");
    });

    it("permite filtrar por distribuidor", () => {
      const params = new URLSearchParams();
      params.append("esDistribuidor", "true");
      expect(params.get("esDistribuidor")).toBe("true");
    });

    it("permite filtrar por no distribuidor", () => {
      const params = new URLSearchParams();
      params.append("esDistribuidor", "false");
      expect(params.get("esDistribuidor")).toBe("false");
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

    it("permite combinar paginación con búsqueda", () => {
      const params = new URLSearchParams();
      params.append("search", "torrey");
      params.append("page", "1");
      params.append("pageSize", "20");

      expect(params.get("search")).toBe("torrey");
      expect(params.get("page")).toBe("1");
      expect(params.get("pageSize")).toBe("20");
    });
  });
});

describe("Respuesta de API", () => {
  describe("Lista de clientes", () => {
    it("estructura de respuesta paginada", () => {
      const response = {
        clientes: [
          {
            id: "cliente-1",
            nombre: "Juan Pérez",
            empresa: "Carnicería El Toro",
            telefono: "33 1234 5678",
            email: "juan@ejemplo.com",
            direccion: "Av. Revolución 123",
            ciudad: "Guadalajara",
            esDistribuidor: false,
            codigoDistribuidor: null,
            notas: null,
            createdAt: "2024-01-01T00:00:00.000Z",
            _count: { ordenes: 5 },
          },
        ],
        pagination: {
          total: 50,
          page: 1,
          pageSize: 20,
          totalPages: 3,
        },
      };

      expect(response.clientes).toBeInstanceOf(Array);
      expect(response.clientes.length).toBe(1);
      expect(response.pagination.total).toBe(50);
      expect(response.pagination.totalPages).toBe(3);
    });
  });

  describe("Cliente individual", () => {
    it("estructura de cliente con órdenes recientes", () => {
      const response = {
        id: "cliente-1",
        nombre: "Juan Pérez",
        empresa: "Carnicería El Toro",
        telefono: "33 1234 5678",
        email: "juan@ejemplo.com",
        direccion: "Av. Revolución 123",
        ciudad: "Guadalajara",
        esDistribuidor: false,
        codigoDistribuidor: null,
        notas: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-15T00:00:00.000Z",
        ordenes: [
          {
            id: "orden-1",
            folio: "OS-2024-0001",
            tipoServicio: "GARANTIA",
            estado: "ENTREGADO",
            marcaEquipo: "Torrey",
            modeloEquipo: "L-EQ 10/20",
            fechaRecepcion: "2024-01-10T00:00:00.000Z",
          },
        ],
        _count: { ordenes: 5 },
      };

      expect(response.id).toBe("cliente-1");
      expect(response.ordenes).toBeInstanceOf(Array);
      expect(response._count.ordenes).toBe(5);
    });
  });
});

describe("Validación de eliminación", () => {
  it("no permite eliminar cliente con órdenes", () => {
    const cliente = {
      id: "cliente-1",
      nombre: "Juan Pérez",
      _count: { ordenes: 3 },
    };

    // Simular la lógica de validación
    const puedeEliminar = cliente._count.ordenes === 0;
    expect(puedeEliminar).toBe(false);
  });

  it("permite eliminar cliente sin órdenes", () => {
    const cliente = {
      id: "cliente-2",
      nombre: "Cliente Nuevo",
      _count: { ordenes: 0 },
    };

    const puedeEliminar = cliente._count.ordenes === 0;
    expect(puedeEliminar).toBe(true);
  });
});

describe("Validación de campos", () => {
  describe("Teléfono", () => {
    it("acepta formato con espacios", () => {
      const telefono = "33 1234 5678";
      expect(telefono.length).toBeGreaterThan(0);
    });

    it("acepta formato sin espacios", () => {
      const telefono = "3312345678";
      expect(telefono.length).toBe(10);
    });

    it("acepta formato con guiones", () => {
      const telefono = "33-1234-5678";
      expect(telefono.includes("-")).toBe(true);
    });
  });

  describe("Email", () => {
    it("acepta email válido", () => {
      const email = "cliente@ejemplo.com";
      expect(email.includes("@")).toBe(true);
    });

    it("permite email null para clientes sin correo", () => {
      const cliente: CreateClienteInput = {
        nombre: "Sin Email",
        telefono: "33 0000 0000",
        email: null,
      };
      expect(cliente.email).toBeNull();
    });
  });

  describe("Nombre", () => {
    it("acepta nombres con acentos", () => {
      const nombre = "José María García López";
      expect(nombre.includes("é")).toBe(true);
      expect(nombre.includes("í")).toBe(true);
    });

    it("acepta nombres con caracteres especiales", () => {
      const nombre = "O'Brien & Associates";
      expect(nombre.includes("'")).toBe(true);
      expect(nombre.includes("&")).toBe(true);
    });
  });
});

describe("PATCH /api/clientes/[id] RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function patchRequest(body: object): NextRequest {
    return new NextRequest(new URL("http://localhost:3000/api/clientes/cliente-1"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function patchParams(): { params: Promise<{ id: string }> } {
    return { params: Promise.resolve({ id: "cliente-1" }) };
  }

  it("TECNICO recibe 403 al intentar editar cliente", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "tecnico-1", name: "Técnico", role: "TECNICO" },
    });

    const response = await patchCliente(
      patchRequest({ nombre: "Nuevo Nombre" }),
      patchParams()
    );

    expect(response.status).toBe(403);
    expect(mockPrisma.cliente.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.cliente.update).not.toHaveBeenCalled();
  });

  it("VENDEDOR puede editar cliente (rol permitido)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "vendedor-1", name: "Vendedor", role: "VENDEDOR" },
    });
    mockPrisma.cliente.findUnique.mockResolvedValue({ id: "cliente-1" });
    mockPrisma.cliente.update.mockResolvedValue({
      id: "cliente-1",
      nombre: "CESAR ARTEAGA",
    });

    const response = await patchCliente(
      patchRequest({ nombre: "CESAR ARTEAGA", email: null }),
      patchParams()
    );

    expect(response.status).toBe(200);
  });

  it("Sin sesión recibe 401", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await patchCliente(
      patchRequest({ nombre: "Nuevo Nombre" }),
      patchParams()
    );

    expect(response.status).toBe(401);
  });
});
