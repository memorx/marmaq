"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card } from "@/components/ui";
import { X, Save, User, Building2, AlertTriangle } from "lucide-react";

interface Cliente {
  id: string;
  nombre: string;
  empresa: string | null;
  telefono: string;
  email: string | null;
  direccion: string | null;
  ciudad: string | null;
  esDistribuidor: boolean;
  codigoDistribuidor: string | null;
  notas: string | null;
}

interface ClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  cliente: Cliente | null;
}

interface FormData {
  nombre: string;
  empresa: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  esDistribuidor: boolean;
  codigoDistribuidor: string;
  notas: string;
}

export function ClienteModal({ isOpen, onClose, onSave, cliente }: ClienteModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    empresa: "",
    telefono: "",
    email: "",
    direccion: "",
    ciudad: "",
    esDistribuidor: false,
    codigoDistribuidor: "",
    notas: "",
  });

  const isEditing = !!cliente;

  useEffect(() => {
    if (isOpen) {
      if (cliente) {
        setFormData({
          nombre: cliente.nombre,
          empresa: cliente.empresa || "",
          telefono: cliente.telefono,
          email: cliente.email || "",
          direccion: cliente.direccion || "",
          ciudad: cliente.ciudad || "",
          esDistribuidor: cliente.esDistribuidor,
          codigoDistribuidor: cliente.codigoDistribuidor || "",
          notas: cliente.notas || "",
        });
      } else {
        setFormData({
          nombre: "",
          empresa: "",
          telefono: "",
          email: "",
          direccion: "",
          ciudad: "",
          esDistribuidor: false,
          codigoDistribuidor: "",
          notas: "",
        });
      }
      setError(null);
    }
  }, [isOpen, cliente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validar campos requeridos
      if (!formData.nombre.trim()) {
        throw new Error("El nombre es requerido");
      }
      if (!formData.telefono.trim()) {
        throw new Error("El teléfono es requerido");
      }

      const url = isEditing ? `/api/clientes/${cliente.id}` : "/api/clientes";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          empresa: formData.empresa.trim() || null,
          telefono: formData.telefono.trim(),
          email: formData.email.trim() || null,
          direccion: formData.direccion.trim() || null,
          ciudad: formData.ciudad.trim() || null,
          esDistribuidor: formData.esDistribuidor,
          codigoDistribuidor: formData.codigoDistribuidor.trim() || null,
          notas: formData.notas.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar cliente");
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <Card className="relative w-full max-w-lg max-h-[90vh] overflow-hidden bg-white shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#31A7D4]/10 flex items-center justify-center">
              {formData.esDistribuidor ? (
                <Building2 className="w-5 h-5 text-[#31A7D4]" />
              ) : (
                <User className="w-5 h-5 text-[#31A7D4]" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#092139]">
                {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditing ? cliente.nombre : "Ingresa los datos del cliente"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Nombre (requerido) */}
            <Input
              label="Nombre *"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Nombre del cliente"
              required
            />

            {/* Empresa */}
            <Input
              label="Empresa"
              value={formData.empresa}
              onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
              placeholder="Nombre de la empresa (opcional)"
            />

            {/* Teléfono (requerido) */}
            <Input
              label="Teléfono *"
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="33 1234 5678"
              required
            />

            {/* Email */}
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="correo@ejemplo.com"
            />

            {/* Dirección */}
            <Input
              label="Dirección"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              placeholder="Calle, número, colonia..."
            />

            {/* Ciudad */}
            <Input
              label="Ciudad"
              value={formData.ciudad}
              onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
              placeholder="Ciudad"
            />

            {/* Es Distribuidor */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="esDistribuidor"
                checked={formData.esDistribuidor}
                onChange={(e) =>
                  setFormData({ ...formData, esDistribuidor: e.target.checked })
                }
                className="w-4 h-4 text-[#31A7D4] border-gray-300 rounded focus:ring-[#31A7D4]"
              />
              <label htmlFor="esDistribuidor" className="flex-1">
                <span className="font-medium text-gray-700">Es Distribuidor</span>
                <p className="text-sm text-gray-500">
                  Marcar si es un distribuidor o centro de servicio autorizado
                </p>
              </label>
            </div>

            {/* Código Distribuidor (solo si es distribuidor) */}
            {formData.esDistribuidor && (
              <Input
                label="Código de Distribuidor"
                value={formData.codigoDistribuidor}
                onChange={(e) =>
                  setFormData({ ...formData, codigoDistribuidor: e.target.value })
                }
                placeholder="DIST-001"
              />
            )}

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent resize-none"
                placeholder="Notas adicionales sobre el cliente..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={saving}>
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? "Guardar Cambios" : "Crear Cliente"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
