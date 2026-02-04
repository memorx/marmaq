"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Bell, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { TipoNotificacion, PrioridadNotif } from "@prisma/client";
import type { Notificacion } from "@/hooks/useNotificaciones";

interface NotificacionToastProps {
  notificacion: Notificacion;
  onClose: () => void;
  onVerOrden?: (ordenId: string) => void;
  /** Auto-dismiss delay in ms (default: 5000). Set to 0 to disable. */
  autoDismiss?: number;
}

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

const colorMap: Record<PrioridadNotif, string> = {
  BAJA: "bg-gray-50 border-gray-200",
  NORMAL: "bg-blue-50 border-blue-200",
  ALTA: "bg-orange-50 border-orange-200",
  URGENTE: "bg-red-50 border-red-200",
};

const iconColorMap: Record<PrioridadNotif, string> = {
  BAJA: "text-gray-500",
  NORMAL: "text-blue-500",
  ALTA: "text-orange-500",
  URGENTE: "text-red-500",
};

export function NotificacionToast({
  notificacion,
  onClose,
  onVerOrden,
  autoDismiss = 5000,
}: NotificacionToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Wait for animation
  }, [onClose]);

  useEffect(() => {
    if (autoDismiss > 0) {
      const timer = setTimeout(handleClose, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, handleClose]);

  const Icon = iconMap[notificacion.tipo] || Bell;
  const bgColor = colorMap[notificacion.prioridad] || colorMap.NORMAL;
  const iconColor = iconColorMap[notificacion.prioridad] || iconColorMap.NORMAL;

  const handleClick = () => {
    if (notificacion.ordenId && onVerOrden) {
      onVerOrden(notificacion.ordenId);
      handleClose();
    }
  };

  return (
    <div
      role="alert"
      className={`
        fixed bottom-4 right-4 z-50 max-w-sm w-full
        border rounded-lg shadow-lg p-4
        transform transition-all duration-300 ease-in-out
        ${bgColor}
        ${isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}
        ${notificacion.ordenId && onVerOrden ? "cursor-pointer" : ""}
      `}
      onClick={notificacion.ordenId && onVerOrden ? handleClick : undefined}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${iconColor}`}>
          <Icon size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {notificacion.titulo}
          </h4>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {notificacion.mensaje}
          </p>
          {notificacion.orden && (
            <p className="text-xs text-gray-500 mt-1">
              Folio: {notificacion.orden.folio}
            </p>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar notificación"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
