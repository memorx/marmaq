"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui";
import { Upload, X, AlertCircle } from "lucide-react";

interface FirmaFotoUploadProps {
  ordenId: string;
  onSuccess: (url: string) => void;
  onCancel: () => void;
}

type UploadState = "selecting" | "previewing" | "uploading" | "error";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function FirmaFotoUpload({ ordenId, onSuccess, onCancel }: FirmaFotoUploadProps) {
  const [state, setState] = useState<UploadState>("selecting");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validar tipo
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("Formato no válido. Solo JPEG, PNG o WebP");
      setState("error");
      return;
    }

    // Validar tamaño
    if (selected.size > MAX_SIZE) {
      setError("La imagen es muy grande. Máximo 5MB");
      setState("error");
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setState("previewing");
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setState("uploading");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("firmaFoto", file);

      const res = await fetch(`/api/ordenes/${ordenId}/firma`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al subir la foto");
      }

      // Limpiar preview URL
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      onSuccess(data.firmaFotoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la foto");
      setState("error");
    }
  };

  const handleRetry = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    setState("selecting");
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Foto de firma en papel</p>
        <button
          onClick={onCancel}
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selecting state */}
      {state === "selecting" && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#31A7D4] hover:bg-[#31A7D4]/5 transition-colors cursor-pointer"
          >
            <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
            <p className="text-sm text-gray-500">Toca para seleccionar foto</p>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG o WebP. Max 5MB</p>
          </button>
        </div>
      )}

      {/* Preview state */}
      {state === "previewing" && previewUrl && (
        <div className="space-y-2">
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview de firma"
              className="w-full h-32 object-contain"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={handleUpload}
            >
              Subir
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleRetry}
            >
              Cambiar
            </Button>
          </div>
        </div>
      )}

      {/* Uploading state */}
      {state === "uploading" && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#31A7D4]" />
          <span className="ml-2 text-sm text-gray-500">Subiendo foto...</span>
        </div>
      )}

      {/* Error state */}
      {state === "error" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleRetry}>
            Intentar de nuevo
          </Button>
        </div>
      )}
    </div>
  );
}
