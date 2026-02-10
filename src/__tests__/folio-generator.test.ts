import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  consultarSiguienteFolio,
  crearOrdenConFolio,
  generarFolioConRetry,
  FolioGenerationError,
  _internal,
} from "@/lib/utils/folio-generator";

// Mock del cliente de transacción de Prisma
function createMockTx() {
  return {
    orden: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
}

// Helper para crear errores P2002 (unique constraint violation)
function createP2002Error(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.0.0",
  });
}

// Helper para crear otros errores de Prisma
function createOtherPrismaError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "5.0.0",
  });
}

describe("consultarSiguienteFolio", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  it("genera OS-{YEAR}-{MM}-001 cuando no hay órdenes previas", async () => {
    const mockTx = createMockTx();
    mockTx.orden.findFirst.mockResolvedValue(null);

    const folio = await consultarSiguienteFolio(mockTx);

    expect(folio).toBe("OS-2025-06-001");
    expect(mockTx.orden.findFirst).toHaveBeenCalledWith({
      where: { folio: { startsWith: "OS-2025-06-" } },
      orderBy: { folio: "desc" },
      select: { folio: true },
    });
  });

  it("incrementa correctamente el número: 001 → 002", async () => {
    const mockTx = createMockTx();
    mockTx.orden.findFirst.mockResolvedValue({ folio: "OS-2025-06-001" });

    const folio = await consultarSiguienteFolio(mockTx);

    expect(folio).toBe("OS-2025-06-002");
  });

  it("maneja números altos correctamente: 999 → 1000", async () => {
    const mockTx = createMockTx();
    mockTx.orden.findFirst.mockResolvedValue({ folio: "OS-2025-06-999" });

    const folio = await consultarSiguienteFolio(mockTx);

    expect(folio).toBe("OS-2025-06-1000");
  });

  it("maneja el padding a 3 dígitos", async () => {
    const mockTx = createMockTx();
    mockTx.orden.findFirst.mockResolvedValue({ folio: "OS-2025-06-099" });

    const folio = await consultarSiguienteFolio(mockTx);

    expect(folio).toBe("OS-2025-06-100");
  });

  it("usa el año y mes actual", async () => {
    const mockTx = createMockTx();
    mockTx.orden.findFirst.mockResolvedValue(null);

    // El año ya está seteado a 2025-06 en beforeEach
    const folio = await consultarSiguienteFolio(mockTx);

    // Verificar que usa el año y mes actual (2025-06 del fake timer)
    expect(folio).toMatch(/^OS-2025-06-001$/);
    expect(folio.split("-")[1]).toBe("2025");
    expect(folio.split("-")[2]).toBe("06");
    expect(mockTx.orden.findFirst).toHaveBeenCalledWith({
      where: { folio: { startsWith: "OS-2025-06-" } },
      orderBy: { folio: "desc" },
      select: { folio: true },
    });
  });

  it("parsea correctamente folios existentes", async () => {
    const mockTx = createMockTx();
    mockTx.orden.findFirst.mockResolvedValue({ folio: "OS-2025-06-157" });

    const folio = await consultarSiguienteFolio(mockTx);

    expect(folio).toBe("OS-2025-06-158");
  });
});

