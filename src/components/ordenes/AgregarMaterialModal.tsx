"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Input, Card } from "@/components/ui";
import { X, Search, Package, PenLine } from "lucide-react";

interface MaterialResult {
  id: string;
  sku: string;
  nombre: string;
  stockActual: number;
  precioVenta: number | null;
}

interface AgregarMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordenId: string;
  onSuccess: () => void;
}

type TabMode = "catalogo" | "manual";

export function AgregarMaterialModal({
  isOpen,
  onClose,
  ordenId,
  onSuccess,
}: AgregarMaterialModalProps) {
  const [tab, setTab] = useState<TabMode>("catalogo");

  // === Estado catálogo ===
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<MaterialResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<MaterialResult | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState("");

  // === Estado manual ===
  const [descripcionManual, setDescripcionManual] = useState("");
  const [cantidadManual, setCantidadManual] = useState(1);
  const [precioManual, setPrecioManual] = useState("");

  // === Estado compartido ===
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchMateriales = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/materiales?search=${encodeURIComponent(query)}&activos=true&pageSize=10`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.materiales || data);
      }
    } catch {
      // silently fail search
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchMateriales(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchMateriales]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTab("catalogo");
      setSearch("");
      setResults([]);
      setSelected(null);
      setCantidad(1);
      setPrecioUnitario("");
      setDescripcionManual("");
      setCantidadManual(1);
      setPrecioManual("");
      setError(null);
    }
  }, [isOpen]);

  const handleSelect = (material: MaterialResult) => {
    setSelected(material);
    setPrecioUnitario(
      material.precioVenta != null ? String(material.precioVenta) : ""
    );
    setCantidad(1);
    setResults([]);
    setSearch("");
    setError(null);
  };

  const handleSubmitCatalogo = async () => {
    if (!selected) return;

    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        materialId: selected.id,
        cantidad,
      };
      if (precioUnitario !== "") {
        body.precioUnitario = Number(precioUnitario);
      }

      const res = await fetch(`/api/ordenes/${ordenId}/materiales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al agregar material");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitManual = async () => {
    if (!descripcionManual.trim()) {
      setError("La descripción es obligatoria");
      return;
    }
    if (!precioManual || Number(precioManual) < 0) {
      setError("El precio unitario es obligatorio");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/ordenes/${ordenId}/materiales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descripcionManual: descripcionManual.trim(),
          cantidad: cantidadManual,
          precioUnitario: Number(precioManual),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al agregar material");
      }

      onSuccess();
      onClose();
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
      <Card className="relative w-full max-w-md max-h-[90vh] overflow-hidden bg-white shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#092139]">
            Agregar Material
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => { setTab("catalogo"); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              tab === "catalogo"
                ? "text-[#31A7D4] border-b-2 border-[#31A7D4]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Package className="w-4 h-4" />
            Del catálogo
          </button>
          <button
            onClick={() => { setTab("manual"); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              tab === "manual"
                ? "text-[#31A7D4] border-b-2 border-[#31A7D4]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <PenLine className="w-4 h-4" />
            Manual
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* === TAB CATÁLOGO === */}
          {tab === "catalogo" && (
            <>
              {!selected ? (
                <>
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar material por nombre o SKU..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent text-sm"
                      autoFocus
                    />
                  </div>

                  {/* Results */}
                  {searching && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Buscando...
                    </p>
                  )}

                  {results.length > 0 && (
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {results.map((mat) => (
                        <button
                          key={mat.id}
                          onClick={() => handleSelect(mat)}
                          className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                        >
                          <p className="font-medium text-gray-900 text-sm">
                            {mat.nombre}
                          </p>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>SKU: {mat.sku}</span>
                            <span>Stock: {mat.stockActual}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {search.length >= 2 && !searching && results.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No se encontraron materiales</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Prueba la pestaña &quot;Manual&quot; para agregar materiales fuera de catálogo
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Selected material */}
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {selected.nombre}
                        </p>
                        <p className="text-sm text-gray-500">
                          SKU: {selected.sku} &bull; Stock: {selected.stockActual}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelected(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <Input
                    label="Cantidad"
                    type="number"
                    min={1}
                    max={selected.stockActual}
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value) || 1)}
                  />

                  <Input
                    label="Precio Unitario"
                    type="number"
                    step="0.01"
                    min={0}
                    value={precioUnitario}
                    onChange={(e) => setPrecioUnitario(e.target.value)}
                    placeholder="Opcional"
                  />
                </>
              )}
            </>
          )}

          {/* === TAB MANUAL === */}
          {tab === "manual" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción del material
                </label>
                <input
                  type="text"
                  placeholder="Ej: Interruptor especial para PV-90"
                  value={descripcionManual}
                  onChange={(e) => setDescripcionManual(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent text-sm"
                  autoFocus
                />
              </div>

              <Input
                label="Cantidad"
                type="number"
                min={1}
                value={cantidadManual}
                onChange={(e) => setCantidadManual(Number(e.target.value) || 1)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio unitario
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={precioManual}
                    onChange={(e) => setPrecioManual(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {(tab === "manual" || selected) && (
          <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={tab === "catalogo" ? handleSubmitCatalogo : handleSubmitManual}
              isLoading={saving}
            >
              Agregar
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
