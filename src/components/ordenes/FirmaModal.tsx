"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { FirmaCanvas } from "./FirmaCanvas";

interface FirmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordenId: string;
  folio: string;
  clienteNombre: string;
  onSuccess?: (firmaUrl: string) => void;
}

export function FirmaModal({
  isOpen,
  onClose,
  ordenId,
  folio,
  clienteNombre,
  onSuccess,
}: FirmaModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (signatureDataUrl: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Convert base64 to blob
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append("firma", blob, `firma-${ordenId}.png`);

      // Upload signature
      const uploadResponse = await fetch(`/api/ordenes/${ordenId}/firma`, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json();
        throw new Error(data.error || "Error al guardar la firma");
      }

      const result = await uploadResponse.json();

      // Call success callback
      if (onSuccess) {
        onSuccess(result.firmaUrl);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la firma");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Firma del Cliente
            </h2>
            <p className="text-sm text-gray-500">
              Orden {folio} - {clienteNombre}
            </p>
          </div>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Signature canvas */}
        <FirmaCanvas
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={isLoading}
        />

        {/* Legal text */}
        <p className="mt-4 text-xs text-gray-400 text-center">
          Al firmar, confirmo que he recibido mi equipo en las condiciones acordadas.
        </p>
      </div>
    </div>
  );
}
