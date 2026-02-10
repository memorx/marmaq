"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { MessageSquare } from "lucide-react";
import { STATUS_LABELS, type OrdenConRelaciones } from "@/types/ordenes";
import { formatDateTime } from "@/lib/constants/orden-detail";

interface NotasTecnicoCardProps {
  orden: OrdenConRelaciones;
}

export function NotasTecnicoCard({ orden }: NotasTecnicoCardProps) {
  const [nuevaNota, setNuevaNota] = useState("");

  return (
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
  );
}