describe("generarFolioConRetry - retry logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  it("reintenta cuando hay colisión P2002 en el create", async () => {
    const mockTx = createMockTx();
    let callCount = 0;

    mockTx.orden.findFirst
      .mockResolvedValueOnce({ folio: "OS-2025-06-001" }) // Primera consulta
      .mockResolvedValueOnce({ folio: "OS-2025-06-002" }); // Segunda consulta después del retry

    const createFn = vi.fn().mockImplementation(async (folio: string) => {
      callCount++;
      if (callCount === 1) {
        throw createP2002Error();
      }
      return { id: "orden-123", folio };
    });

    const resultPromise = generarFolioConRetry(mockTx, createFn);

    // Avanzar timers para el backoff
    await vi.advanceTimersByTimeAsync(100);

    const { result, folio, attempts } = await resultPromise;

    expect(createFn).toHaveBeenCalledTimes(2);
    expect(attempts).toBe(2);
    expect(folio).toBe("OS-2025-06-003");
    expect(result.folio).toBe("OS-2025-06-003");
  });

  it("genera un nuevo folio en cada reintento (no el mismo)", async () => {
    const mockTx = createMockTx();
    const foliosConsultados: string[] = [];

    mockTx.orden.findFirst
      .mockResolvedValueOnce({ folio: "OS-2025-06-005" })
      .mockResolvedValueOnce({ folio: "OS-2025-06-006" })
      .mockResolvedValueOnce({ folio: "OS-2025-06-007" });

    const createFn = vi.fn().mockImplementation(async (folio: string) => {
      foliosConsultados.push(folio);
      if (foliosConsultados.length < 3) {
        throw createP2002Error();
      }
      return { id: "orden-123", folio };
    });

    const resultPromise = generarFolioConRetry(mockTx, createFn);
    await vi.advanceTimersByTimeAsync(500);
    await resultPromise;

    // Cada reintento debe consultar un folio diferente (incrementado)
    expect(foliosConsultados).toEqual([
      "OS-2025-06-006",
      "OS-2025-06-007",
      "OS-2025-06-008",
    ]);
  });

  it("falla después de 3 intentos máximo", async () => {
    const mockTx = createMockTx();

    mockTx.orden.findFirst.mockResolvedValue({ folio: "OS-2025-06-001" });

    const createFn = vi.fn().mockRejectedValue(createP2002Error());

    // Capturar la promesa y prevenir "unhandled rejection" agregando un .catch temprano
    const promise = generarFolioConRetry(mockTx, createFn);
    // Prevenir unhandled rejection
    promise.catch(() => {});

    // Avanzar todos los timers
    await vi.runAllTimersAsync();

    // Ahora verificar que la promesa fue rechazada correctamente
    await expect(promise).rejects.toBeInstanceOf(FolioGenerationError);
    expect(createFn).toHaveBeenCalledTimes(_internal.MAX_RETRIES);
  });

  it("el retry exitoso devuelve el folio correcto", async () => {
    const mockTx = createMockTx();

    mockTx.orden.findFirst
      .mockResolvedValueOnce({ folio: "OS-2025-06-010" })
      .mockResolvedValueOnce({ folio: "OS-2025-06-011" });

    const createFn = vi
      .fn()
      .mockRejectedValueOnce(createP2002Error())
      .mockResolvedValueOnce({ id: "orden-abc", folio: "OS-2025-06-012" });

    const resultPromise = generarFolioConRetry(mockTx, createFn);
    await vi.advanceTimersByTimeAsync(100);
    const { result, folio, attempts } = await resultPromise;

    expect(folio).toBe("OS-2025-06-012");
    expect(result.folio).toBe("OS-2025-06-012");
    expect(attempts).toBe(2);
  });

  it("no reintenta para errores que no son P2002", async () => {
    const mockTx = createMockTx();

    mockTx.orden.findFirst.mockResolvedValue({ folio: "OS-2025-06-001" });

    const otherError = createOtherPrismaError();
    const createFn = vi.fn().mockRejectedValue(otherError);

    await expect(generarFolioConRetry(mockTx, createFn)).rejects.toThrow(
      "Record not found"
    );
    expect(createFn).toHaveBeenCalledTimes(1);
  });
});

describe("crearOrdenConFolio", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  it("crea una orden con folio generado automáticamente", async () => {
    const mockTx = createMockTx();

    mockTx.orden.findFirst.mockResolvedValue(null);
    mockTx.orden.create.mockResolvedValue({
      id: "orden-123",
      folio: "OS-2025-06-001",
      tipoServicio: "POR_COBRAR",
    });

    const orden = await crearOrdenConFolio({
      tx: mockTx,
      orderData: {
        tipoServicio: "POR_COBRAR",
        cliente: { connect: { id: "cliente-1" } },
        creadoPor: { connect: { id: "user-1" } },
        marcaEquipo: "Torrey",
        modeloEquipo: "L-EQ",
        fallaReportada: "No enciende",
      },
      include: { cliente: true },
    });

    expect(orden.folio).toBe("OS-2025-06-001");
    expect(mockTx.orden.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        folio: "OS-2025-06-001",
        tipoServicio: "POR_COBRAR",
      }),
      include: { cliente: true },
    });
  });

  it("reintenta con nuevo folio cuando hay colisión", async () => {
    const mockTx = createMockTx();

    mockTx.orden.findFirst
      .mockResolvedValueOnce({ folio: "OS-2025-06-001" })
      .mockResolvedValueOnce({ folio: "OS-2025-06-002" });

    mockTx.orden.create
      .mockRejectedValueOnce(createP2002Error())
      .mockResolvedValueOnce({
        id: "orden-456",
        folio: "OS-2025-06-003",
      });

    const resultPromise = crearOrdenConFolio({
      tx: mockTx,
      orderData: {
        tipoServicio: "GARANTIA",
        cliente: { connect: { id: "cliente-1" } },
        creadoPor: { connect: { id: "user-1" } },
        marcaEquipo: "Torrey",
        modeloEquipo: "L-EQ",
        fallaReportada: "Falla",
      },
    });

    await vi.advanceTimersByTimeAsync(100);
    const orden = await resultPromise;

    expect(mockTx.orden.create).toHaveBeenCalledTimes(2);
    expect(orden.folio).toBe("OS-2025-06-003");
  });
});

