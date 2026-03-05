import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EvidenciaUpload } from "@/components/ordenes/EvidenciaUpload";

// Mock next/image to render a plain <img>
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
      src={props.src as string}
      alt={props.alt as string}
      className={props.className as string}
    />
  ),
}));

// Mock ImageLightbox
vi.mock("@/components/ui", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    isLoading,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    isLoading?: boolean;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled || isLoading} {...rest}>
      {children}
    </button>
  ),
  ImageLightbox: () => null,
}));

// Mock URL.createObjectURL / revokeObjectURL
let objectUrlCounter = 0;
beforeEach(() => {
  objectUrlCounter = 0;
  vi.stubGlobal(
    "URL",
    new Proxy(globalThis.URL, {
      get(target, prop) {
        if (prop === "createObjectURL") {
          return () => `blob:http://localhost/${++objectUrlCounter}`;
        }
        if (prop === "revokeObjectURL") {
          return () => {};
        }
        return Reflect.get(target, prop);
      },
    })
  );
  vi.restoreAllMocks();
});

function createFileList(files: File[]): FileList {
  const fileList = {
    length: files.length,
    item: (i: number) => files[i] || null,
    [Symbol.iterator]: function* () {
      for (const f of files) yield f;
    },
  } as unknown as FileList;
  for (let i = 0; i < files.length; i++) {
    Object.defineProperty(fileList, i, { value: files[i], enumerable: true });
  }
  return fileList;
}

function makeJpegFile(name = "photo.jpg", sizeMB = 0.001): File {
  const bytes = Math.round(sizeMB * 1024 * 1024);
  return new File([new Uint8Array(bytes)], name, { type: "image/jpeg" });
}

describe("EvidenciaUpload — preview uses native <img> (not next/image)", () => {
  it("renderiza <img> nativo para previews de blob URL", async () => {
    const { container } = render(
      <EvidenciaUpload ordenId="orden-1" tipo="RECEPCION" />
    );

    // Simulate file selection via the gallery input
    const inputs = container.querySelectorAll('input[type="file"]');
    const galleryInput = inputs[0]; // first is gallery, second is camera
    const file = makeJpegFile();
    const fileList = createFileList([file]);

    // Mock fetch to prevent actual upload — will resolve but we check preview first
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ evidencias: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    fireEvent.change(galleryInput, { target: { files: fileList } });

    // The preview <img> should appear with a blob: URL
    await waitFor(() => {
      const previewImg = container.querySelector(
        'img[src^="blob:"]'
      ) as HTMLImageElement | null;
      expect(previewImg).not.toBeNull();
      expect(previewImg!.src).toMatch(/^blob:/);
    });
  });
});

describe("EvidenciaUpload — auto-upload on file selection", () => {
  it("sube automáticamente al seleccionar archivo cuando hay ordenId", async () => {
    const mockEvidencia = {
      id: "ev-1",
      ordenId: "orden-1",
      tipo: "RECEPCION",
      url: "https://supabase.example.com/evidencias/photo.jpg",
      filename: "photo.jpg",
      descripcion: null,
      esVideo: false,
      createdAt: new Date().toISOString(),
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          message: "1 evidencia(s) subida(s)",
          evidencias: [mockEvidencia],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const onUploadComplete = vi.fn();

    const { container } = render(
      <EvidenciaUpload
        ordenId="orden-1"
        tipo="RECEPCION"
        onUploadComplete={onUploadComplete}
      />
    );

    const inputs = container.querySelectorAll('input[type="file"]');
    const galleryInput = inputs[0];
    const file = makeJpegFile();

    fireEvent.change(galleryInput, {
      target: { files: createFileList([file]) },
    });

    // fetch should be called automatically (auto-upload)
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    // Verify the POST request
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/ordenes/orden-1/evidencias");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);

    const formData = options.body as FormData;
    expect(formData.get("tipo")).toBe("RECEPCION");
    expect(formData.get("files")).toBeInstanceOf(File);

    // onUploadComplete should be called
    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith([mockEvidencia]);
    });
  });

  it("NO sube automáticamente sin ordenId (modo local)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const onFilesChange = vi.fn();

    const { container } = render(
      <EvidenciaUpload
        tipo="RECEPCION"
        onFilesChange={onFilesChange}
      />
    );

    const inputs = container.querySelectorAll('input[type="file"]');
    const galleryInput = inputs[0];
    const file = makeJpegFile();

    fireEvent.change(galleryInput, {
      target: { files: createFileList([file]) },
    });

    // fetch should NOT be called
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).not.toHaveBeenCalled();

    // onFilesChange should be called instead
    expect(onFilesChange).toHaveBeenCalledWith([file]);
  });

  it("muestra botón Reintentar cuando upload falla", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Error del servidor" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(
      <EvidenciaUpload ordenId="orden-1" tipo="RECEPCION" />
    );

    const inputs = container.querySelectorAll('input[type="file"]');
    const galleryInput = inputs[0];

    fireEvent.change(galleryInput, {
      target: { files: createFileList([makeJpegFile()]) },
    });

    // Wait for the failed upload
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    // Retry button should appear
    await waitFor(() => {
      expect(screen.getByText(/Reintentar/)).toBeInTheDocument();
    });
  });
});
