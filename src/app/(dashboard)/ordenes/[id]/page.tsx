"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button, Card, Badge } from "@/components/ui";
import { EvidenciaUpload, EditOrdenModal, HistorialTimeline, EnviarWhatsAppModal, FirmaModal } from "@/components/ordenes";
import {
  SEMAFORO_CONFIG,
  STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  type OrdenConRelaciones,
  type EstadoOrden,
  type TipoServicio,
  type SemaforoColor,
} from "@/types/ordenes";
import type { TipoEvidencia } from "@prisma/client";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  User,
  Clock,
  Calendar,
  Wrench,
  Plus,
  Package,
  MessageSquare,
  MessageCircle,
  CheckCircle2,
  Circle,
  AlertCircle,
  Printer,
  Loader2,
  PenLine,
} from "lucide-react";

// Orden de estados para el timeline
const ESTADO_ORDEN: EstadoOrden[] = [
  "RECIBIDO",
  "EN_DIAGNOSTICO",
  "ESPERA_REFACCIONES",
  "EN_REPARACION",
  "REPARADO",
  "LISTO_ENTREGA",
  "ENTREGADO",
];

// Estados simplificados para timeline visual
const TIMELINE_ESTADOS = [
  { estado: "RECIBIDO", label: "Recibido" },
  { estado: "EN_DIAGNOSTICO", label: "Diagnóstico" },
  { estado: "ESPERA_REFACCIONES", label: "Esp. Piezas" },
  { estado: "EN_REPARACION", label: "Reparación" },
  { estado: "REPARADO", label: "Reparado" },
  { estado: "ENTREGADO", label: "Entregado" },
];

// Acciones según estado actual
const ACCIONES_POR_ESTADO: Record<EstadoOrden, { label: string; nuevoEstado: EstadoOrden; variant: "primary" | "secondary" | "outline" }[]> = {
  RECIBIDO: [
    { label: "Iniciar Diagnóstico", nuevoEstado: "EN_DIAGNOSTICO", variant: "primary" },
  ],
  EN_DIAGNOSTICO: [
    { label: "Solicitar Refacción", nuevoEstado: "ESPERA_REFACCIONES", variant: "outline" },
    { label: "Iniciar Reparación", nuevoEstado: "EN_REPARACION", variant: "primary" },
    { label: "Enviar Cotización", nuevoEstado: "COTIZACION_PENDIENTE", variant: "secondary" },
  ],
  ESPERA_REFACCIONES: [
    { label: "Piezas Recibidas", nuevoEstado: "EN_REPARACION", variant: "primary" },
  ],
  COTIZACION_PENDIENTE: [
    { label: "Cotización Aprobada", nuevoEstado: "EN_REPARACION", variant: "primary" },
    { label: "Cotización Rechazada", nuevoEstado: "CANCELADO", variant: "outline" },
  ],
  EN_REPARACION: [
    { label: "Marcar como Reparado", nuevoEstado: "REPARADO", variant: "primary" },
  ],
  REPARADO: [
    { label: "Listo para Entrega", nuevoEstado: "LISTO_ENTREGA", variant: "primary" },
  ],
  LISTO_ENTREGA: [
    { label: "Registrar Entrega", nuevoEstado: "ENTREGADO", variant: "primary" },
  ],
  ENTREGADO: [],
  CANCELADO: [],
};

function getBadgeVariant(tipo: TipoServicio): "garantia" | "centro" | "cobrar" | "repare" {
  const map: Record<TipoServicio, "garantia" | "centro" | "cobrar" | "repare"> = {
    GARANTIA: "garantia",
    CENTRO_SERVICIO: "centro",
    POR_COBRAR: "cobrar",
    REPARE: "repare",
  };
  return map[tipo];
}

