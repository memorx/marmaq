"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Input, Card } from "@/components/ui";
import {
  X,
  Save,
  User,
  Wrench,
  FileText,
  Calendar,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import type {
  OrdenConRelaciones,
  EstadoOrden,
  Prioridad,
  CondicionEquipo,
  UpdateOrdenInput,
} from "@/types/ordenes";
import {
  STATUS_LABELS,
  PRIORIDAD_LABELS,
  CONDICION_LABELS,
} from "@/types/ordenes";

interface Tecnico {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface EditOrdenModalProps {
  orden: OrdenConRelaciones;
  isOpen: boolean;
  onClose: () => void;
  onSave: (ordenActualizada: OrdenConRelaciones) => void;
}

type TabId = "general" | "equipo" | "tecnico" | "cotizacion";

const ESTADOS_EDITABLES: EstadoOrden[] = [
  "RECIBIDO",
  "EN_DIAGNOSTICO",
  "ESPERA_REFACCIONES",
  "COTIZACION_PENDIENTE",
  "EN_REPARACION",
  "REPARADO",
  "LISTO_ENTREGA",
  "ENTREGADO",
];

export function EditOrdenModal({ orden, isOpen, onClose, onSave }: EditOrdenModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loadingTecnicos, setLoadingTecnicos] = useState(true);

  // Form state
  const [formData, setFormData] = useState<UpdateOrdenInput>({
    estado: orden.estado,
    prioridad: orden.prioridad,
    tecnicoId: orden.tecnicoId || undefined,
    marcaEquipo: orden.marcaEquipo,
    modeloEquipo: orden.modeloEquipo,
    serieEquipo: orden.serieEquipo || "",
    condicionEquipo: orden.condicionEquipo,
    fallaReportada: orden.fallaReportada,
    diagnostico: orden.diagnostico || "",
    notasTecnico: orden.notasTecnico || "",
    fechaPromesa: orden.fechaPromesa ? new Date(orden.fechaPromesa).toISOString().split("T")[0] : "",
    cotizacion: orden.cotizacion ? Number(orden.cotizacion) : undefined,
    cotizacionAprobada: orden.cotizacionAprobada,
    numeroFactura: orden.numeroFactura || "",
    fechaFactura: orden.fechaFactura ? new Date(orden.fechaFactura).toISOString().split("T")[0] : "",
    numeroRepare: orden.numeroRepare || "",
    coordenadasGPS: orden.coordenadasGPS || "",
  });

  // Fetch técnicos
  const fetchTecnicos = useCallback(async () => {
    try {
      const res = await fetch("/api/usuarios?role=TECNICO,COORD_SERVICIO");
      if (res.ok) {
        const data = await res.json();
        setTecnicos(data);
      }
    } catch (err) {
      console.error("Error fetching tecnicos:", err);
    } finally {
      setLoadingTecnicos(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTecnicos();
      // Reset form when modal opens
      setFormData({
        estado: orden.estado,
        prioridad: orden.prioridad,
        tecnicoId: orden.tecnicoId || undefined,
        marcaEquipo: orden.marcaEquipo,
        modeloEquipo: orden.modeloEquipo,
        serieEquipo: orden.serieEquipo || "",
        condicionEquipo: orden.condicionEquipo,
        fallaReportada: orden.fallaReportada,
        diagnostico: orden.diagnostico || "",
        notasTecnico: orden.notasTecnico || "",
        fechaPromesa: orden.fechaPromesa ? new Date(orden.fechaPromesa).toISOString().split("T")[0] : "",
        cotizacion: orden.cotizacion ? Number(orden.cotizacion) : undefined,
        cotizacionAprobada: orden.cotizacionAprobada,
        numeroFactura: orden.numeroFactura || "",
        fechaFactura: orden.fechaFactura ? new Date(orden.fechaFactura).toISOString().split("T")[0] : "",
        numeroRepare: orden.numeroRepare || "",
        coordenadasGPS: orden.coordenadasGPS || "",
      });
      setError(null);
      setActiveTab("general");
    }
  }, [isOpen, orden, fetchTecnicos]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Preparar datos para enviar (solo campos que cambiaron)
      const updatePayload: UpdateOrdenInput = {};

      if (formData.estado !== orden.estado) {
        updatePayload.estado = formData.estado;
      }
      if (formData.prioridad !== orden.prioridad) {
        updatePayload.prioridad = formData.prioridad;
      }
      if (formData.tecnicoId !== orden.tecnicoId) {
        updatePayload.tecnicoId = formData.tecnicoId || null;
      }
      if (formData.marcaEquipo !== orden.marcaEquipo) {
        updatePayload.marcaEquipo = formData.marcaEquipo;
      }
      if (formData.modeloEquipo !== orden.modeloEquipo) {
        updatePayload.modeloEquipo = formData.modeloEquipo;
      }
      if (formData.serieEquipo !== (orden.serieEquipo || "")) {
        updatePayload.serieEquipo = formData.serieEquipo || undefined;
      }
      if (formData.condicionEquipo !== orden.condicionEquipo) {
        updatePayload.condicionEquipo = formData.condicionEquipo;
      }
      if (formData.fallaReportada !== orden.fallaReportada) {
        updatePayload.fallaReportada = formData.fallaReportada;
      }
      if (formData.diagnostico !== (orden.diagnostico || "")) {
        updatePayload.diagnostico = formData.diagnostico || undefined;
      }
      if (formData.notasTecnico !== (orden.notasTecnico || "")) {
        updatePayload.notasTecnico = formData.notasTecnico || undefined;
      }

      const fechaPromesaOriginal = orden.fechaPromesa
        ? new Date(orden.fechaPromesa).toISOString().split("T")[0]
        : "";
      if (formData.fechaPromesa !== fechaPromesaOriginal) {
        updatePayload.fechaPromesa = formData.fechaPromesa || undefined;
      }

      // Cotización (solo para POR_COBRAR)
      if (orden.tipoServicio === "POR_COBRAR") {
        const cotizacionOriginal = orden.cotizacion ? Number(orden.cotizacion) : undefined;
        if (formData.cotizacion !== cotizacionOriginal) {
          updatePayload.cotizacion = formData.cotizacion;
        }
        if (formData.cotizacionAprobada !== orden.cotizacionAprobada) {
          updatePayload.cotizacionAprobada = formData.cotizacionAprobada;
        }
      }

      // Garantía
      if (orden.tipoServicio === "GARANTIA") {
        if (formData.numeroFactura !== (orden.numeroFactura || "")) {
          updatePayload.numeroFactura = formData.numeroFactura || undefined;
        }
        const fechaFacturaOriginal = orden.fechaFactura
          ? new Date(orden.fechaFactura).toISOString().split("T")[0]
          : "";
        if (formData.fechaFactura !== fechaFacturaOriginal) {
          updatePayload.fechaFactura = formData.fechaFactura || undefined;
        }
      }

      // REPARE
      if (orden.tipoServicio === "REPARE") {
        if (formData.numeroRepare !== (orden.numeroRepare || "")) {
          updatePayload.numeroRepare = formData.numeroRepare || undefined;
        }
        if (formData.coordenadasGPS !== (orden.coordenadasGPS || "")) {
          updatePayload.coordenadasGPS = formData.coordenadasGPS || undefined;
        }
      }

      // Si no hay cambios, cerrar
      if (Object.keys(updatePayload).length === 0) {
        onClose();
        return;
      }

      const res = await fetch(`/api/ordenes/${orden.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar cambios");
      }

      const ordenActualizada = await res.json();
      onSave(ordenActualizada);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <FileText className="w-4 h-4" /> },
    { id: "equipo", label: "Equipo", icon: <Wrench className="w-4 h-4" /> },
    { id: "tecnico", label: "Notas", icon: <User className="w-4 h-4" /> },
  ];

  if (orden.tipoServicio === "POR_COBRAR") {
    tabs.push({ id: "cotizacion", label: "Cotización", icon: <DollarSign className="w-4 h-4" /> });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-[#092139]">
              Editar Orden {orden.folio}
            </h2>
            <p className="text-sm text-gray-500">
              {orden.marcaEquipo} {orden.modeloEquipo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-[#31A7D4] border-b-2 border-[#31A7D4]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Tab: General */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as EstadoOrden })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
                  >
                    {ESTADOS_EDITABLES.map((estado) => (
                      <option key={estado} value={estado}>
                        {STATUS_LABELS[estado]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as Prioridad })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
                  >
                    {(["BAJA", "NORMAL", "ALTA", "URGENTE"] as Prioridad[]).map((p) => (
                      <option key={p} value={p}>
                        {PRIORIDAD_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Técnico Asignado
                </label>
                <select
                  value={formData.tecnicoId || ""}
                  onChange={(e) => setFormData({ ...formData, tecnicoId: e.target.value || undefined })}
                  disabled={loadingTecnicos}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent disabled:bg-gray-50"
                >
                  <option value="">Sin asignar</option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha Promesa
                </label>
                <Input
                  type="date"
                  value={formData.fechaPromesa || ""}
                  onChange={(e) => setFormData({ ...formData, fechaPromesa: e.target.value })}
                />
              </div>

              {/* Campos específicos por tipo */}
              {orden.tipoServicio === "GARANTIA" && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <Input
                    label="No. Factura"
                    value={formData.numeroFactura || ""}
                    onChange={(e) => setFormData({ ...formData, numeroFactura: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Factura
                    </label>
                    <Input
                      type="date"
                      value={formData.fechaFactura || ""}
                      onChange={(e) => setFormData({ ...formData, fechaFactura: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {orden.tipoServicio === "REPARE" && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <Input
                    label="No. REPARE"
                    value={formData.numeroRepare || ""}
                    onChange={(e) => setFormData({ ...formData, numeroRepare: e.target.value })}
                  />
                  <Input
                    label="Coordenadas GPS"
                    value={formData.coordenadasGPS || ""}
                    onChange={(e) => setFormData({ ...formData, coordenadasGPS: e.target.value })}
                    placeholder="20.6597,-103.3496"
                  />
                </div>
              )}
            </div>
          )}

          {/* Tab: Equipo */}
          {activeTab === "equipo" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Marca"
                  value={formData.marcaEquipo || ""}
                  onChange={(e) => setFormData({ ...formData, marcaEquipo: e.target.value })}
                />
                <Input
                  label="Modelo"
                  value={formData.modeloEquipo || ""}
                  onChange={(e) => setFormData({ ...formData, modeloEquipo: e.target.value })}
                />
              </div>

              <Input
                label="No. Serie"
                value={formData.serieEquipo || ""}
                onChange={(e) => setFormData({ ...formData, serieEquipo: e.target.value })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condición del Equipo
                </label>
                <select
                  value={formData.condicionEquipo}
                  onChange={(e) => setFormData({ ...formData, condicionEquipo: e.target.value as CondicionEquipo })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
                >
                  {(["BUENA", "REGULAR", "MALA"] as CondicionEquipo[]).map((c) => (
                    <option key={c} value={c}>
                      {CONDICION_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Falla Reportada
                </label>
                <textarea
                  value={formData.fallaReportada || ""}
                  onChange={(e) => setFormData({ ...formData, fallaReportada: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent resize-none"
                  placeholder="Descripción de la falla..."
                />
              </div>
            </div>
          )}

          {/* Tab: Notas del Técnico */}
          {activeTab === "tecnico" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diagnóstico
                </label>
                <textarea
                  value={formData.diagnostico || ""}
                  onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent resize-none"
                  placeholder="Resultado del diagnóstico técnico..."
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Notas del Técnico (amarillas)
                </label>
                <textarea
                  value={formData.notasTecnico || ""}
                  onChange={(e) => setFormData({ ...formData, notasTecnico: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
                  placeholder="Notas internas, observaciones, solución aplicada..."
                />
                <p className="mt-2 text-xs text-amber-600">
                  Estas notas son visibles para todo el equipo y aparecen destacadas en el detalle de la orden.
                </p>
              </div>
            </div>
          )}

          {/* Tab: Cotización (solo POR_COBRAR) */}
          {activeTab === "cotizacion" && orden.tipoServicio === "POR_COBRAR" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto de Cotización
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cotizacion || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      cotizacion: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="cotizacionAprobada"
                  checked={formData.cotizacionAprobada || false}
                  onChange={(e) => setFormData({ ...formData, cotizacionAprobada: e.target.checked })}
                  className="w-4 h-4 text-[#31A7D4] border-gray-300 rounded focus:ring-[#31A7D4]"
                />
                <label htmlFor="cotizacionAprobada" className="text-sm text-gray-700">
                  Cotización aprobada por el cliente
                </label>
              </div>

              {formData.cotizacion && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Vista previa:</p>
                  <p className="text-2xl font-bold text-[#092139]">
                    ${formData.cotizacion.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                  </p>
                  <p className={`text-sm mt-1 ${formData.cotizacionAprobada ? "text-green-600" : "text-amber-600"}`}>
                    {formData.cotizacionAprobada ? "Aprobada" : "Pendiente de aprobación"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} isLoading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </Card>
    </div>
  );
}
