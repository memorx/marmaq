import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useNotificaciones } from "@/hooks/useNotificaciones";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useNotificaciones", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockNotificacionesResponse = {
    notificaciones: [
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
        createdAt: "2024-01-15T10:00:00Z",
      },
      {
        id: "2",
        tipo: "CAMBIO_ESTADO",
        titulo: "Estado actualizado",
        mensaje: "La orden cambió a EN_REPARACION",
        prioridad: "NORMAL",
        leida: true,
        fechaLeida: "2024-01-15T11:00:00Z",
        ordenId: "order-2",
        orden: { id: "order-2", folio: "ORD-002" },
        createdAt: "2024-01-15T09:00:00Z",
      },
    ],
    noLeidas: 1,
    nextCursor: null,
  };

  it("carga notificaciones al montar", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockNotificacionesResponse),
    });

    const { result } = renderHook(() =>
      useNotificaciones({ enablePolling: false })
    );

    expect(result.current.cargando).toBe(true);

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(result.current.notificaciones).toHaveLength(2);
    expect(result.current.noLeidas).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("maneja errores de fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() =>
      useNotificaciones({ enablePolling: false })
    );

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(result.current.error).toBe("Error al cargar notificaciones");
    expect(result.current.notificaciones).toHaveLength(0);
  });

  it("marca una notificación como leída optimísticamente", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNotificacionesResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    const { result } = renderHook(() =>
      useNotificaciones({ enablePolling: false })
    );

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    // Marcar como leída
    await act(async () => {
      await result.current.marcarLeida("1");
    });

    // Verificar actualización optimista
    expect(result.current.notificaciones[0].leida).toBe(true);
    expect(result.current.noLeidas).toBe(0);

    // Verificar que se hizo la llamada
    expect(mockFetch).toHaveBeenCalledWith("/api/notificaciones/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leida: true }),
    });
  });

  it("marca todas las notificaciones como leídas", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNotificacionesResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ actualizadas: 1 }),
      });

    const { result } = renderHook(() =>
      useNotificaciones({ enablePolling: false })
    );

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    await act(async () => {
      await result.current.marcarTodasLeidas();
    });

    // Verificar actualización optimista
    expect(result.current.notificaciones.every((n) => n.leida)).toBe(true);
    expect(result.current.noLeidas).toBe(0);

    // Verificar llamada
    expect(mockFetch).toHaveBeenCalledWith("/api/notificaciones/marcar-todas", {
      method: "POST",
    });
  });

  it("refetch recarga las notificaciones", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNotificacionesResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ ...mockNotificacionesResponse, noLeidas: 5 }),
      });

    const { result } = renderHook(() =>
      useNotificaciones({ enablePolling: false })
    );

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(result.current.noLeidas).toBe(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.noLeidas).toBe(5);
  });

  it("clearNuevaNotificacion limpia la notificación nueva", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockNotificacionesResponse),
    });

    const { result } = renderHook(() =>
      useNotificaciones({ enablePolling: false })
    );

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    // La nueva notificación es null inicialmente
    expect(result.current.nuevaNotificacion).toBeNull();

    // clearNuevaNotificacion debería funcionar sin errores
    act(() => {
      result.current.clearNuevaNotificacion();
    });

    expect(result.current.nuevaNotificacion).toBeNull();
  });

  it("no hace polling cuando enablePolling es false", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockNotificacionesResponse),
    });

    renderHook(() => useNotificaciones({ enablePolling: false }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Wait a bit to make sure no more calls happen
    await new Promise((r) => setTimeout(r, 100));

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("tiene estado inicial correcto", () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        new Promise(() => {
          /* never resolves */
        }),
    });

    const { result } = renderHook(() =>
      useNotificaciones({ enablePolling: false })
    );

    expect(result.current.cargando).toBe(true);
    expect(result.current.notificaciones).toEqual([]);
    expect(result.current.noLeidas).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.nuevaNotificacion).toBeNull();
  });

  it("maneja error de red", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() =>
      useNotificaciones({ enablePolling: false })
    );

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
  });

  it("no decrementa noLeidas por debajo de 0", async () => {
    const responseWithZero = {
      ...mockNotificacionesResponse,
      noLeidas: 0,
      notificaciones: [
        { ...mockNotificacionesResponse.notificaciones[0], leida: false },
      ],
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseWithZero),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    const { result } = renderHook(() =>
      useNotificaciones({ enablePolling: false })
    );

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(result.current.noLeidas).toBe(0);

    await act(async () => {
      await result.current.marcarLeida("1");
    });

    // Should stay at 0, not go negative
    expect(result.current.noLeidas).toBe(0);
  });

  it("expone función refetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockNotificacionesResponse),
    });

    const { result } = renderHook(() =>
      useNotificaciones({ enablePolling: false })
    );

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(typeof result.current.refetch).toBe("function");
  });
});
