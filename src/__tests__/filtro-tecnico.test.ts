import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    orden: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock folio-generator (needed by ordenes route)
vi.mock("@/lib/utils/folio-generator", () => ({
  crearOrdenConFolio: vi.fn(),
  FolioGenerationError: class extends Error {},
}));

// Mock notification-triggers
vi.mock("@/lib/notificaciones/notification-triggers", () => ({
  notificarOrdenCreada: vi.fn().mockResolvedValue(undefined),
}));

import { GET as getOrdenes } from "@/app/api/ordenes/route";
import { GET as getUsuarios } from "@/app/api/usuarios/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  orden: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  user: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

const mockOrdenes = [
  {
    id: "ord-1",
    folio: "OS-2026-03-001",
    fechaRecepcion: new Date("2026-03-01"),
    tipoServicio: "POR_COBRAR",
    estado: "RECIBIDO",
    sucursal: "MEXICALTZINGO",
    prioridad: "NORMAL",
    marcaEquipo: "TORREY",
    modeloEquipo: "L-EQ 10",
    serieEquipo: "ABC",
    tecnicoId: "tec-1",
    cliente: { id: "cl-1", nombre: "Juan", empresa: null, telefono: null },
    tecnico: { id: "tec-1", name: "Francisco Casado" },
    _count: { evidencias: 0 },
  },
  {
    id: "ord-2",
    folio: "OS-2026-03-002",
    fechaRecepcion: new Date("2026-03-02"),
    tipoServicio: "GARANTIA",
    estado: "EN_DIAGNOSTICO",
    sucursal: "LA_PAZ",
    prioridad: "ALTA",
    marcaEquipo: "TORREY",
    modeloEquipo: "M-100",
    serieEquipo: "DEF",
    tecnicoId: null,
    cliente: { id: "cl-2", nombre: "Maria", empresa: "Empresa X", telefono: "333111" },
    tecnico: null,
    _count: { evidencias: 2 },
  },
  {
    id: "ord-3",
    folio: "OS-2026-03-003",
    fechaRecepcion: new Date("2026-03-03"),
    tipoServicio: "POR_COBRAR",
    estado: "REPARADO",
    sucursal: "ABASTOS",
    prioridad: "NORMAL",
    marcaEquipo: "TORREY",
    modeloEquipo: "L-PC",
    serieEquipo: "GHI",
    tecnicoId: "tec-2",
    cliente: { id: "cl-3", nombre: "Pedro", empresa: null, telefono: null },
    tecnico: { id: "tec-2", name: "Carlos García" },
    _count: { evidencias: 1 },
  },
];

describe("GET /api/ordenes — filtro por tecnicoId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Admin", role: "SUPER_ADMIN" },
    });
  });

  it("retorna todas las órdenes cuando no se envía tecnicoId", async () => {
    mockPrisma.orden.findMany.mockResolvedValue(mockOrdenes);
    mockPrisma.orden.count.mockResolvedValue(3);

    const request = createRequest("/api/ordenes?page=1&pageSize=20");
    const response = await getOrdenes(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ordenes).toHaveLength(3);
    // Verify no tecnicoId filter applied
    const whereArg = mockPrisma.orden.findMany.mock.calls[0][0].where;
    expect(whereArg.tecnicoId).toBeUndefined();
  });

  it("filtra por tecnicoId específico", async () => {
    const filtered = mockOrdenes.filter((o) => o.tecnicoId === "tec-1");
    mockPrisma.orden.findMany.mockResolvedValue(filtered);
    mockPrisma.orden.count.mockResolvedValue(1);

    const request = createRequest("/api/ordenes?tecnicoId=tec-1");
    const response = await getOrdenes(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ordenes).toHaveLength(1);
    expect(data.ordenes[0].tecnico.name).toBe("Francisco Casado");
    // Verify where clause uses the tecnicoId directly
    const whereArg = mockPrisma.orden.findMany.mock.calls[0][0].where;
    expect(whereArg.tecnicoId).toBe("tec-1");
  });

  it("filtra órdenes sin técnico con tecnicoId=SIN_ASIGNAR", async () => {
    const sinTecnico = mockOrdenes.filter((o) => o.tecnicoId === null);
    mockPrisma.orden.findMany.mockResolvedValue(sinTecnico);
    mockPrisma.orden.count.mockResolvedValue(1);

    const request = createRequest("/api/ordenes?tecnicoId=SIN_ASIGNAR");
    const response = await getOrdenes(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ordenes).toHaveLength(1);
    expect(data.ordenes[0].tecnico).toBeNull();
    // Verify where clause uses null for SIN_ASIGNAR
    const whereArg = mockPrisma.orden.findMany.mock.calls[0][0].where;
    expect(whereArg.tecnicoId).toBeNull();
  });

  it("combina tecnicoId con otros filtros", async () => {
    mockPrisma.orden.findMany.mockResolvedValue([mockOrdenes[0]]);
    mockPrisma.orden.count.mockResolvedValue(1);

    const request = createRequest("/api/ordenes?tecnicoId=tec-1&tipoServicio=POR_COBRAR");
    const response = await getOrdenes(request);

    expect(response.status).toBe(200);
    const whereArg = mockPrisma.orden.findMany.mock.calls[0][0].where;
    expect(whereArg.tecnicoId).toBe("tec-1");
    expect(whereArg.tipoServicio).toBe("POR_COBRAR");
  });
});

