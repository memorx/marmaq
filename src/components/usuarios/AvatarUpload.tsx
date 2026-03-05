"use client";

import { useState, useRef } from "react";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/ui";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  userName?: string | null;
  onAvatarChanged?: (newUrl: string | null) => void;
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  userName,
  onAvatarChanged,
}: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    currentAvatarUrl || null
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMsg("");
    setStatus("idle");

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setStatus("uploading");
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(`/api/usuarios/${userId}/avatar`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Error al subir avatar");
        return;
      }

      setAvatarUrl(data.avatarUrl);
      setPreview(null);
      setSelectedFile(null);
      setStatus("idle");
      onAvatarChanged?.(data.avatarUrl);
    } catch {
      setStatus("error");
      setErrorMsg("Error de conexión al subir avatar");
    }
  };

  const handleDelete = async () => {
    setStatus("uploading");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/usuarios/${userId}/avatar`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setStatus("error");
        setErrorMsg(data.error || "Error al eliminar avatar");
        return;
      }

      setAvatarUrl(null);
      setPreview(null);
      setSelectedFile(null);
      setStatus("idle");
      onAvatarChanged?.(null);
    } catch {
      setStatus("error");
      setErrorMsg("Error de conexión al eliminar avatar");
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setSelectedFile(null);
    setErrorMsg("");
    setStatus("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayUrl = preview || avatarUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar con overlay de cámara */}
      <div
        className="relative group cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <UserAvatar
          user={{ name: userName, avatarUrl: displayUrl }}
          size="lg"
        />
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="w-6 h-6 text-white" />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Botones de acción */}
      <div className="flex gap-2">
        {preview && selectedFile && (
          <>
            <button
              onClick={handleUpload}
              disabled={status === "uploading"}
              className="px-4 py-2 bg-[#D57828] text-white text-sm rounded-lg hover:bg-[#c06b22] disabled:opacity-50 flex items-center gap-2"
            >
              {status === "uploading" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Guardar
            </button>
            <button
              onClick={handleCancel}
              disabled={status === "uploading"}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              Cancelar
            </button>
          </>
        )}
        {!preview && avatarUrl && (
          <button
            onClick={handleDelete}
            disabled={status === "uploading"}
            className="px-4 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 disabled:opacity-50 flex items-center gap-2"
          >
            {status === "uploading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Eliminar foto
          </button>
        )}
      </div>

      {/* Error */}
      {status === "error" && errorMsg && (
        <p className="text-red-500 text-sm">{errorMsg}</p>
      )}
    </div>
  );
}
