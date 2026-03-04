import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import type { LightboxImage } from "@/components/ui/ImageLightbox";
import { EvidenciasSection } from "@/components/ordenes/EvidenciasSection";
import type { Evidencia } from "@prisma/client";

// Mock next/image to render a plain <img>
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
      src={props.src as string}
      alt={props.alt as string}
      className={props.className as string}
      data-testid={props["data-testid"] as string}
    />
  ),
}));

const sampleImages: LightboxImage[] = [
  { url: "https://example.com/foto1.jpg", tipo: "Recepción", filename: "foto1.jpg" },
  { url: "https://example.com/foto2.jpg", tipo: "Diagnóstico", filename: "foto2.jpg" },
  { url: "https://example.com/foto3.jpg", tipo: "Reparación", filename: "foto3.jpg" },
];

function makeEvidencia(
  tipo: "RECEPCION" | "DIAGNOSTICO" | "REPARACION" | "ENTREGA" | "FACTURA" | "OTRO",
  overrides: Partial<Evidencia> = {}
): Evidencia {
  const id = overrides.id || `ev-${tipo}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    ordenId: "orden-test",
    tipo,
    url: overrides.url || `https://example.com/evidencias/${id}.jpg`,
    filename: `${id}.jpg`,
    descripcion: null,
    esVideo: false,
    createdAt: new Date("2026-03-01T12:00:00Z"),
    ...overrides,
  };
}

