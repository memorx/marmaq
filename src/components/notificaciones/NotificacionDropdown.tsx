"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  Check,
  Loader2,
} from "lucide-react";
import { TipoNotificacion, PrioridadNotif } from "@/types/notificaciones";
import { useNotificaciones, type Notificacion } from "@/hooks/useNotificaciones";
import { NotificacionToast } from "./NotificacionToast";
import { tiempoRelativo } from "@/lib/utils/tiempo-relativo";

// ============ TIPOS E ICONOS ============

const iconMap: Record<TipoNotificacion, typeof Bell> = {
  ORDEN_CREADA: Bell,
  ESTADO_CAMBIADO: Info,
  ORDEN_CANCELADA: AlertTriangle,
  TECNICO_REASIGNADO: CheckCircle,
  PRIORIDAD_URGENTE: AlertTriangle,
  COTIZACION_MODIFICADA: Info,
  ALERTA_AMARILLO: AlertTriangle,
  ALERTA_ROJO: AlertTriangle,
  STOCK_BAJO: AlertTriangle,
};

const iconColorMap: Record<PrioridadNotif, string> = {
  BAJA: "text-gray-500",
  NORMAL: "text-blue-500",
  ALTA: "text-orange-500",
  URGENTE: "text-red-500",
};

const bgColorMap: Record<PrioridadNotif, string> = {
  BAJA: "bg-gray-50",
  NORMAL: "bg-blue-50",
  ALTA: "bg-orange-50",
  URGENTE: "bg-red-50",
};

// ============ COMPONENTE ITEM ============

interface NotificacionItemProps {
  notificacion: Notificacion;
  onMarcarLeida: (id: string) => void;
  onVerOrden: (ordenId: string) => void;
}

function NotificacionItem({
  notificacion,
  onMarcarLeida,
  onVerOrden,
}: NotificacionItemProps) {
  const Icon = iconMap[notificacion.tipo] || Bell;
  const iconColor = iconColorMap[notificacion.prioridad] || iconColorMap.NORMAL;
  const bgColor = notificacion.leida
    ? "bg-white"
    : bgColorMap[notificacion.prioridad] || bgColorMap.NORMAL;

  const handleClick = () => {
    if (!notificacion.leida) {
      onMarcarLeida(notificacion.id);
    }
    if (notificacion.ordenId) {
      onVerOrden(notificacion.ordenId);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0
        hover:bg-gray-50 transition-colors
        ${bgColor}
        ${notificacion.ordenId ? "cursor-pointer" : "cursor-default"}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>
          <Icon size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`text-sm truncate ${
                notificacion.leida
                  ? "text-gray-600 font-normal"
                  : "text-gray-900 font-medium"
              }`}
            >
              {notificacion.titulo}
            </h4>
            {!notificacion.leida && (
              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
            )}
          </div>

          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {notificacion.mensaje}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            {tiempoRelativo(notificacion.createdAt)}
          </p>
        </div>
      </div>
    </button>
  );
}

// ============ COMPONENTE PRINCIPAL ============

export function NotificacionDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notificaciones,
    noLeidas,
    cargando,
    nuevaNotificacion,
    marcarLeida,
    marcarTodasLeidas,
    clearNuevaNotificacion,
  } = useNotificaciones();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleVerOrden = (ordenId: string) => {
    setIsOpen(false);
    router.push(`/ordenes/${ordenId}`);
  };

  const handleMarcarTodasLeidas = async () => {
    await marcarTodasLeidas();
  };

  return (
    <>
      {/* Toast para nuevas notificaciones */}
      {nuevaNotificacion && (
        <NotificacionToast
          notificacion={nuevaNotificacion}
          onClose={clearNuevaNotificacion}
          onVerOrden={handleVerOrden}
        />
      )}

      {/* Dropdown */}
      <div className="relative" ref={dropdownRef}>
        {/* Bell Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={`Notificaciones${noLeidas > 0 ? ` (${noLeidas} sin leer)` : ""}`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Bell size={20} />
          {noLeidas > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-medium text-white bg-red-500 rounded-full px-1">
              {noLeidas > 99 ? "99+" : noLeidas}
            </span>
          )}
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-medium text-gray-900">Notificaciones</h3>
              {noLeidas > 0 && (
                <button
                  onClick={handleMarcarTodasLeidas}
                  className="text-xs text-[var(--marmaq-blue-dark)] hover:underline flex items-center gap-1"
                >
                  <Check size={14} />
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {cargando ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : notificaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <Bell className="w-8 h-8 mb-2 text-gray-300" />
                  <p className="text-sm">No hay notificaciones</p>
                </div>
              ) : (
                notificaciones.map((notif) => (
                  <NotificacionItem
                    key={notif.id}
                    notificacion={notif}
                    onMarcarLeida={marcarLeida}
                    onVerOrden={handleVerOrden}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {notificaciones.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/notificaciones");
                  }}
                  className="text-xs text-[var(--marmaq-blue-dark)] hover:underline w-full text-center"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
