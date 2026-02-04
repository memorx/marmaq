import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NotificacionToast } from "@/components/notificaciones/NotificacionToast";
import type { Notificacion } from "@/hooks/useNotificaciones";

describe("NotificacionToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockNotificacion: Notificacion = {
    id: "1",
    tipo: "ORDEN_CREADA",
    titulo: "Nueva orden creada",
    mensaje: "Se ha creado la orden ORD-001 para el cliente Juan",
    prioridad: "NORMAL",
    leida: false,
    fechaLeida: null,
    ordenId: "order-123",
    orden: { id: "order-123", folio: "ORD-001" },
    createdAt: "2024-01-15T10:00:00Z",
  };

  it("renderiza el título y mensaje de la notificación", () => {
    render(<NotificacionToast notificacion={mockNotificacion} onClose={vi.fn()} />);

    expect(screen.getByText("Nueva orden creada")).toBeInTheDocument();
    expect(
      screen.getByText("Se ha creado la orden ORD-001 para el cliente Juan")
    ).toBeInTheDocument();
  });

  it("muestra el folio de la orden si existe", () => {
    render(<NotificacionToast notificacion={mockNotificacion} onClose={vi.fn()} />);

    expect(screen.getByText("Folio: ORD-001")).toBeInTheDocument();
  });

  it("no muestra folio si no hay orden asociada", () => {
    const notifSinOrden = { ...mockNotificacion, orden: null, ordenId: null };
    render(<NotificacionToast notificacion={notifSinOrden} onClose={vi.fn()} />);

    expect(screen.queryByText(/Folio:/)).not.toBeInTheDocument();
  });

  it("llama onClose al hacer click en el botón de cerrar", () => {
    const onClose = vi.fn();
    render(<NotificacionToast notificacion={mockNotificacion} onClose={onClose} />);

    const closeButton = screen.getByLabelText("Cerrar notificación");
    fireEvent.click(closeButton);

    // Esperar la animación
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onClose).toHaveBeenCalled();
  });

  it("se auto-cierra después del tiempo especificado", () => {
    const onClose = vi.fn();
    render(
      <NotificacionToast
        notificacion={mockNotificacion}
        onClose={onClose}
        autoDismiss={3000}
      />
    );

    expect(onClose).not.toHaveBeenCalled();

    // Avanzar el tiempo de auto-dismiss
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Esperar la animación de salida
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onClose).toHaveBeenCalled();
  });

  it("no se auto-cierra si autoDismiss es 0", () => {
    const onClose = vi.fn();
    render(
      <NotificacionToast
        notificacion={mockNotificacion}
        onClose={onClose}
        autoDismiss={0}
      />
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("usa el tiempo de auto-dismiss por defecto de 5000ms", () => {
    const onClose = vi.fn();
    render(<NotificacionToast notificacion={mockNotificacion} onClose={onClose} />);

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    // Esperar animación
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onClose).toHaveBeenCalled();
  });

  it("llama onVerOrden al hacer click si hay ordenId", () => {
    const onClose = vi.fn();
    const onVerOrden = vi.fn();
    render(
      <NotificacionToast
        notificacion={mockNotificacion}
        onClose={onClose}
        onVerOrden={onVerOrden}
      />
    );

    const toast = screen.getByRole("alert");
    fireEvent.click(toast);

    expect(onVerOrden).toHaveBeenCalledWith("order-123");
  });

  it("no llama onVerOrden si no hay ordenId", () => {
    const onClose = vi.fn();
    const onVerOrden = vi.fn();
    const notifSinOrden = { ...mockNotificacion, orden: null, ordenId: null };

    render(
      <NotificacionToast
        notificacion={notifSinOrden}
        onClose={onClose}
        onVerOrden={onVerOrden}
      />
    );

    const toast = screen.getByRole("alert");
    fireEvent.click(toast);

    expect(onVerOrden).not.toHaveBeenCalled();
  });

  it("aplica estilo de prioridad URGENTE", () => {
    const notifUrgente = { ...mockNotificacion, prioridad: "URGENTE" as const };
    render(<NotificacionToast notificacion={notifUrgente} onClose={vi.fn()} />);

    const toast = screen.getByRole("alert");
    expect(toast.className).toContain("bg-red-50");
    expect(toast.className).toContain("border-red-200");
  });

  it("aplica estilo de prioridad ALTA", () => {
    const notifAlta = { ...mockNotificacion, prioridad: "ALTA" as const };
    render(<NotificacionToast notificacion={notifAlta} onClose={vi.fn()} />);

    const toast = screen.getByRole("alert");
    expect(toast.className).toContain("bg-orange-50");
    expect(toast.className).toContain("border-orange-200");
  });

  it("aplica estilo de prioridad BAJA", () => {
    const notifBaja = { ...mockNotificacion, prioridad: "BAJA" as const };
    render(<NotificacionToast notificacion={notifBaja} onClose={vi.fn()} />);

    const toast = screen.getByRole("alert");
    expect(toast.className).toContain("bg-gray-50");
    expect(toast.className).toContain("border-gray-200");
  });

  it("tiene role='alert' para accesibilidad", () => {
    render(<NotificacionToast notificacion={mockNotificacion} onClose={vi.fn()} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("el botón de cerrar detiene la propagación del evento", () => {
    const onClose = vi.fn();
    const onVerOrden = vi.fn();

    render(
      <NotificacionToast
        notificacion={mockNotificacion}
        onClose={onClose}
        onVerOrden={onVerOrden}
      />
    );

    const closeButton = screen.getByLabelText("Cerrar notificación");
    fireEvent.click(closeButton);

    // Solo onClose debería llamarse, no onVerOrden
    expect(onVerOrden).not.toHaveBeenCalled();
  });
});
