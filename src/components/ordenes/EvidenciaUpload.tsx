"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui";
import {
  Upload,
  Camera,
  X,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  ImagePlus,
} from "lucide-react";
import type { TipoEvidencia, Evidencia } from "@prisma/client";

interface EvidenciaUploadProps {
  ordenId?: string; // Si no hay ordenId, guarda los archivos localmente para subir después
  tipo: TipoEvidencia;
  evidenciasExistentes?: Evidencia[];
  onUploadComplete?: (evidencias: Evidencia[]) => void;
  onFilesChange?: (files: File[]) => void; // Para modo sin ordenId
  maxFiles?: number;
  disabled?: boolean;
}

interface PreviewFile {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

const TIPO_LABELS: Record<TipoEvidencia, string> = {
  RECEPCION: "Recepción",
  DIAGNOSTICO: "Diagnóstico",
  REPARACION: "Reparación",
  ENTREGA: "Entrega",
  FACTURA: "Factura",
  OTRO: "Otro",
};

export function EvidenciaUpload({
  ordenId,
  tipo,
  evidenciasExistentes = [],
  onUploadComplete,
  onFilesChange,
  maxFiles = 10,
  disabled = false,
}: EvidenciaUploadProps) {
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [evidencias, setEvidencias] = useState<Evidencia[]>(evidenciasExistentes);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Manejar archivos seleccionados
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const currentCount = previews.length + evidencias.length;
    const remainingSlots = maxFiles - currentCount;

    if (remainingSlots <= 0) {
      alert(`Máximo ${maxFiles} fotos permitidas`);
      return;
    }

    const newFiles = Array.from(files).slice(0, remainingSlots);
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];

    const validFiles = newFiles.filter((file) => {
      if (!allowedTypes.includes(file.type)) {
        alert(`Tipo de archivo no permitido: ${file.name}`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`Archivo muy grande: ${file.name}. Máximo 10MB`);
        return false;
      }
      return true;
    });

