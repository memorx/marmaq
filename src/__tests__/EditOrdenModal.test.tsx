import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { EditOrdenModal } from "@/components/ordenes/EditOrdenModal";
import type { OrdenConRelaciones } from "@/types/ordenes";

// Mock useScrollToError
vi.mock("@/hooks/useScrollToError", () => ({
  useScrollToError: () => ({ current: null }),
}));

// Mock lucide-react icons to avoid rendering issues
vi.mock("lucide-react", () => ({
  X: () => <span>X</span>,
  Save: () => <span>Save</span>,
  User: () => <span>User</span>,
  Wrench: () => <span>Wrench</span>,
  FileText: () => <span>FileText</span>,
  Calendar: () => <span>Calendar</span>,
  DollarSign: () => <span>DollarSign</span>,
  AlertTriangle: () => <span>AlertTriangle</span>,
}));

// Minimal mock orden for testing
const mockOrden: OrdenConRelaciones = {
  id: "orden-1",
  folio: "ORD-001",
  estado: "RECIBIDO",
  prioridad: "NORMAL",
  tipoServicio: "POR_COBRAR",
  tecnicoId: null,
  marcaEquipo: "TestMarca",
  modeloEquipo: "TestModelo",
  serieEquipo: "SN123",
  condicionEquipo: "BUENA",
  fallaReportada: "No enciende",
  diagnostico: null,
  notasTecnico: null,
  fechaRecepcion: new Date(),
  fechaPromesa: null,
  fechaReparacion: null,
  fechaEntrega: null,
  cotizacion: null,
  cotizacionAprobada: false,
  numeroFactura: null,
  fechaFactura: null,
  numeroRepare: null,
  coordenadasGPS: null,
  clienteId: "client-1",
  creadoPorId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  firmaClienteUrl: null,
  firmaRecepcionUrl: null,
  cliente: {
    id: "client-1",
    nombre: "Test Cliente",
    empresa: null,
    email: null,
    telefono: "1234567890",
    direccion: null,
    rfc: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  tecnico: null,
  creadoPor: {
    id: "user-1",
    name: "Admin",
    email: "admin@test.com",
    password: "",
    role: "SUPER_ADMIN",
    activo: true,
    emailVerified: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  evidencias: [],
  materialesUsados: [],
  historial: [],
} as unknown as OrdenConRelaciones;

const mockTecnicos = [
  { id: "tec-1", name: "Juan Pérez", email: "juan@test.com", role: "TECNICO" },
  { id: "tec-2", name: "María López", email: "maria@test.com", role: "COORD_SERVICIO" },
];

describe("EditOrdenModal - fetchTecnicos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parsea correctamente la respuesta { usuarios: [...] } de la API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ usuarios: mockTecnicos, pagination: { total: 2 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EditOrdenModal
        orden={mockOrden}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      expect(screen.getByText("María López")).toBeInTheDocument();
    });
  });

  it("maneja respuesta inesperada (objeto sin .usuarios) sin crashear", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ unexpected: "data" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EditOrdenModal
        orden={mockOrden}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    // Should render without crashing, with the "Sin asignar" option only
    await waitFor(() => {
      expect(screen.getByText("Sin asignar")).toBeInTheDocument();
    });

    // The técnico select should only have "Sin asignar" (no técnico names)
    const tecnicoSelect = screen.getByText("Sin asignar").closest("select")!;
    const tecnicoOptions = tecnicoSelect.querySelectorAll("option");
    expect(tecnicoOptions).toHaveLength(1);
  });

  it("maneja error de red sin crashear", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EditOrdenModal
        orden={mockOrden}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Sin asignar")).toBeInTheDocument();
    });
  });

  it("maneja respuesta HTTP no-ok sin crashear", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EditOrdenModal
        orden={mockOrden}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Sin asignar")).toBeInTheDocument();
    });
  });
});

describe("EditOrdenModal - renderizado de técnicos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza sin error cuando tecnicos es array vacío", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ usuarios: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EditOrdenModal
        orden={mockOrden}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Sin asignar")).toBeInTheDocument();
    });

    // The técnico select should only have "Sin asignar"
    const tecnicoSelect = screen.getByText("Sin asignar").closest("select")!;
    const tecnicoOptions = tecnicoSelect.querySelectorAll("option");
    expect(tecnicoOptions).toHaveLength(1);
  });

  it("muestra los nombres de técnicos correctamente en el select", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ usuarios: mockTecnicos }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EditOrdenModal
        orden={mockOrden}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      expect(screen.getByText("María López")).toBeInTheDocument();
    });

    // Verify the técnico select has correct options
    const juanOption = screen.getByText("Juan Pérez") as HTMLOptionElement;
    const tecnicoSelect = juanOption.closest("select")!;
    const tecnicoOptions = tecnicoSelect.querySelectorAll("option");
    expect(tecnicoOptions).toHaveLength(3); // "Sin asignar" + 2 técnicos

    expect(juanOption.value).toBe("tec-1");

    const mariaOption = screen.getByText("María López") as HTMLOptionElement;
    expect(mariaOption.value).toBe("tec-2");
  });

  it("maneja respuesta que es un array directo (retrocompatibilidad)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTecnicos),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EditOrdenModal
        orden={mockOrden}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      expect(screen.getByText("María López")).toBeInTheDocument();
    });
  });
});