function getStatusBadgeVariant(estado: EstadoOrden): "default" | "success" | "warning" | "danger" | "info" {
  const map: Record<EstadoOrden, "default" | "success" | "warning" | "danger" | "info"> = {
    RECIBIDO: "info",
    EN_DIAGNOSTICO: "warning",
    ESPERA_REFACCIONES: "warning",
    COTIZACION_PENDIENTE: "warning",
    EN_REPARACION: "info",
    REPARADO: "success",
    LISTO_ENTREGA: "success",
    ENTREGADO: "default",
    CANCELADO: "danger",
  };
  return map[estado];
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calcularTiempoTranscurrido(fechaRecepcion: string | Date): string {
  const ahora = new Date();
  const recepcion = new Date(fechaRecepcion);
  const diffMs = ahora.getTime() - recepcion.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHoras = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDias > 0) {
    return `${diffDias} día${diffDias > 1 ? "s" : ""}, ${diffHoras}h`;
  }
  return `${diffHoras} hora${diffHoras > 1 ? "s" : ""}`;
}

// Tipos de evidencia disponibles para agregar
const TIPOS_EVIDENCIA: { value: TipoEvidencia; label: string }[] = [
  { value: "RECEPCION", label: "Recepción" },
  { value: "DIAGNOSTICO", label: "Diagnóstico" },
  { value: "REPARACION", label: "Reparación" },
  { value: "ENTREGA", label: "Entrega" },
  { value: "OTRO", label: "Otro" },
];

// Componente para sección de evidencias con tabs
interface EvidenciasSectionProps {
  ordenId: string;
  evidencias: OrdenConRelaciones["evidencias"];
}

