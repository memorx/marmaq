import { Prisma } from "@prisma/client";

/**
 * Error thrown when folio generation fails after max retries
 */
export class FolioGenerationError extends Error {
  constructor(message: string, public readonly attempts: number) {
    super(message);
    this.name = "FolioGenerationError";
  }
}

/**
 * Prisma error code for unique constraint violation
 */
const PRISMA_UNIQUE_CONSTRAINT_ERROR = "P2002";

/**
 * Maximum number of retry attempts for folio generation
 */
const MAX_RETRIES = 3;

/**
 * Type for the transaction client passed to generarFolio
 */
type TransactionClient = Omit<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Options for creating an order with automatic folio generation
 */
export interface CreateOrdenWithFolioOptions {
  /** The Prisma transaction client */
  tx: TransactionClient;
  /** Data for creating the order (without folio - it will be generated) */
  orderData: Omit<Prisma.OrdenCreateInput, "folio">;
  /** Include relations in the returned order */
  include?: Prisma.OrdenInclude;
}

/**
 * Result of folio generation
 */
export interface FolioGenerationResult {
  /** The generated folio string */
  folio: string;
  /** Number of attempts it took to generate the folio */
  attempts: number;
}

/**
 * Generates the next folio number based on existing orders
 * Format: OS-{YEAR}-{MM}-{NNN} (e.g., OS-2026-02-001)
 *
 * @param tx - Prisma transaction client
 * @returns The generated folio string
 */
export async function consultarSiguienteFolio(
  tx: TransactionClient
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const prefix = `OS-${year}-${month}-`;

  const ultimaOrden = await tx.orden.findFirst({
    where: {
      folio: { startsWith: prefix },
    },
    orderBy: { folio: "desc" },
    select: { folio: true },
  });

  let nuevoNumero = 1;
  if (ultimaOrden) {
    const partes = ultimaOrden.folio.split("-");
    const ultimoNumero = parseInt(partes[3], 10);
    nuevoNumero = ultimoNumero + 1;
  }

  return `${prefix}${nuevoNumero.toString().padStart(3, "0")}`;
}

/**
 * Checks if an error is a Prisma unique constraint violation (P2002)
 */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR
  );
}

/**
 * Waits for a short random delay (exponential backoff with jitter)
 * This helps spread out concurrent retry attempts
 */
async function waitWithBackoff(attempt: number): Promise<void> {
  const baseDelay = 10; // 10ms base
  const maxJitter = 20; // up to 20ms random jitter
  const delay = baseDelay * Math.pow(2, attempt) + Math.random() * maxJitter;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Creates an order with automatic folio generation and retry logic for race conditions.
 *
 * This function handles the case where two concurrent requests might try to create
 * orders with the same folio. If a unique constraint violation (P2002) occurs,
 * it will retry up to MAX_RETRIES times, re-querying for the latest folio each time.
 *
 * @param options - Configuration for creating the order
 * @returns The created order with the generated folio
 * @throws FolioGenerationError if all retry attempts fail
 * @throws Other Prisma errors are re-thrown
 *
 * @example
 * ```typescript
 * const orden = await prisma.$transaction(async (tx) => {
 *   return crearOrdenConFolio({
 *     tx,
 *     orderData: {
 *       tipoServicio: "POR_COBRAR",
 *       cliente: { connect: { id: clienteId } },
 *       // ... other fields
 *     },
 *     include: { cliente: true, tecnico: true }
 *   });
 * });
 * ```
 */
export async function crearOrdenConFolio<T extends Prisma.OrdenInclude>(
  options: CreateOrdenWithFolioOptions & { include?: T }
): Promise<Prisma.OrdenGetPayload<{ include: T }>> {
  const { tx, orderData, include } = options;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Generate a new folio (re-query on each attempt to get the latest)
      const folio = await consultarSiguienteFolio(tx);

      // Try to create the order with the generated folio
      const orden = await tx.orden.create({
        data: {
          ...orderData,
          folio,
        },
        include,
      });

      return orden;
    } catch (error) {

      // Only retry on unique constraint violations
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt < MAX_RETRIES - 1) {
        await waitWithBackoff(attempt);
      }
    }
  }

  // All retries exhausted
  throw new FolioGenerationError(
    `No se pudo generar un folio único después de ${MAX_RETRIES} intentos`,
    MAX_RETRIES
  );
}

/**
 * Generates a folio with retry logic (standalone version).
 * Use this if you need just the folio string without creating an order.
 *
 * Note: This is less safe than crearOrdenConFolio because there's a window
 * between getting the folio and using it where another request could claim it.
 *
 * @param tx - Prisma transaction client
 * @param createFn - Function that creates something with the folio, should throw on P2002
 * @returns The result with the successful folio and attempt count
 */
export async function generarFolioConRetry<TResult>(
  tx: TransactionClient,
  createFn: (folio: string) => Promise<TResult>
): Promise<{ result: TResult; folio: string; attempts: number }> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const folio = await consultarSiguienteFolio(tx);
      const result = await createFn(folio);
      return { result, folio, attempts: attempt + 1 };
    } catch (error) {

      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      if (attempt < MAX_RETRIES - 1) {
        await waitWithBackoff(attempt);
      }
    }
  }

  throw new FolioGenerationError(
    `No se pudo generar un folio único después de ${MAX_RETRIES} intentos`,
    MAX_RETRIES
  );
}

// Re-export for testing purposes
export const _internal = {
  MAX_RETRIES,
  PRISMA_UNIQUE_CONSTRAINT_ERROR,
  isUniqueConstraintError,
  waitWithBackoff,
};