describe("folio format validation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  it("el folio cumple con el regex /^OS-\\d{4}-\\d{2}-\\d{3}$/ para números hasta 999", async () => {
    const mockTx = createMockTx();
    const folioRegex = /^OS-\d{4}-\d{2}-\d{3,}$/;

    // Test con diferentes escenarios
    const testCases = [
      null, // Primera orden del mes -> 001
      { folio: "OS-2025-06-001" }, // -> 002
      { folio: "OS-2025-06-099" }, // -> 100
      { folio: "OS-2025-06-999" }, // -> 1000
    ];

    for (const lastOrder of testCases) {
      mockTx.orden.findFirst.mockResolvedValueOnce(lastOrder);
      const folio = await consultarSiguienteFolio(mockTx);
      expect(folio).toMatch(folioRegex);
    }
  });

  it("el folio nunca tiene números negativos", async () => {
    const mockTx = createMockTx();

    // Simular caso donde el parse pudiera dar negativo (edge case)
    mockTx.orden.findFirst.mockResolvedValue({ folio: "OS-2025-06-000" });

    const folio = await consultarSiguienteFolio(mockTx);

    // El número parseado de "000" es 0, incrementado a 1
    expect(folio).toBe("OS-2025-06-001");
    const numero = parseInt(folio.split("-")[3], 10);
    expect(numero).toBeGreaterThan(0);
  });

  it("el folio nunca empieza en 000", async () => {
    const mockTx = createMockTx();

    // Cuando no hay órdenes previas, debe empezar en 001, no 000
    mockTx.orden.findFirst.mockResolvedValue(null);

    const folio = await consultarSiguienteFolio(mockTx);

    expect(folio).toBe("OS-2025-06-001");
    expect(folio).not.toContain("-000");
  });

  it("maneja correctamente números de 4+ dígitos", async () => {
    const mockTx = createMockTx();

    // Caso extremo: más de 999 órdenes en un mes
    mockTx.orden.findFirst.mockResolvedValue({ folio: "OS-2025-06-1234" });

    const folio = await consultarSiguienteFolio(mockTx);

    // Debe incrementar correctamente aunque exceda 3 dígitos
    expect(folio).toBe("OS-2025-06-1235");
  });
});

describe("FolioGenerationError", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  it("incluye el número de intentos en el error", async () => {
    const mockTx = createMockTx();
    mockTx.orden.findFirst.mockResolvedValue(null);

    const createFn = vi.fn().mockRejectedValue(createP2002Error());

    // Crear la promesa y prevenir unhandled rejection
    const promise = generarFolioConRetry(mockTx, createFn);
    let caughtError: FolioGenerationError | null = null;
    promise.catch((e) => {
      caughtError = e;
    });

    // Avanzar todos los timers
    await vi.runAllTimersAsync();

    // Esperar un tick para que el catch se ejecute
    await Promise.resolve();

    // Verificar las propiedades del error
    expect(caughtError).toBeInstanceOf(FolioGenerationError);
    expect(caughtError!.attempts).toBe(3);
    expect(caughtError!.name).toBe("FolioGenerationError");
  });
});

describe("_internal helpers", () => {
  it("isUniqueConstraintError identifica errores P2002", () => {
    const p2002Error = createP2002Error();
    const otherError = createOtherPrismaError();
    const genericError = new Error("Generic error");

    expect(_internal.isUniqueConstraintError(p2002Error)).toBe(true);
    expect(_internal.isUniqueConstraintError(otherError)).toBe(false);
    expect(_internal.isUniqueConstraintError(genericError)).toBe(false);
    expect(_internal.isUniqueConstraintError(null)).toBe(false);
    expect(_internal.isUniqueConstraintError(undefined)).toBe(false);
  });

  it("MAX_RETRIES es 3", () => {
    expect(_internal.MAX_RETRIES).toBe(3);
  });
});
