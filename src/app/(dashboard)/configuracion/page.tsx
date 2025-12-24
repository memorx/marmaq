"use client";

import { useState, useEffect } from "react";
import { Card, Button } from "@/components/ui";
import {
  Settings,
  MessageSquare,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  Phone,
  Building,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface Plantilla {
  tipo: string;
  nombre: string;
  mensaje: string;
  activa: boolean;
  esDefault: boolean;
}

interface Config {
  whatsappHabilitado: boolean;
  whatsappNumeroEnvio: string;
  whatsappApiKey: string;
  empresaNombre: string;
  empresaTelefono: string;
  empresaDireccion: string;
}

const TIPO_LABELS: Record<string, string> = {
  RECIBIDO: "Equipo Recibido",
  EN_REPARACION: "En Reparación",
  COTIZACION: "Cotización Enviada",
  LISTO_ENTREGA: "Listo para Entrega",
  ENTREGADO: "Agradecimiento",
  RECORDATORIO: "Recordatorio",
  PERSONALIZADO: "Personalizado",
};

const VARIABLES_DISPONIBLES = [
  { variable: "{nombre}", descripcion: "Nombre del cliente" },
  { variable: "{empresa}", descripcion: "Empresa del cliente" },
  { variable: "{folio}", descripcion: "Folio de la orden" },
  { variable: "{marca}", descripcion: "Marca del equipo" },
  { variable: "{modelo}", descripcion: "Modelo del equipo" },
  { variable: "{tecnico}", descripcion: "Nombre del técnico" },
  { variable: "{cotizacion}", descripcion: "Monto de cotización" },
  { variable: "{fechaPromesa}", descripcion: "Fecha promesa" },
];

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [config, setConfig] = useState<Config>({
    whatsappHabilitado: false,
    whatsappNumeroEnvio: "",
    whatsappApiKey: "",
    empresaNombre: "",
    empresaTelefono: "",
    empresaDireccion: "",
  });

  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const res = await fetch("/api/configuracion");
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("No tienes permisos para ver esta página");
        }
        throw new Error("Error al cargar configuración");
      }
      const data = await res.json();
      setConfig(data.config);
      setPlantillas(data.plantillas);
      if (data.plantillas.length > 0) {
        setPlantillaSeleccionada(data.plantillas[0].tipo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/configuracion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configuraciones: {
            WHATSAPP_HABILITADO: config.whatsappHabilitado.toString(),
            WHATSAPP_NUMERO_ENVIO: config.whatsappNumeroEnvio,
            EMPRESA_NOMBRE: config.empresaNombre,
            EMPRESA_TELEFONO: config.empresaTelefono,
            EMPRESA_DIRECCION: config.empresaDireccion,
          },
          plantillas: plantillas.map((p) => ({
            tipo: p.tipo,
            nombre: p.nombre,
            mensaje: p.mensaje,
            activa: p.activa,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error("Error al guardar configuración");
      }

      setSuccess("Configuración guardada correctamente");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPlantilla(tipo: string) {
    if (!confirm("¿Restaurar esta plantilla a los valores predeterminados?")) {
      return;
    }

    try {
      const res = await fetch("/api/configuracion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo }),
      });

      if (!res.ok) {
        throw new Error("Error al restaurar plantilla");
      }

      const data = await res.json();
      setPlantillas((prev) =>
        prev.map((p) =>
          p.tipo === tipo
            ? { ...p, mensaje: data.plantilla.mensaje, nombre: data.plantilla.nombre, esDefault: true }
            : p
        )
      );
      setSuccess("Plantilla restaurada correctamente");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  function updatePlantilla(tipo: string, field: keyof Plantilla, value: string | boolean) {
    setPlantillas((prev) =>
      prev.map((p) => (p.tipo === tipo ? { ...p, [field]: value, esDefault: false } : p))
    );
  }

  const plantillaActual = plantillas.find((p) => p.tipo === plantillaSeleccionada);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#31A7D4]" />
      </div>
    );
  }

  if (error && !config.empresaNombre) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-[#31A7D4]" />
            Configuración
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona las notificaciones de WhatsApp y plantillas de mensajes
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuración General */}
        <div className="space-y-6">
          {/* WhatsApp Settings */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[#092139] mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Configuración de WhatsApp
            </h2>

            <div className="space-y-4">
              {/* Toggle habilitado */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Notificaciones WhatsApp</p>
                  <p className="text-sm text-gray-500">
                    Habilitar envío automático de mensajes
                  </p>
                </div>
                <button
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      whatsappHabilitado: !prev.whatsappHabilitado,
                    }))
                  }
                  className="text-3xl"
                >
                  {config.whatsappHabilitado ? (
                    <ToggleRight className="w-10 h-10 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Número de envío */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de WhatsApp para envío
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={config.whatsappNumeroEnvio}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, whatsappNumeroEnvio: e.target.value }))
                    }
                    placeholder="+52 123 456 7890"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#31A7D4] focus:border-[#31A7D4]"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Número desde el cual se enviarán los mensajes
                </p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Nota:</strong> Por ahora los mensajes se crean en la base de datos
                  y se genera un link para envío manual. La integración con WhatsApp Business
                  API se configurará próximamente.
                </p>
              </div>
            </div>
          </Card>

          {/* Datos de Empresa */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[#092139] mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              Datos de la Empresa
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la empresa
                </label>
                <input
                  type="text"
                  value={config.empresaNombre}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, empresaNombre: e.target.value }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#31A7D4] focus:border-[#31A7D4]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono de contacto
                </label>
                <input
                  type="text"
                  value={config.empresaTelefono}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, empresaTelefono: e.target.value }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#31A7D4] focus:border-[#31A7D4]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <textarea
                  value={config.empresaDireccion}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, empresaDireccion: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#31A7D4] focus:border-[#31A7D4]"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Plantillas de Mensajes */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[#092139] mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            Plantillas de Mensajes
          </h2>

          {/* Selector de plantilla */}
          <div className="flex flex-wrap gap-2 mb-4">
            {plantillas.map((p) => (
              <button
                key={p.tipo}
                onClick={() => setPlantillaSeleccionada(p.tipo)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  plantillaSeleccionada === p.tipo
                    ? "bg-[#31A7D4] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } ${!p.activa ? "opacity-50" : ""}`}
              >
                {TIPO_LABELS[p.tipo] || p.tipo}
              </button>
            ))}
          </div>

          {plantillaActual && (
            <div className="space-y-4">
              {/* Toggle activa */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Plantilla activa
                </label>
                <button
                  onClick={() =>
                    updatePlantilla(plantillaActual.tipo, "activa", !plantillaActual.activa)
                  }
                >
                  {plantillaActual.activa ? (
                    <ToggleRight className="w-8 h-8 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la plantilla
                </label>
                <input
                  type="text"
                  value={plantillaActual.nombre}
                  onChange={(e) =>
                    updatePlantilla(plantillaActual.tipo, "nombre", e.target.value)
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#31A7D4] focus:border-[#31A7D4]"
                />
              </div>

              {/* Mensaje */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje
                </label>
                <textarea
                  value={plantillaActual.mensaje}
                  onChange={(e) =>
                    updatePlantilla(plantillaActual.tipo, "mensaje", e.target.value)
                  }
                  rows={8}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#31A7D4] focus:border-[#31A7D4] font-mono text-sm"
                />
              </div>

              {/* Restaurar */}
              <div className="flex justify-between items-center">
                {!plantillaActual.esDefault && (
                  <button
                    onClick={() => handleResetPlantilla(plantillaActual.tipo)}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restaurar predeterminado
                  </button>
                )}
                <span className="text-xs text-gray-400">
                  {plantillaActual.esDefault ? "Usando plantilla predeterminada" : "Personalizada"}
                </span>
              </div>

              {/* Variables disponibles */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Variables disponibles:</p>
                <div className="flex flex-wrap gap-2">
                  {VARIABLES_DISPONIBLES.map((v) => (
                    <button
                      key={v.variable}
                      onClick={() => {
                        const textarea = document.querySelector("textarea");
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const text = plantillaActual.mensaje;
                          const newText = text.substring(0, start) + v.variable + text.substring(end);
                          updatePlantilla(plantillaActual.tipo, "mensaje", newText);
                        }
                      }}
                      className="px-2 py-1 bg-white border rounded text-xs font-mono hover:bg-gray-100"
                      title={v.descripcion}
                    >
                      {v.variable}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