describe("ImageLightbox — unit tests", () => {
  it("no renderiza nada cuando isOpen es false", () => {
    const { container } = render(
      <ImageLightbox
        images={sampleImages}
        initialIndex={0}
        isOpen={false}
        onClose={() => {}}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("muestra la imagen correcta según initialIndex", () => {
    render(
      <ImageLightbox
        images={sampleImages}
        initialIndex={1}
        isOpen={true}
        onClose={() => {}}
      />
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/foto2.jpg");
  });

  it("muestra indicador 'X de Y' correcto", () => {
    render(
      <ImageLightbox
        images={sampleImages}
        initialIndex={0}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText("1 de 3")).toBeInTheDocument();
  });

  it("muestra indicador correcto para segunda imagen", () => {
    render(
      <ImageLightbox
        images={sampleImages}
        initialIndex={1}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText("2 de 3")).toBeInTheDocument();
  });

  it("navega a la siguiente imagen con botón derecho", () => {
    render(
      <ImageLightbox
        images={sampleImages}
        initialIndex={0}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText("1 de 3")).toBeInTheDocument();

    const nextBtn = screen.getByLabelText("Imagen siguiente");
    fireEvent.click(nextBtn);

    expect(screen.getByText("2 de 3")).toBeInTheDocument();
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/foto2.jpg");
  });

  it("navega a la imagen anterior con botón izquierdo", () => {
    render(
      <ImageLightbox
        images={sampleImages}
        initialIndex={2}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText("3 de 3")).toBeInTheDocument();

    const prevBtn = screen.getByLabelText("Imagen anterior");
    fireEvent.click(prevBtn);

    expect(screen.getByText("2 de 3")).toBeInTheDocument();
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/foto2.jpg");
  });

  it("cicla al final/inicio al navegar más allá de los límites", () => {
    render(
      <ImageLightbox
        images={sampleImages}
        initialIndex={2}
        isOpen={true}
        onClose={() => {}}
      />
    );

    // At image 3, click next should go to image 1
    const nextBtn = screen.getByLabelText("Imagen siguiente");
    fireEvent.click(nextBtn);
    expect(screen.getByText("1 de 3")).toBeInTheDocument();
  });

  it("cierra con botón X", () => {
    const onClose = vi.fn();
    render(
      <ImageLightbox
        images={sampleImages}
        initialIndex={0}
        isOpen={true}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByLabelText("Cerrar");
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cierra con tecla Escape", () => {
    const onClose = vi.fn();
    render(
      <ImageLightbox
        images={sampleImages}
        initialIndex={0}
        isOpen={true}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("navega con teclas de flecha", () => {
    render(
      <ImageLightbox
        images={sampleImages}
        initialIndex={0}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText("1 de 3")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText("2 de 3")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByText("1 de 3")).toBeInTheDocument();
  });

  it("muestra el tipo de evidencia como label", () => {
    render(
      <ImageLightbox
        images={sampleImages}
        initialIndex={0}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText("Recepción")).toBeInTheDocument();
  });

  it("tiene role=dialog y aria-modal", () => {
    render(
      <ImageLightbox
        images={sampleImages}
        initialIndex={0}
        isOpen={true}
        onClose={() => {}}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("no muestra flechas de navegación con una sola imagen", () => {
    render(
      <ImageLightbox
        images={[sampleImages[0]]}
        initialIndex={0}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.queryByLabelText("Imagen anterior")).toBeNull();
    expect(screen.queryByLabelText("Imagen siguiente")).toBeNull();
    expect(screen.getByText("1 de 1")).toBeInTheDocument();
  });
});

describe("EvidenciasSection — lightbox integration", () => {
  it("se abre al hacer clic en thumbnail de evidencia", () => {
    const evidencias = [
      makeEvidencia("RECEPCION", { url: "https://example.com/rec1.jpg" }),
      makeEvidencia("RECEPCION", { url: "https://example.com/rec2.jpg" }),
    ];

    render(<EvidenciasSection ordenId="orden-test" evidencias={evidencias} />);

    // Click on first thumbnail
    const thumbnails = screen.getAllByRole("button", { name: /Ver foto/ });
    expect(thumbnails).toHaveLength(2);
    fireEvent.click(thumbnails[0]);

    // Lightbox should now be open
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("1 de 2")).toBeInTheDocument();
  });

  it("muestra la imagen correcta al abrir desde segundo thumbnail", () => {
    const evidencias = [
      makeEvidencia("RECEPCION", { url: "https://example.com/rec1.jpg" }),
      makeEvidencia("RECEPCION", { url: "https://example.com/rec2.jpg" }),
      makeEvidencia("RECEPCION", { url: "https://example.com/rec3.jpg" }),
    ];

    render(<EvidenciasSection ordenId="orden-test" evidencias={evidencias} />);

    // Click on second thumbnail
    const thumbnails = screen.getAllByRole("button", { name: /Ver foto/ });
    fireEvent.click(thumbnails[1]);

    expect(screen.getByText("2 de 3")).toBeInTheDocument();
    // The lightbox image should show the second URL
    const images = screen.getAllByRole("img");
    const lightboxImg = images.find((img) => img.getAttribute("src") === "https://example.com/rec2.jpg");
    expect(lightboxImg).toBeDefined();
  });

  it("muestra icono de play y badge VIDEO para evidencias de video", () => {
    const evidencias = [
      makeEvidencia("RECEPCION", {
        url: "https://example.com/clip.mp4",
        filename: "clip.mp4",
        esVideo: true,
      }),
      makeEvidencia("RECEPCION", { url: "https://example.com/foto.jpg" }),
    ];

    render(<EvidenciasSection ordenId="orden-test" evidencias={evidencias} />);

    // Should show the VIDEO badge for the video evidencia
    expect(screen.getByText("VIDEO")).toBeInTheDocument();
  });
});

describe("ImageLightbox — video support", () => {
  it("renderiza <video> para items con isVideo=true", () => {
    const images: LightboxImage[] = [
      { url: "https://example.com/clip.mp4", tipo: "Recepción", filename: "clip.mp4", isVideo: true },
      { url: "https://example.com/foto.jpg", tipo: "Diagnóstico", filename: "foto.jpg", isVideo: false },
    ];

    const { container } = render(
      <ImageLightbox
        images={images}
        initialIndex={0}
        isOpen={true}
        onClose={() => {}}
      />
    );

    // Should render a <video> element for the first item
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe("https://example.com/clip.mp4");
    expect(video?.hasAttribute("controls")).toBe(true);

    // Should NOT render <img> in the main content area (only the close/nav icons)
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBe(0);
  });

  it("renderiza <img> al navegar de video a imagen", () => {
    const images: LightboxImage[] = [
      { url: "https://example.com/clip.mp4", tipo: "Recepción", filename: "clip.mp4", isVideo: true },
      { url: "https://example.com/foto.jpg", tipo: "Diagnóstico", filename: "foto.jpg", isVideo: false },
    ];

    const { container } = render(
      <ImageLightbox
        images={images}
        initialIndex={0}
        isOpen={true}
        onClose={() => {}}
      />
    );

    // Navigate to next (image)
    const nextBtn = screen.getByLabelText("Imagen siguiente");
    fireEvent.click(nextBtn);

    // Should now render <img> and no <video>
    const video = container.querySelector("video");
    expect(video).toBeNull();
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("https://example.com/foto.jpg");
  });
});