    const newPreviews: PreviewFile[] = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
    }));

    setPreviews((prev) => [...prev, ...newPreviews]);

    // Notificar al padre si no hay ordenId (modo local)
    if (!ordenId && onFilesChange) {
      const allFiles = [...previews.map((p) => p.file), ...validFiles];
      onFilesChange(allFiles);
    }
  }, [previews, evidencias.length, maxFiles, ordenId, onFilesChange]);

  // Drag & Drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [disabled, handleFiles]);

  // Eliminar preview
  const removePreview = useCallback((index: number) => {
    setPreviews((prev) => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index].preview);
      newPreviews.splice(index, 1);

      // Notificar al padre
      if (!ordenId && onFilesChange) {
        onFilesChange(newPreviews.map((p) => p.file));
      }

      return newPreviews;
    });
  }, [ordenId, onFilesChange]);

  // Subir archivos
  const uploadFiles = async () => {
    if (!ordenId || previews.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("tipo", tipo);

    previews.forEach((p) => {
      formData.append("files", p.file);
    });

    try {
      // Actualizar estado a uploading
      setPreviews((prev) =>
        prev.map((p) => ({ ...p, status: "uploading" as const }))
      );

      const response = await fetch(`/api/ordenes/${ordenId}/evidencias`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al subir");
      }

      const data = await response.json();

      // Actualizar estado a success
      setPreviews((prev) =>
        prev.map((p) => ({ ...p, status: "success" as const }))
      );

      // Agregar a evidencias existentes
      setEvidencias((prev) => [...data.evidencias, ...prev]);

      // Limpiar previews después de un momento
      setTimeout(() => {
        setPreviews([]);
      }, 1500);

      // Notificar al padre
      if (onUploadComplete) {
        onUploadComplete(data.evidencias);
      }
    } catch (error) {
      console.error("Error uploading:", error);
      setPreviews((prev) =>
        prev.map((p) => ({
          ...p,
          status: "error" as const,
          error: error instanceof Error ? error.message : "Error desconocido",
        }))
      );
    } finally {
      setUploading(false);
      setUploadProgress(100);
    }
  };

  // Eliminar evidencia existente
  const deleteEvidencia = async (evidenciaId: string) => {
    if (!ordenId) return;

    setDeletingId(evidenciaId);

    try {
      const response = await fetch(
        `/api/ordenes/${ordenId}/evidencias?evidenciaId=${evidenciaId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Error al eliminar");
      }

      setEvidencias((prev) => prev.filter((e) => e.id !== evidenciaId));
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Error al eliminar la evidencia");
    } finally {
      setDeletingId(null);
    }
  };

  const totalFiles = previews.length + evidencias.length;
  const canAddMore = totalFiles < maxFiles;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">
            Fotos de {TIPO_LABELS[tipo]}
          </h3>
          <span className="text-sm text-gray-500">
            ({totalFiles}/{maxFiles})
          </span>
        </div>
        {ordenId && previews.length > 0 && (
          <Button
            size="sm"
            onClick={uploadFiles}
            isLoading={uploading}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-1" />
            Subir {previews.length}
          </Button>
        )}
      </div>

      {/* Zona de Drop */}
      {canAddMore && !disabled && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            dragActive
              ? "border-[#31A7D4] bg-[#31A7D4]/10"
              : "border-gray-300 hover:border-[#31A7D4] hover:bg-[#31A7D4]/5"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <ImagePlus className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-600 font-medium">
                Arrastra fotos aquí
              </p>
              <p className="text-sm text-gray-400">
                o haz clic para seleccionar
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botón de cámara para móvil */}
      {canAddMore && !disabled && (
        <div className="flex gap-2">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 sm:flex-none"
          >
            <Camera className="w-4 h-4 mr-2" />
            Tomar foto
          </Button>
        </div>
      )}

      {/* Progress bar */}
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#31A7D4] h-2 rounded-full transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Grid de previews pendientes */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {previews.map((preview, index) => (
            <div
              key={preview.preview}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group"
            >
              <Image
                src={preview.preview}
                alt={`Preview ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />

              {/* Overlay de estado */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all ${
                  preview.status === "uploading"
                    ? "bg-black/50"
                    : preview.status === "success"
                    ? "bg-green-500/50"
                    : preview.status === "error"
                    ? "bg-red-500/50"
                    : "bg-black/0 group-hover:bg-black/30"
                }`}
              >
                {preview.status === "uploading" && (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                )}
                {preview.status === "success" && (
                  <CheckCircle className="w-6 h-6 text-white" />
                )}
                {preview.status === "error" && (
                  <AlertCircle className="w-6 h-6 text-white" />
                )}
                {preview.status === "pending" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removePreview(index);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-500 rounded-full text-white transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Badge "Nuevo" */}
              {preview.status === "pending" && (
                <span className="absolute top-1 left-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded">
                  Nuevo
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Grid de evidencias existentes */}
      {evidencias.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {evidencias.map((evidencia) => (
            <div
              key={evidencia.id}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group"
            >
              <Image
                src={evidencia.url}
                alt={evidencia.descripcion || evidencia.tipo}
                fill
                className="object-cover"
                unoptimized
              />

              {/* Label del tipo */}
              <span className="absolute bottom-1 left-1 right-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded text-center truncate">
                {TIPO_LABELS[evidencia.tipo]}
              </span>

              {/* Botón eliminar */}
              {ordenId && !disabled && (
                <button
                  onClick={() => deleteEvidencia(evidencia.id)}
                  disabled={deletingId === evidencia.id}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1.5 bg-red-500 rounded-full text-white transition-opacity disabled:opacity-50"
                >
                  {deletingId === evidencia.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {totalFiles === 0 && disabled && (
        <div className="text-center py-8 text-gray-500">
          <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Sin evidencias fotográficas</p>
        </div>
      )}
    </div>
  );
}

export default EvidenciaUpload;