function EvidenciasSection({ ordenId, evidencias }: EvidenciasSectionProps) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoEvidencia>("RECEPCION");

  // Filtrar evidencias por tipo
  const evidenciasPorTipo = (tipo: TipoEvidencia) =>
    (evidencias || []).filter((e) => e.tipo === tipo);

  return (
    <Card className="p-4 lg:p-6">
      <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-4">Evidencia Fotográfica</h2>

      {/* Tabs para tipos de evidencia - scroll horizontal en móvil */}
      <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 mb-4 pb-4 border-b border-gray-100">
        <div className="flex gap-2 min-w-max">
          {TIPOS_EVIDENCIA.map(({ value, label }) => {
            const count = evidenciasPorTipo(value).length;
            return (
              <button
                key={value}
                onClick={() => setTipoSeleccionado(value)}
                className={`px-3 py-2 lg:py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap active:scale-95 ${
                  tipoSeleccionado === value
                    ? "bg-[#31A7D4] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${
                      tipoSeleccionado === value
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Componente de upload para el tipo seleccionado */}
      <EvidenciaUpload
        ordenId={ordenId}
        tipo={tipoSeleccionado}
        evidenciasExistentes={evidenciasPorTipo(tipoSeleccionado)}
        maxFiles={10}
      />
    </Card>
  );
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function OrdenDetallePage({ params }: PageProps) {
  const router = useRouter();
  const [orden, setOrden] = useState<OrdenConRelaciones & { semaforo: SemaforoColor } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [nuevaNota, setNuevaNota] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [firmaModalOpen, setFirmaModalOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pendingDelivery, setPendingDelivery] = useState(false);

  useEffect(() => {
    async function fetchOrden() {
      try {
        const { id } = await params;
        const res = await fetch(`/api/ordenes/${id}`);
        if (!res.ok) {
          throw new Error("Orden no encontrada");
        }
        const data = await res.json();
        setOrden(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchOrden();
  }, [params]);

  const handleCambiarEstado = async (nuevoEstado: EstadoOrden) => {
    if (!orden) return;

    // Si el nuevo estado es ENTREGADO y no tiene firma, mostrar modal de firma
    if (nuevoEstado === "ENTREGADO" && !orden.firmaClienteUrl) {
      setPendingDelivery(true);
      setFirmaModalOpen(true);
      return;
    }

    await actualizarEstado(nuevoEstado);
  };

  const actualizarEstado = async (nuevoEstado: EstadoOrden) => {
    if (!orden) return;

    setUpdating(true);
    try {
      const { id } = await params;
      const res = await fetch(`/api/ordenes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (!res.ok) {
        throw new Error("Error al actualizar estado");
      }

      const data = await res.json();
      setOrden(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setUpdating(false);
    }
  };

  const handleFirmaSuccess = async (firmaUrl: string) => {
    // Actualizar orden con la nueva firma
    if (orden) {
      setOrden({
        ...orden,
        firmaClienteUrl: firmaUrl,
        firmaFecha: new Date(),
      });
    }

    // Si estaba pendiente de entregar, ahora sí cambiar el estado
    if (pendingDelivery) {
      setPendingDelivery(false);
      await actualizarEstado("ENTREGADO");
    }
  };

  const handleGeneratePdf = async () => {
    if (!orden) return;

    setGeneratingPdf(true);
    try {
      const { id } = await params;
      const response = await fetch(`/api/ordenes/${id}/pdf`);

      if (!response.ok) {
        throw new Error("Error al generar el PDF");
      }

      // Obtener el blob del PDF
      const blob = await response.blob();

      // Crear URL y abrir en nueva pestaña
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      // Limpiar URL después de un momento
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Error al generar el PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const getEstadoIndex = (estado: EstadoOrden): number => {
    return ESTADO_ORDEN.indexOf(estado);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31A7D4]" />
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-500 mb-4">{error || "Orden no encontrada"}</p>
        <Button onClick={() => router.push("/ordenes")}>Volver a Órdenes</Button>
      </div>
    );
  }

  const estadoActualIndex = getEstadoIndex(orden.estado);
  const acciones = ACCIONES_POR_ESTADO[orden.estado] || [];

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* HEADER - Mobile optimizado */}
      <div className="flex flex-col gap-3 lg:gap-4">
        {/* Fila superior: back, folio, semaforo, edit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-4">
            <button
              onClick={() => router.push("/ordenes")}
              className="p-2 -ml-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <h1 className="text-xl lg:text-2xl font-bold text-[#092139] font-mono">
              {orden.folio}
            </h1>
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: SEMAFORO_CONFIG[orden.semaforo].color }}
              title={SEMAFORO_CONFIG[orden.semaforo].description}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWhatsappModalOpen(true)}
              className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              className="flex items-center gap-2"
            >
              {generatingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Imprimir</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
          </div>
        </div>

        {/* Badges en línea separada */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusBadgeVariant(orden.estado)}>
            {STATUS_LABELS[orden.estado]}
          </Badge>
          <Badge variant={getBadgeVariant(orden.tipoServicio)}>
            {SERVICE_TYPE_LABELS[orden.tipoServicio]}
          </Badge>
        </div>

        {/* Info del cliente y equipo */}
        <p className="text-sm lg:text-base text-gray-500">
          {orden.cliente.nombre}
          {orden.cliente.empresa && ` • ${orden.cliente.empresa}`}
          <br className="sm:hidden" />
          <span className="hidden sm:inline"> • </span>
          {orden.marcaEquipo} {orden.modeloEquipo}
        </p>
      </div>

      {/* ACCIONES RÁPIDAS - Visible arriba en móvil para técnicos */}
      {acciones.length > 0 && (
        <Card className="p-4 border-2 border-[#31A7D4]/20 bg-[#31A7D4]/5 lg:hidden">
          <h2 className="text-sm font-semibold text-[#092139] mb-3">Acciones Rápidas</h2>
          <div className="flex flex-wrap gap-2">
            {acciones.map((accion) => (
              <Button
                key={accion.nuevoEstado}
                variant={accion.variant}
                size="sm"
                className="flex-1 min-w-[140px]"
                onClick={() => handleCambiarEstado(accion.nuevoEstado)}
                isLoading={updating}
              >
                {accion.label}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Layout 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-4 lg:gap-6">
        {/* COLUMNA IZQUIERDA */}
        <div className="space-y-4 lg:space-y-6">
          {/* 1. Timeline de Estado - scroll horizontal en móvil */}
          <Card className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-4 lg:mb-6">Estado del Servicio</h2>
            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
              <div className="relative min-w-[500px] lg:min-w-0">
                {/* Línea de conexión */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
                <div
                  className="absolute top-4 left-0 h-0.5 bg-green-500 transition-all duration-500"
                  style={{
                    width: `${(estadoActualIndex / (TIMELINE_ESTADOS.length - 1)) * 100}%`,
                  }}
                />

                {/* Estados */}
                <div className="relative flex justify-between">
                  {TIMELINE_ESTADOS.map((item) => {
                    const itemIndex = ESTADO_ORDEN.indexOf(item.estado as EstadoOrden);
                    const isCompleted = itemIndex < estadoActualIndex;
                    const isCurrent = item.estado === orden.estado;

                    return (
                      <div key={item.estado} className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all ${
                            isCompleted
                              ? "bg-green-500 text-white"
                              : isCurrent
                              ? "bg-orange-500 text-white ring-4 ring-orange-100"
                              : "bg-gray-200 text-gray-400"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </div>
                        <span
                          className={`text-xs mt-2 text-center max-w-[60px] lg:max-w-none ${
                            isCurrent
                              ? "font-semibold text-orange-600"
                              : isCompleted
                              ? "text-green-600"
                              : "text-gray-400"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* 2. Información de la Falla y Diagnóstico */}
          <Card className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-3 lg:mb-4">Falla Reportada</h2>
            <p className="text-sm lg:text-base text-gray-700 whitespace-pre-wrap">{orden.fallaReportada}</p>

            {orden.diagnostico && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="font-medium text-gray-900 mb-2 text-sm lg:text-base">Diagnóstico</h3>
                <p className="text-sm lg:text-base text-gray-700 whitespace-pre-wrap">{orden.diagnostico}</p>
              </div>
            )}
          </Card>

          {/* 3. Notas del Técnico */}
          <Card className="p-4 lg:p-6 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-2 mb-3 lg:mb-4">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              <h2 className="text-base lg:text-lg font-semibold text-[#092139]">Notas del Técnico</h2>
            </div>

            {orden.notasTecnico ? (
              <p className="text-sm lg:text-base text-gray-700 whitespace-pre-wrap mb-4">{orden.notasTecnico}</p>
            ) : (
              <p className="text-sm text-gray-500 italic mb-4">Sin notas aún</p>
            )}

            {/* Historial de cambios */}
            {orden.historial && orden.historial.length > 0 && (
              <div className="space-y-3 mb-4">
                {orden.historial.slice(0, 5).map((h) => (
                  <div key={h.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-700 break-words">
                        {h.notas || `Estado cambiado a ${STATUS_LABELS[h.estadoNuevo]}`}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {h.usuario.name} • {formatDateTime(h.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Input para nueva nota - touch friendly */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={nuevaNota}
                onChange={(e) => setNuevaNota(e.target.value)}
                placeholder="Agregar nota..."
                className="flex-1 px-3 py-3 sm:py-2 rounded-lg border border-amber-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base"
              />
              <Button
                size="sm"
                disabled={!nuevaNota.trim()}
                className="py-3 sm:py-2"
                onClick={() => {
                  // TODO: Implementar agregar nota
                  setNuevaNota("");
                }}
              >
                Agregar
              </Button>
            </div>
          </Card>

          {/* 4. Evidencia Fotográfica */}
          <EvidenciasSection ordenId={orden.id} evidencias={orden.evidencias || []} />

          {/* 5. Materiales/Piezas */}
          <Card className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-500" />
                <h2 className="text-base lg:text-lg font-semibold text-[#092139]">Materiales Utilizados</h2>
              </div>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Agregar</span>
              </Button>
            </div>

            {orden.materialesUsados && orden.materialesUsados.length > 0 ? (
              <>
                {/* Tabla en desktop */}
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                          Pieza
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                          Cantidad
                        </th>
                        <th className="text-right text-xs font-medium text-gray-500 uppercase py-2">
                          Precio
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orden.materialesUsados.map((mu) => (
                        <tr key={mu.id}>
                          <td className="py-3">
                            <p className="font-medium text-gray-900">{mu.material.nombre}</p>
                            <p className="text-sm text-gray-500">{mu.material.sku}</p>
                          </td>
                          <td className="py-3 text-gray-700">{mu.cantidad}</td>
                          <td className="py-3 text-right text-gray-700">
                            {mu.precioUnitario
                              ? `$${Number(mu.precioUnitario).toFixed(2)}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cards en móvil */}
                <div className="md:hidden space-y-3">
                  {orden.materialesUsados.map((mu) => (
                    <div
                      key={mu.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm truncate">{mu.material.nombre}</p>
                        <p className="text-xs text-gray-500">{mu.material.sku}</p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900">×{mu.cantidad}</p>
                        <p className="text-xs text-gray-500">
                          {mu.precioUnitario
                            ? `$${Number(mu.precioUnitario).toFixed(2)}`
                            : "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6 lg:py-8 text-gray-500">
                <Package className="w-8 lg:w-10 h-8 lg:h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin materiales registrados</p>
              </div>
            )}
          </Card>

          {/* 6. Historial de Cambios */}
          <HistorialTimeline ordenId={orden.id} />
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-4 lg:space-y-6">
          {/* 1. Card Información */}
          <Card className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-3 lg:mb-4">Información</h2>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-gray-500">Fecha Ingreso</p>
                  <p className="font-medium text-gray-900 text-sm lg:text-base">
                    {formatDate(orden.fechaRecepcion)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-gray-500">Tiempo</p>
                  <p className="font-medium text-gray-900 text-sm lg:text-base">
                    {calcularTiempoTranscurrido(orden.fechaRecepcion)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-5 h-5 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-gray-500">Técnico</p>
                  <p className="font-medium text-gray-900 text-sm lg:text-base truncate">
                    {orden.tecnico?.name || "Sin asignar"}
                  </p>
                </div>
              </div>

              {orden.serieEquipo && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-mono text-gray-500">S/N</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs lg:text-sm text-gray-500">No. Serie</p>
                    <p className="font-medium font-mono text-gray-900 text-sm truncate">
                      {orden.serieEquipo}
                    </p>
                  </div>
                </div>
              )}

              {orden.fechaPromesa && (
                <div className="flex items-center gap-3 col-span-2 lg:col-span-1">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs lg:text-sm text-gray-500">Fecha Promesa</p>
                    <p className="font-medium text-orange-600 text-sm lg:text-base">
                      {formatDate(orden.fechaPromesa)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 2. Card Cliente - con enlaces touch-friendly */}
          <Card className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-3 lg:mb-4">Cliente</h2>
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#31A7D4]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-[#31A7D4]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm lg:text-base">{orden.cliente.nombre}</p>
                  {orden.cliente.empresa && (
                    <p className="text-xs lg:text-sm text-gray-500 truncate">{orden.cliente.empresa}</p>
                  )}
                </div>
              </div>

              {/* Teléfono - botón grande y tappable */}
              <a
                href={`tel:${orden.cliente.telefono}`}
                className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs lg:text-sm text-gray-500">Teléfono</p>
                  <p className="font-medium text-[#31A7D4] text-sm lg:text-base">
                    {orden.cliente.telefono}
                  </p>
                </div>
              </a>

              {orden.cliente.email && (
                <a
                  href={`mailto:${orden.cliente.email}`}
                  className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs lg:text-sm text-gray-500">Email</p>
                    <p className="font-medium text-[#31A7D4] text-sm lg:text-base truncate">
                      {orden.cliente.email}
                    </p>
                  </div>
                </a>
              )}

              {orden.cliente.esDistribuidor && (
                <Badge variant="centro">Distribuidor</Badge>
              )}
            </div>
          </Card>

          {/* 3. Card Acciones Rápidas - Solo visible en desktop (móvil lo ve arriba) */}
          {acciones.length > 0 && (
            <Card className="hidden lg:block p-6 border-2 border-[#31A7D4]/20 bg-[#31A7D4]/5">
              <h2 className="text-lg font-semibold text-[#092139] mb-4">Acciones</h2>
              <div className="space-y-3">
                {acciones.map((accion) => (
                  <Button
                    key={accion.nuevoEstado}
                    variant={accion.variant}
                    className="w-full"
                    onClick={() => handleCambiarEstado(accion.nuevoEstado)}
                    isLoading={updating}
                  >
                    {accion.label}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* Cotización (si aplica) */}
          {orden.tipoServicio === "POR_COBRAR" && orden.cotizacion && (
            <Card className="p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-3 lg:mb-4">Cotización</h2>
              <div className="text-center">
                <p className="text-2xl lg:text-3xl font-bold text-[#092139]">
                  ${Number(orden.cotizacion).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </p>
                <Badge
                  variant={orden.cotizacionAprobada ? "success" : "warning"}
                  className="mt-2"
                >
                  {orden.cotizacionAprobada ? "Aprobada" : "Pendiente"}
                </Badge>
              </div>
            </Card>
          )}

          {/* Firma del Cliente */}
          <Card className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <h2 className="text-base lg:text-lg font-semibold text-[#092139]">Firma del Cliente</h2>
              {!orden.firmaClienteUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFirmaModalOpen(true)}
                  className="flex items-center gap-1"
                >
                  <PenLine className="w-4 h-4" />
                  <span className="hidden sm:inline">Capturar</span>
                </Button>
              )}
            </div>

            {orden.firmaClienteUrl ? (
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 relative h-32">
                  <Image
                    src={orden.firmaClienteUrl}
                    alt="Firma del cliente"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Firmado el {orden.firmaFecha ? formatDateTime(orden.firmaFecha) : "—"}
                </p>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <PenLine className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin firma registrada</p>
                <p className="text-xs text-gray-400 mt-1">
                  La firma se solicitará al entregar el equipo
                </p>
              </div>
            )}
          </Card>

          {/* Info adicional para Garantía */}
          {orden.tipoServicio === "GARANTIA" && orden.numeroFactura && (
            <Card className="p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-3 lg:mb-4">Datos de Garantía</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">No. Factura:</span>
                  <span className="font-medium text-right">{orden.numeroFactura}</span>
                </div>
                {orden.fechaFactura && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Fecha Factura:</span>
                    <span className="font-medium">{formatDate(orden.fechaFactura)}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Info adicional para REPARE */}
          {orden.tipoServicio === "REPARE" && orden.numeroRepare && (
            <Card className="p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-3 lg:mb-4">Datos REPARE</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">No. REPARE:</span>
                  <span className="font-medium font-mono text-right">{orden.numeroRepare}</span>
                </div>
                {orden.coordenadasGPS && (
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-gray-500">GPS:</span>
                    <span className="font-medium font-mono text-xs break-all">
                      {orden.coordenadasGPS}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modal de Edición */}
      <EditOrdenModal
        orden={orden}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={(ordenActualizada) => {
          setOrden({ ...ordenActualizada, semaforo: orden.semaforo });
        }}
      />

      {/* Modal de WhatsApp */}
      <EnviarWhatsAppModal
        isOpen={whatsappModalOpen}
        onClose={() => setWhatsappModalOpen(false)}
        orden={{
          id: orden.id,
          folio: orden.folio,
          cliente: {
            nombre: orden.cliente.nombre,
            telefono: orden.cliente.telefono,
          },
          marcaEquipo: orden.marcaEquipo,
          modeloEquipo: orden.modeloEquipo,
        }}
      />

      {/* Modal de Firma */}
      <FirmaModal
        isOpen={firmaModalOpen}
        onClose={() => {
          setFirmaModalOpen(false);
          setPendingDelivery(false);
        }}
        ordenId={orden.id}
        folio={orden.folio}
        clienteNombre={orden.cliente.nombre}
        onSuccess={handleFirmaSuccess}
      />
    </div>
  );
}
