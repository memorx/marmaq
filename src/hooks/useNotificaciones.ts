"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TipoNotificacion, PrioridadNotif } from "@/types/notificaciones";

// ============ TIPOS ============

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  prioridad: PrioridadNotif;
  leida: boolean;
  fechaLeida: string | null;
  ordenId: string | null;
  orden: { id: string; folio: string } | null;
  createdAt: string;
}

interface NotificacionesResponse {
  notificaciones: Notificacion[];
  noLeidas: number;
  nextCursor: string | null;
}

interface UseNotificacionesOptions {
  /** Intervalo de polling en ms (default: 30000 = 30s) */
  pollingInterval?: number;
  /** Si polling está habilitado (default: true) */
  enablePolling?: boolean;
}

interface UseNotificacionesReturn {
  notificaciones: Notificacion[];
  noLeidas: number;
  cargando: boolean;
  error: string | null;
  nuevaNotificacion: Notificacion | null;
  marcarLeida: (id: string) => Promise<void>;
  marcarTodasLeidas: () => Promise<void>;
  refetch: () => Promise<void>;
  clearNuevaNotificacion: () => void;
}

// ============ HOOK ============

export function useNotificaciones(
  options: UseNotificacionesOptions = {}
): UseNotificacionesReturn {
  const { pollingInterval = 30000, enablePolling = true } = options;

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevaNotificacion, setNuevaNotificacion] =
    useState<Notificacion | null>(null);

  // Track previous notification IDs to detect new ones
  const prevNotifIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);

  const fetchNotificaciones = useCallback(async () => {
    try {
      const response = await fetch("/api/notificaciones?limit=20");

      if (!response.ok) {
        throw new Error("Error al cargar notificaciones");
      }

      const data: NotificacionesResponse = await response.json();

      // Detect new notifications (only after first fetch)
      if (!isFirstFetchRef.current && data.notificaciones.length > 0) {
        const currentIds = new Set(data.notificaciones.map((n) => n.id));
        const newNotifs = data.notificaciones.filter(
          (n) => !prevNotifIdsRef.current.has(n.id) && !n.leida
        );

        if (newNotifs.length > 0) {
          // Show the most recent new notification as toast
          setNuevaNotificacion(newNotifs[0]);
        }

        prevNotifIdsRef.current = currentIds;
      } else if (isFirstFetchRef.current) {
        // Initialize the set on first fetch
        prevNotifIdsRef.current = new Set(
          data.notificaciones.map((n) => n.id)
        );
        isFirstFetchRef.current = false;
      }

      setNotificaciones(data.notificaciones);
      setNoLeidas(data.noLeidas);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }, []);

  const marcarLeida = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notificaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leida: true }),
      });

      if (!response.ok) {
        throw new Error("Error al marcar como leída");
      }

      // Update local state optimistically
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
      setNoLeidas((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }, []);

  const marcarTodasLeidas = useCallback(async () => {
    try {
      const response = await fetch("/api/notificaciones/marcar-todas", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Error al marcar todas como leídas");
      }

      // Update local state optimistically
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNoLeidas(0);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  }, []);

  const clearNuevaNotificacion = useCallback(() => {
    setNuevaNotificacion(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  // Polling with visibility and online awareness
  useEffect(() => {
    if (!enablePolling) return;

    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(fetchNotificaciones, pollingInterval);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Fetch immediately when tab becomes visible
        fetchNotificaciones();
        startPolling();
      } else {
        stopPolling();
      }
    };

    const handleOnline = () => {
      fetchNotificaciones();
      startPolling();
    };

    const handleOffline = () => {
      stopPolling();
    };

    // Start polling if document is visible
    if (document.visibilityState === "visible") {
      startPolling();
    }

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [enablePolling, pollingInterval, fetchNotificaciones]);

  return {
    notificaciones,
    noLeidas,
    cargando,
    error,
    nuevaNotificacion,
    marcarLeida,
    marcarTodasLeidas,
    refetch: fetchNotificaciones,
    clearNuevaNotificacion,
  };
}
