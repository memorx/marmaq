import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificacionDropdown } from "@/components/notificaciones/NotificacionDropdown";
import * as useNotificacionesModule from "@/hooks/useNotificaciones";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock useNotificaciones hook
vi.mock("@/hooks/useNotificaciones", async () => {
  const actual = await vi.importActual("@/hooks/useNotificaciones");
  return {
    ...actual,
    useNotificaciones: vi.fn(),
  };
});

describe("NotificacionDropdown", () => {
  const mockUseNotificaciones =
    useNotificacionesModule.useNotificaciones as ReturnType<typeof vi.fn>;

  const mockNotificaciones: useNotificacionesModule.Notificacion[] = [
    {
      id: "1",
      tipo: "ORDEN_CREADA",
      titulo: "Nueva orden",
      mensaje: "Se creó la orden ORD-001",
      prioridad: "NORMAL",
      leida: false,
      fechaLeida: null,
      ordenId: "order-1",
      orden: { id: "order-1", folio: "ORD-001" },
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      tipo: "CAMBIO_ESTADO",
      titulo: "Estado actualizado",
      mensaje: "La orden cambió a EN_REPARACION",
      prioridad: "ALTA",
      leida: true,
      fechaLeida: new Date().toISOString(),
      ordenId: "order-2",
      orden: { id: "order-2", folio: "ORD-002" },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  const defaultMockReturn = {
    notificaciones: mockNotificaciones,
    noLeidas: 1,
    cargando: false,
    error: null,
    nuevaNotificacion: null,
    marcarLeida: vi.fn(),
    marcarTodasLeidas: vi.fn(),
    refetch: vi.fn(),
    clearNuevaNotificacion: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotificaciones.mockReturnValue(defaultMockReturn);
  });

  it("renderiza el botón de la campana", () => {
    render(<NotificacionDropdown />);

    const button = screen.getByRole("button", { name: /notificaciones/i });
    expect(button).toBeInTheDocument();
  });

  it("muestra el contador de no leídas cuando hay notificaciones", () => {
    render(<NotificacionDropdown />);

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("muestra 99+ cuando hay más de 99 no leídas", () => {
    mockUseNotificaciones.mockReturnValue({
      ...defaultMockReturn,
      noLeidas: 150,
    });

    render(<NotificacionDropdown />);

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("no muestra contador cuando no hay notificaciones sin leer", () => {
    mockUseNotificaciones.mockReturnValue({
      ...defaultMockReturn,
      noLeidas: 0,
    });

    render(<NotificacionDropdown />);

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("abre el dropdown al hacer click en la campana", () => {
    render(<NotificacionDropdown />);

    const button = screen.getByRole("button", { name: /notificaciones/i });
    fireEvent.click(button);

    expect(screen.getByText("Notificaciones")).toBeInTheDocument();
    expect(screen.getByText("Nueva orden")).toBeInTheDocument();
  });

  it("cierra el dropdown al hacer click fuera", async () => {
    render(
      <div>
        <NotificacionDropdown />
        <div data-testid="outside">Outside</div>
      </div>
    );

    // Abrir dropdown
    const button = screen.getByRole("button", { name: /notificaciones/i });
    fireEvent.click(button);

    expect(screen.getByText("Notificaciones")).toBeInTheDocument();

    // Click fuera
    fireEvent.mouseDown(screen.getByTestId("outside"));

    await waitFor(() => {
      expect(screen.queryByText("Notificaciones")).not.toBeInTheDocument();
    });
  });

  it("cierra el dropdown con tecla Escape", async () => {
    render(<NotificacionDropdown />);

    // Abrir dropdown
    const button = screen.getByRole("button", { name: /notificaciones/i });
    fireEvent.click(button);

    expect(screen.getByText("Notificaciones")).toBeInTheDocument();

    // Presionar Escape
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByText("Notificaciones")).not.toBeInTheDocument();
    });
  });

  it("muestra botón 'Marcar todas como leídas' cuando hay no leídas", () => {
    render(<NotificacionDropdown />);

    const button = screen.getByRole("button", { name: /notificaciones/i });
    fireEvent.click(button);

    expect(screen.getByText("Marcar todas como leídas")).toBeInTheDocument();
  });

  it("no muestra botón 'Marcar todas como leídas' cuando no hay no leídas", () => {
    mockUseNotificaciones.mockReturnValue({
      ...defaultMockReturn,
      noLeidas: 0,
    });

    render(<NotificacionDropdown />);

    const button = screen.getByRole("button", { name: /notificaciones/i });
    fireEvent.click(button);

    expect(
      screen.queryByText("Marcar todas como leídas")
    ).not.toBeInTheDocument();
  });

  it("llama marcarTodasLeidas al hacer click en el botón", async () => {
    const marcarTodasLeidas = vi.fn();
    mockUseNotificaciones.mockReturnValue({
      ...defaultMockReturn,
      marcarTodasLeidas,
    });

    render(<NotificacionDropdown />);

    // Abrir dropdown
    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));

    // Click en marcar todas
    fireEvent.click(screen.getByText("Marcar todas como leídas"));

    await waitFor(() => {
      expect(marcarTodasLeidas).toHaveBeenCalled();
    });
  });

  it("llama marcarLeida al hacer click en una notificación no leída", async () => {
    const marcarLeida = vi.fn();
    mockUseNotificaciones.mockReturnValue({
      ...defaultMockReturn,
      marcarLeida,
    });

    render(<NotificacionDropdown />);

    // Abrir dropdown
    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));

    // Click en notificación no leída
    fireEvent.click(screen.getByText("Nueva orden"));

    await waitFor(() => {
      expect(marcarLeida).toHaveBeenCalledWith("1");
    });
  });

  it("navega a la orden al hacer click en una notificación con ordenId", async () => {
    render(<NotificacionDropdown />);

    // Abrir dropdown
    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));

    // Click en notificación
    fireEvent.click(screen.getByText("Nueva orden"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/ordenes/order-1");
    });
  });

  it("muestra spinner mientras carga", () => {
    mockUseNotificaciones.mockReturnValue({
      ...defaultMockReturn,
      cargando: true,
      notificaciones: [],
    });

    render(<NotificacionDropdown />);

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));

    // Buscar el spinner por clase de animación
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("muestra mensaje cuando no hay notificaciones", () => {
    mockUseNotificaciones.mockReturnValue({
      ...defaultMockReturn,
      notificaciones: [],
      noLeidas: 0,
    });

    render(<NotificacionDropdown />);

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));

    expect(screen.getByText("No hay notificaciones")).toBeInTheDocument();
  });

  it("muestra toast cuando hay nueva notificación", () => {
    const nuevaNotificacion: useNotificacionesModule.Notificacion = {
      id: "3",
      tipo: "PRIORIDAD_URGENTE",
      titulo: "Urgente!",
      mensaje: "Notificación urgente",
      prioridad: "URGENTE",
      leida: false,
      fechaLeida: null,
      ordenId: null,
      orden: null,
      createdAt: new Date().toISOString(),
    };

    mockUseNotificaciones.mockReturnValue({
      ...defaultMockReturn,
      nuevaNotificacion,
    });

    render(<NotificacionDropdown />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Urgente!")).toBeInTheDocument();
  });

  it("llama clearNuevaNotificacion al cerrar el toast", async () => {
    const clearNuevaNotificacion = vi.fn();
    const nuevaNotificacion: useNotificacionesModule.Notificacion = {
      id: "3",
      tipo: "ORDEN_CREADA",
      titulo: "Nueva",
      mensaje: "Test",
      prioridad: "NORMAL",
      leida: false,
      fechaLeida: null,
      ordenId: null,
      orden: null,
      createdAt: new Date().toISOString(),
    };

    mockUseNotificaciones.mockReturnValue({
      ...defaultMockReturn,
      nuevaNotificacion,
      clearNuevaNotificacion,
    });

    render(<NotificacionDropdown />);

    // Cerrar el toast
    fireEvent.click(screen.getByLabelText("Cerrar notificación"));

    // La animación necesita 300ms
    await waitFor(
      () => {
        expect(clearNuevaNotificacion).toHaveBeenCalled();
      },
      { timeout: 500 }
    );
  });

  it("muestra link a 'Ver todas las notificaciones' cuando hay notificaciones", () => {
    render(<NotificacionDropdown />);

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));

    expect(
      screen.getByText("Ver todas las notificaciones")
    ).toBeInTheDocument();
  });

  it("navega a /notificaciones al hacer click en 'Ver todas'", async () => {
    render(<NotificacionDropdown />);

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));
    fireEvent.click(screen.getByText("Ver todas las notificaciones"));

    expect(mockPush).toHaveBeenCalledWith("/notificaciones");
  });

  it("aplica estilo diferente a notificaciones leídas vs no leídas", () => {
    render(<NotificacionDropdown />);

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));

    // La notificación no leída debería tener el indicador azul
    const notifItems = screen.getAllByRole("button").filter(
      (btn) =>
        btn.textContent?.includes("Nueva orden") ||
        btn.textContent?.includes("Estado actualizado")
    );

    // Verificar que la primera (no leída) tiene el punto azul
    const unreadItem = notifItems.find((btn) =>
      btn.textContent?.includes("Nueva orden")
    );
    expect(unreadItem?.querySelector(".bg-blue-500")).toBeInTheDocument();

    // Verificar que la leída no tiene el punto azul
    const readItem = notifItems.find((btn) =>
      btn.textContent?.includes("Estado actualizado")
    );
    expect(readItem?.querySelector(".bg-blue-500")).not.toBeInTheDocument();
  });
});
