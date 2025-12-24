"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card } from "@/components/ui";
import { X, Save, Package, AlertTriangle } from "lucide-react";

interface Material {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  precioCompra: number | null;
  precioVenta: number | null;
  activo: boolean;
}

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  material: Material | null;
}

interface FormData {
  sku: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  stockActual: string;
  stockMinimo: string;
  precioCompra: string;
  precioVenta: string;
  activo: boolean;
}

const CATEGORIAS = [
  { value: "REFACCION", label: "Refacción" },
  { value: "CONSUMIBLE", label: "Consumible" },
  { value: "HERRAMIENTA", label: "Herramienta" },
];

export function MaterialModal({ isOpen, onClose, onSave, material }: MaterialModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    sku: "",
    nombre: "",
    descripcion: "",
    categoria: "REFACCION",
    stockActual: "0",
    stockMinimo: "5",
    precioCompra: "",
    precioVenta: "",
    activo: true,
  });

  const isEditing = !!material;

  useEffect(() => {
    if (isOpen) {
      if (material) {
        setFormData({
          sku: material.sku,
          nombre: material.nombre,
          descripcion: material.descripcion || "",
          categoria: material.categoria,
          stockActual: String(material.stockActual),
          stockMinimo: String(material.stockMinimo),
          precioCompra: material.precioCompra !== null ? String(material.precioCompra) : "",
          precioVenta: material.precioVenta !== null ? String(material.precioVenta) : "",
          activo: material.activo,
        });
      } else {
        setFormData({
          sku: "",
          nombre: "",
          descripcion: "",
          categoria: "REFACCION",
          stockActual: "0",
          stockMinimo: "5",
          precioCompra: "",
          precioVenta: "",
          activo: true,
        });
      }
      setError(null);
    }
  }, [isOpen, material]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validar campos requeridos
      if (!formData.sku.trim()) {
        throw new Error("El SKU es requerido");
      }
      if (!formData.nombre.trim()) {
        throw new Error("El nombre es requerido");
      }

      // Validar números
      const stockActual = parseInt(formData.stockActual) || 0;
      const stockMinimo = parseInt(formData.stockMinimo) || 0;
      const precioCompra = formData.precioCompra ? parseFloat(formData.precioCompra) : null;
      const precioVenta = formData.precioVenta ? parseFloat(formData.precioVenta) : null;

      if (stockActual < 0) {
        throw new Error("El stock actual no puede ser negativo");
      }
      if (stockMinimo < 0) {
        throw new Error("El stock mínimo no puede ser negativo");
      }
      if (precioCompra !== null && precioCompra < 0) {
        throw new Error("El precio de compra no puede ser negativo");
      }
      if (precioVenta !== null && precioVenta < 0) {
        throw new Error("El precio de venta no puede ser negativo");
      }

      const url = isEditing ? `/api/materiales/${material.id}` : "/api/materiales";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: formData.sku.trim(),
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || null,
          categoria: formData.categoria,
          stockActual,
          stockMinimo,
          precioCompra,
          precioVenta,
          activo: formData.activo,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar material");
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
              <Package className="w-5 h-5 text-[#31A7D4]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#092139]">
                {isEditing ? "Editar Material" : "Nuevo Material"}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditing ? material.sku : "Ingresa los datos del material"}
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
            {/* SKU (requerido) */}
            <Input
              label="SKU *"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="REF-001"
              required
            />

            {/* Nombre (requerido) */}
            <Input
              label="Nombre *"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Nombre del material"
              required
            />

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent resize-none"
                placeholder="Descripción del material..."
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría *
              </label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
              >
                {CATEGORIAS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Stock Actual"
                type="number"
                min="0"
                value={formData.stockActual}
                onChange={(e) => setFormData({ ...formData, stockActual: e.target.value })}
                placeholder="0"
              />
              <Input
                label="Stock Mínimo"
                type="number"
                min="0"
                value={formData.stockMinimo}
                onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value })}
                placeholder="5"
              />
            </div>

            {/* Precios */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Precio Compra"
                type="number"
                min="0"
                step="0.01"
                value={formData.precioCompra}
                onChange={(e) => setFormData({ ...formData, precioCompra: e.target.value })}
                placeholder="0.00"
              />
              <Input
                label="Precio Venta"
                type="number"
                min="0"
                step="0.01"
                value={formData.precioVenta}
                onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
                placeholder="0.00"
              />
            </div>

            {/* Activo */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) =>
                  setFormData({ ...formData, activo: e.target.checked })
                }
                className="w-4 h-4 text-[#31A7D4] border-gray-300 rounded focus:ring-[#31A7D4]"
              />
              <label htmlFor="activo" className="flex-1">
                <span className="font-medium text-gray-700">Material Activo</span>
                <p className="text-sm text-gray-500">
                  Los materiales inactivos no aparecen en búsquedas
                </p>
              </label>
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
            {isEditing ? "Guardar Cambios" : "Crear Material"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
