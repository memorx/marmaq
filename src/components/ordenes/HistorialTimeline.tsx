"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui";
import {
  History,
  PlusCircle,
  RefreshCw,
  Edit,
  Camera,
  Package,
  UserCheck,
  FileText,
  CheckCircle,
  XCircle,
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface HistorialItem {
  id: string;
  fecha: string;
  accion: string;
  accionLabel: string;
  accionIcono: string;
  accionColor: string;
  detalles: Record<string, unknown> | null;
  usuario: {
    id: string;
    nombre: string;
  };
}

interface HistorialResponse {
  ordenId: string;
  folio: string;
  totalEventos: number;
  historial: HistorialItem[];
}

interface HistorialTimelineProps {
  ordenId: string;
}

// Mapeo de iconos
const ICON_MAP: Record<string, React.ReactNode> = {
  "plus-circle": <PlusCircle className="w-4 h-4" />,
  "refresh-cw": <RefreshCw className="w-4 h-4" />,
  edit: <Edit className="w-4 h-4" />,
  camera: <Camera className="w-4 h-4" />,
  package: <Package className="w-4 h-4" />,
  "user-check": <UserCheck className="w-4 h-4" />,
  "file-text": <FileText className="w-4 h-4" />,
  "check-circle": <CheckCircle className="w-4 h-4" />,
  "x-circle": <XCircle className="w-4 h-4" />,
  "message-square": <MessageSquare className="w-4 h-4" />,
};

// Formatear detalles para mostrar
function formatDetalles(accion: string, detalles: Record<string, unknown> | null): string | null {
  if (!detalles) return null;

  switch (accion) {
    case "ORDEN_CREADA":
      return `Equipo: ${detalles.equipo || "N/A"}`;
    case "ESTADO_CAMBIADO":
      return `${detalles.estadoAnterior} → ${detalles.estadoNuevo}`;
    case "TECNICO_ASIGNADO":
      return detalles.nombreTecnico
        ? `Asignado a: ${detalles.nombreTecnico}`
        : "Técnico desasignado";
    case "COTIZACION_ENVIADA":
    case "COTIZACION_APROBADA":
    case "COTIZACION_RECHAZADA":
      return detalles.monto ? `Monto: $${Number(detalles.monto).toLocaleString("es-MX")}` : null;
    case "EVIDENCIA_AGREGADA":
      return `${detalles.cantidad} archivo(s) de ${detalles.tipo}`;
    case "ORDEN_EDITADA":
      const campos = detalles.camposModificados as string[] | undefined;
      return campos ? `Campos: ${campos.join(", ")}` : null;
    case "NOTA_AGREGADA":
      return detalles.nota ? String(detalles.nota).substring(0, 50) + "..." : null;
    default:
      return null;
  }
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Justo ahora";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
  return formatDateTime(date);
}

export function HistorialTimeline({ ordenId }: HistorialTimelineProps) {
  const [data, setData] = useState<HistorialResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchHistorial() {
      try {
        const res = await fetch(`/api/ordenes/${ordenId}/historial`);
        if (!res.ok) {
          throw new Error("Error al cargar historial");
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }

    fetchHistorial();
  }, [ordenId]);

  if (loading) {
    return (
      <Card className="p-4 lg:p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 lg:p-6">
        <div className="text-center py-8 text-gray-500">
          <p>{error}</p>
        </div>
      </Card>
    );
  }

  if (!data || data.historial.length === 0) {
    return (
      <Card className="p-4 lg:p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-gray-500" />
          <h2 className="text-base lg:text-lg font-semibold text-[#092139]">
            Historial de Cambios
          </h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin historial registrado</p>
        </div>
      </Card>
    );
  }

  const visibleItems = expanded ? data.historial : data.historial.slice(0, 5);
  const hasMore = data.historial.length > 5;

  return (
    <Card className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#31A7D4]" />
          <h2 className="text-base lg:text-lg font-semibold text-[#092139]">
            Historial de Cambios
          </h2>
        </div>
        <span className="text-sm text-gray-500">{data.totalEventos} eventos</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Línea vertical */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />

        {/* Items */}
        <div className="space-y-4">
          {visibleItems.map((item) => {
            const icon = ICON_MAP[item.accionIcono] || <History className="w-4 h-4" />;
            const detallesFormateados = formatDetalles(item.accion, item.detalles);

            return (
              <div key={item.id} className="relative flex gap-3 pl-1">
                {/* Icono con color */}
                <div
                  className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: item.accionColor + "20", color: item.accionColor }}
                >
                  {icon}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="font-medium text-gray-900 text-sm">{item.accionLabel}</span>
                    <span className="text-xs text-gray-500">{formatRelativeTime(item.fecha)}</span>
                  </div>

                  {detallesFormateados && (
                    <p className="text-sm text-gray-600 mt-0.5">{detallesFormateados}</p>
                  )}

                  <p className="text-xs text-gray-400 mt-1">por {item.usuario.nombre}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón ver más */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-[#31A7D4] hover:text-[#2890b8] transition-colors py-2"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Ver {data.historial.length - 5} eventos más
            </>
          )}
        </button>
      )}
    </Card>
  );
}
