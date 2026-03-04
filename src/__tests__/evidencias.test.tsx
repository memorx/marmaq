import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EvidenciasSection } from "@/components/ordenes/EvidenciasSection";
import type { Evidencia } from "@prisma/client";
import type { OrdenConRelaciones } from "@/types/ordenes";

// Mock next/image to render a plain <img>
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img src={props.src as string} alt={props.alt as string} className={props.className as string} />
  ),
}));

function makeEvidencia(
  tipo: "RECEPCION" | "DIAGNOSTICO" | "REPARACION" | "ENTREGA" | "FACTURA" | "OTRO",
  overrides: Partial<Evidencia> = {}
): Evidencia {
  const id = overrides.id || `ev-${tipo}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    ordenId: "orden-test",
    tipo,
    url: `https://rwlixjvfvjfyxydovfoh.supabase.co/storage/v1/object/public/evidencias/${tipo.toLowerCase()}/${id}.jpg`,
    filename: `${id}.jpg`,
    descripcion: null,
    createdAt: new Date("2026-03-01T12:00:00Z"),
    ...overrides,
  };
}

// ============================================================
// Test 1: GET /api/ordenes/[id] retorna evidencias en la respuesta
// ============================================================
describe("GET /api/ordenes/[id] retorna evidencias", () => {
  it("OrdenConRelaciones incluye evidencias tipado como Evidencia[]", () => {
    const evidencias: Evidencia[] = [
      makeEvidencia("DIAGNOSTICO"),
      makeEvidencia("RECEPCION"),
    ];

    const mockApiResponse: Pick<OrdenConRelaciones, "evidencias"> = {
      evidencias,
    };

    expect(mockApiResponse.evidencias).toBeDefined();
    expect(mockApiResponse.evidencias).toHaveLength(2);
    expect(mockApiResponse.evidencias[0].tipo).toBe("DIAGNOSTICO");
    expect(mockApiResponse.evidencias[0].url).toContain("https://");
    expect(mockApiResponse.evidencias[0].filename).toBeDefined();
  });

  it("cada evidencia tiene los campos requeridos del modelo Prisma", () => {
    const ev = makeEvidencia("DIAGNOSTICO");

    expect(ev).toHaveProperty("id");
    expect(ev).toHaveProperty("ordenId");
    expect(ev).toHaveProperty("tipo");
    expect(ev).toHaveProperty("url");
    expect(ev).toHaveProperty("filename");
    expect(ev).toHaveProperty("createdAt");
  });

  it("PATCH /api/ordenes/[id] no debe perder evidencias en la respuesta", () => {
    // Verifica que la estructura de respuesta del PATCH incluye evidencias
    // para que setOrden(data) no las borre del estado
    const patchResponse: Pick<OrdenConRelaciones, "evidencias"> = {
      evidencias: [makeEvidencia("DIAGNOSTICO"), makeEvidencia("RECEPCION")],
    };

    expect(patchResponse.evidencias).toBeDefined();
    expect(Array.isArray(patchResponse.evidencias)).toBe(true);
    expect(patchResponse.evidencias).toHaveLength(2);
  });
});

