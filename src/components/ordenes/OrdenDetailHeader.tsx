"use client";

import { useState, useEffect } from "react";
import { Button, Badge } from "@/components/ui";
import {
  ArrowLeft,
  Edit,
  MessageCircle,
  Printer,
  Loader2,
  Share2,
} from "lucide-react";
import {
  SEMAFORO_CONFIG,
  STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  type OrdenConRelaciones,
  type SemaforoColor,
} from "@/types/ordenes";
import { getBadgeVariant, getStatusBadgeVariant } from "@/lib/constants/orden-detail";

interface OrdenDetailHeaderProps {
  orden: OrdenConRelaciones & { semaforo: SemaforoColor };
  onBack: () => void;
  onWhatsAppModal: () => void;
  onShareWhatsApp: () => void;
  onEditModal: () => void;
  onGeneratePdf: (tipo: "comprobante" | "completo") => void;
  generatingPdf: boolean;
}

export function OrdenDetailHeader({
  orden,
  onBack,
  onWhatsAppModal,
  onShareWhatsApp,
  onEditModal,
  onGeneratePdf,
  generatingPdf,
}: OrdenDetailHeaderProps) {
  const [printMenuOpen, setPrintMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setPrintMenuOpen(false);
    if (printMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [printMenuOpen]);

  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      {/* Fila superior: back, folio, semaforo, edit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 lg:gap-4">
          <button
            onClick={onBack}
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
            onClick={onWhatsAppModal}
            className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setPrintMenuOpen(!printMenuOpen);
              }}
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
            {printMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[200px]">
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setPrintMenuOpen(false);
                    onGeneratePdf("comprobante");
                  }}
                >
                  Comprobante (cliente)
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setPrintMenuOpen(false);
                    onGeneratePdf("completo");
                  }}
                >
                  Reporte completo (interno)
                </button>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onShareWhatsApp}
            className="flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Compartir</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEditModal}
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
  );
}