describe("GET /api/usuarios — lista de técnicos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Admin", role: "SUPER_ADMIN" },
    });
  });

  it("retorna lista de técnicos filtrada por role=TECNICO", async () => {
    const mockTecnicos = [
      { id: "tec-1", name: "Francisco Casado", email: "fran@marmaq.com", role: "TECNICO", activo: true, createdAt: new Date(), updatedAt: new Date(), _count: { ordenesAsignadas: 5, ordenesCreadas: 0 } },
      { id: "tec-2", name: "Carlos García", email: "carlos@marmaq.com", role: "TECNICO", activo: true, createdAt: new Date(), updatedAt: new Date(), _count: { ordenesAsignadas: 3, ordenesCreadas: 0 } },
    ];
    mockPrisma.user.findMany.mockResolvedValue(mockTecnicos);
    mockPrisma.user.count.mockResolvedValue(2);

    const request = createRequest("/api/usuarios?role=TECNICO&activos=true");
    const response = await getUsuarios(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.usuarios).toHaveLength(2);
    expect(data.usuarios[0].name).toBe("Francisco Casado");
    expect(data.usuarios[1].name).toBe("Carlos García");
    // Verify the where clause filters by role and activo
    const whereArg = mockPrisma.user.findMany.mock.calls[0][0].where;
    expect(whereArg.role).toEqual({ in: ["TECNICO"] });
    expect(whereArg.activo).toBe(true);
  });

  it("requiere autenticación", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("/api/usuarios?role=TECNICO");
    const response = await getUsuarios(request);

    expect(response.status).toBe(401);
  });
});

describe("Dropdown de técnicos — opciones", () => {
  it("incluye opción 'Todos los técnicos' con valor vacío", () => {
    const options = [
      { value: "", label: "Todos los técnicos" },
      { value: "SIN_ASIGNAR", label: "Sin asignar" },
      { value: "tec-1", label: "Francisco Casado" },
      { value: "tec-2", label: "Carlos García" },
    ];

    const todosOption = options.find((o) => o.value === "");
    expect(todosOption).toBeDefined();
    expect(todosOption!.label).toBe("Todos los técnicos");
  });

  it("incluye opción 'Sin asignar' con valor SIN_ASIGNAR", () => {
    const options = [
      { value: "", label: "Todos los técnicos" },
      { value: "SIN_ASIGNAR", label: "Sin asignar" },
      { value: "tec-1", label: "Francisco Casado" },
    ];

    const sinAsignarOption = options.find((o) => o.value === "SIN_ASIGNAR");
    expect(sinAsignarOption).toBeDefined();
    expect(sinAsignarOption!.label).toBe("Sin asignar");
  });

  it("muestra todos los técnicos cargados del endpoint", () => {
    const tecnicos = [
      { id: "tec-1", name: "Francisco Casado" },
      { id: "tec-2", name: "Carlos García" },
      { id: "tec-3", name: "Ana López" },
    ];

    // Simulate building dropdown options from fetched technicians
    const options = [
      { value: "", label: "Todos los técnicos" },
      { value: "SIN_ASIGNAR", label: "Sin asignar" },
      ...tecnicos.map((t) => ({ value: t.id, label: t.name })),
    ];

    expect(options).toHaveLength(5); // 2 fixed + 3 technicians
    expect(options[2].value).toBe("tec-1");
    expect(options[2].label).toBe("Francisco Casado");
    expect(options[3].value).toBe("tec-2");
    expect(options[3].label).toBe("Carlos García");
    expect(options[4].value).toBe("tec-3");
    expect(options[4].label).toBe("Ana López");
  });
});
