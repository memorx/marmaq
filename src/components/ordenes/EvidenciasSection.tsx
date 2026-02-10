"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { EvidenciaUpload } from "./EvidenciaUpload";
import type { OrdenConRelaciones } from "@/types/ordenes";
import type { TipoEvidencia } from "@prisma/client";
import { TIPOS_EVIDENCIA } from "@/lib/constants/orden-detail";

interface EvidenciasSectionProps {
  ordenId: string;
  evidencias: OrdenConRelaciones["evidencias"];
}

export function EvidenciasSection({ ordenId, evidencias }: EvidenciasSectionProps) {
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