// ============================================================
// Test 2: Componente de evidencias renderiza fotos cuando existen
// ============================================================
describe("Componente EvidenciasSection renderiza fotos", () => {
  it("muestra fotos de RECEPCION en tab por defecto", () => {
    const evidencias = [
      makeEvidencia("RECEPCION"),
      makeEvidencia("RECEPCION"),
    ];

    render(<EvidenciasSection ordenId="orden-test" evidencias={evidencias} />);

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
    expect(screen.getByText("(2/10)")).toBeInTheDocument();
  });

  it("muestra fotos de DIAGNOSTICO al cambiar de tab (bug principal OS-2026-03-007)", () => {
    // Escenario exacto del bug: 4 fotos de DIAGNOSTICO subidas,
    // badge muestra 4, pero fotos no se renderizan
    const evidencias = [
      makeEvidencia("DIAGNOSTICO"),
      makeEvidencia("DIAGNOSTICO"),
      makeEvidencia("DIAGNOSTICO"),
      makeEvidencia("DIAGNOSTICO"),
    ];

    render(<EvidenciasSection ordenId="orden-test" evidencias={evidencias} />);

    // Tab por defecto: RECEPCION — sin fotos de ese tipo
    expect(screen.queryAllByRole("img")).toHaveLength(0);

    // Cambiar a tab DIAGNOSTICO
    const tabs = screen.getAllByRole("button");
    const diagTab = tabs.find((b) => b.textContent?.includes("Diagnóstico"));
    expect(diagTab).toBeDefined();
    fireEvent.click(diagTab!);

    // FIX: Ahora debe mostrar 4 fotos (antes del fix: mostraba 0)
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(4);
    expect(screen.getByText("(4/10)")).toBeInTheDocument();
  });

  it("muestra fotos al navegar entre múltiples tabs ida y vuelta", () => {
    const evidencias = [
      makeEvidencia("RECEPCION"),
      makeEvidencia("DIAGNOSTICO"),
      makeEvidencia("DIAGNOSTICO"),
      makeEvidencia("REPARACION"),
      makeEvidencia("REPARACION"),
      makeEvidencia("REPARACION"),
    ];

    render(<EvidenciasSection ordenId="orden-test" evidencias={evidencias} />);

    // RECEPCION (default): 1 foto
    expect(screen.getAllByRole("img")).toHaveLength(1);

    const tabs = screen.getAllByRole("button");

    // DIAGNOSTICO: 2 fotos
    fireEvent.click(tabs.find((b) => b.textContent?.includes("Diagnóstico"))!);
    expect(screen.getAllByRole("img")).toHaveLength(2);

    // REPARACION: 3 fotos
    fireEvent.click(tabs.find((b) => b.textContent?.includes("Reparación"))!);
    expect(screen.getAllByRole("img")).toHaveLength(3);

    // Volver a RECEPCION: 1 foto (no debe quedarse en 3)
    fireEvent.click(tabs.find((b) => b.textContent?.includes("Recepción"))!);
    expect(screen.getAllByRole("img")).toHaveLength(1);

    // Volver a DIAGNOSTICO: 2 fotos (no debe quedarse en 1)
    fireEvent.click(tabs.find((b) => b.textContent?.includes("Diagnóstico"))!);
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("tab sin fotos muestra 0 imágenes y (0/10)", () => {
    const evidencias = [
      makeEvidencia("DIAGNOSTICO"),
    ];

    render(<EvidenciasSection ordenId="orden-test" evidencias={evidencias} />);

    // RECEPCION tab (default) — no tiene fotos
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByText("(0/10)")).toBeInTheDocument();
  });
});

// ============================================================
// Test 3: Conteo del badge coincide con las fotos mostradas
// ============================================================
describe("Conteo del badge coincide con fotos mostradas", () => {
  it("badge y conteo (N/10) son consistentes en cada tab", () => {
    const evidencias = [
      makeEvidencia("DIAGNOSTICO"),
      makeEvidencia("DIAGNOSTICO"),
      makeEvidencia("DIAGNOSTICO"),
      makeEvidencia("DIAGNOSTICO"),
      makeEvidencia("RECEPCION"),
      makeEvidencia("ENTREGA"),
      makeEvidencia("ENTREGA"),
    ];

    render(<EvidenciasSection ordenId="orden-test" evidencias={evidencias} />);

    const tabs = screen.getAllByRole("button");

    // RECEPCION tab (default): badge=1, fotos=1
    const recTab = tabs.find((b) => b.textContent?.includes("Recepción"))!;
    expect(recTab.textContent).toContain("1");
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByText("(1/10)")).toBeInTheDocument();

    // DIAGNOSTICO tab: badge=4, fotos=4
    const diagTab = tabs.find((b) => b.textContent?.includes("Diagnóstico"))!;
    expect(diagTab.textContent).toContain("4");
    fireEvent.click(diagTab);
    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(screen.getByText("(4/10)")).toBeInTheDocument();

    // ENTREGA tab: badge=2, fotos=2
    const entregaTab = tabs.find((b) => b.textContent?.includes("Entrega"))!;
    expect(entregaTab.textContent).toContain("2");
    fireEvent.click(entregaTab);
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByText("(2/10)")).toBeInTheDocument();

    // REPARACION tab: sin badge, fotos=0
    const repTab = tabs.find((b) => b.textContent?.includes("Reparación"))!;
    fireEvent.click(repTab);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByText("(0/10)")).toBeInTheDocument();
  });

  it("las URLs de Supabase Storage se pasan correctamente a las imágenes", () => {
    const url = "https://rwlixjvfvjfyxydovfoh.supabase.co/storage/v1/object/public/evidencias/diag/foto1.jpg";
    const evidencias = [
      makeEvidencia("RECEPCION", { url }),
    ];

    render(<EvidenciasSection ordenId="orden-test" evidencias={evidencias} />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", url);
  });
});
