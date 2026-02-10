"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import {
  EditOrdenModal,
  HistorialTimeline,
  EnviarWhatsAppModal,
  FirmaModal,
  OrdenDetailHeader,
  EstadoTimeline,
  NotasTecnicoCard,
  MaterialesCard,
  EvidenciasSection,
  OrdenInfoSidebar,
} from "@/components/ordenes";
import {
  STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  type OrdenConRelaciones,
  type EstadoOrden,
  type SemaforoColor,
} from "@/types/ordenes";
import { ACCIONES_POR_ESTADO, formatDate } from "@/lib/constants/orden-detail";
import { AlertCircle } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function OrdenDetallePage({ params }: PageProps) {
  const router = useRouter();
  const [orden, setOrden] = useState<OrdenConRelaciones & { semaforo: SemaforoColor } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
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

  const handleGeneratePdf = async (tipo: "comprobante" | "completo" = "completo") => {
    if (!orden) return;

    setGeneratingPdf(true);
    try {
      const { id } = await params;
      const response = await fetch(`/api/ordenes/${id}/pdf?tipo=${tipo}`);

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

  const handleCompartirWhatsApp = () => {
    if (!orden) return;

    // Construir accesorios como texto
    let accesoriosTexto = "";
    if (orden.accesorios) {
      if (typeof orden.accesorios === "string") {
        accesoriosTexto = orden.accesorios;
      } else {
        const acc = orden.accesorios as Record<string, boolean>;
        const lista = Object.entries(acc).filter(([, v]) => v).map(([k]) => k);
        accesoriosTexto = lista.join(", ");
      }
    }

    const mensaje = [
      `🔧 *MARMAQ - Estado de Servicio*`,
      ``,
      `📋 *Folio:* ${orden.folio}`,
      `📅 *Fecha:* ${formatDate(orden.fechaRecepcion)}`,
      ``,
      `👤 *Cliente:* ${orden.cliente.nombre}`,
      orden.cliente.empresa ? `🏢 *Empresa:* ${orden.cliente.empresa}` : null,
      ``,
      `⚙️ *Equipo:* ${orden.marcaEquipo} ${orden.modeloEquipo}`,
      orden.serieEquipo ? `🔢 *Serie:* ${orden.serieEquipo}` : null,
      accesoriosTexto ? `📦 *Accesorios:* ${accesoriosTexto}` : null,
      ``,
      `📊 *Estado actual:* ${STATUS_LABELS[orden.estado]}`,
      `🔧 *Tipo de servicio:* ${SERVICE_TYPE_LABELS[orden.tipoServicio]}`,
      ``,
      `📝 *Falla reportada:* ${orden.fallaReportada}`,
      ``,
      `---`,
      `MARMAQ Mexicaltzingo • Servicio Técnico`,
    ].filter(Boolean).join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
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

  const acciones = ACCIONES_POR_ESTADO[orden.estado] || [];

  return (
    <div className="space-y-4 lg:space-y-6">
      <OrdenDetailHeader
        orden={orden}
        onBack={() => router.push("/ordenes")}
        onWhatsAppModal={() => setWhatsappModalOpen(true)}
        onShareWhatsApp={handleCompartirWhatsApp}
        onEditModal={() => setEditModalOpen(true)}
        onGeneratePdf={handleGeneratePdf}
        generatingPdf={generatingPdf}
      />

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
          <EstadoTimeline estadoActual={orden.estado} />

          {/* Falla Reportada y Diagnóstico */}
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

          <NotasTecnicoCard orden={orden} />

          <EvidenciasSection ordenId={orden.id} evidencias={orden.evidencias || []} />

          <MaterialesCard materialesUsados={orden.materialesUsados} />

          {/* Historial de Cambios */}
          <HistorialTimeline ordenId={orden.id} />
        </div>

        {/* COLUMNA DERECHA */}
        <OrdenInfoSidebar
          orden={orden}
          acciones={acciones}
          onCambiarEstado={handleCambiarEstado}
          updating={updating}
          onFirmaModal={() => setFirmaModalOpen(true)}
        />
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
