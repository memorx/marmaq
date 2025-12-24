"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  X,
  MessageCircle,
  Send,
  Loader2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface OrdenData {
  id: string;
  folio: string;
  cliente: {
    nombre: string;
    telefono: string;
  };
  marcaEquipo: string;
  modeloEquipo: string;
}

interface EnviarWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  orden: OrdenData;
}

const TIPOS_NOTIFICACION = [
  { value: "RECIBIDO", label: "Equipo Recibido", descripcion: "Confirmar recepción del equipo" },
  { value: "EN_REPARACION", label: "En Reparación", descripcion: "Notificar que está en proceso" },
  { value: "COTIZACION", label: "Cotización", descripcion: "Enviar cotización al cliente" },
  { value: "LISTO_ENTREGA", label: "Listo para Entrega", descripcion: "Avisar que puede recoger" },
  { value: "ENTREGADO", label: "Agradecimiento", descripcion: "Mensaje post-entrega" },
  { value: "RECORDATORIO", label: "Recordatorio", descripcion: "Recordar que recoja su equipo" },
];

export function EnviarWhatsAppModal({ isOpen, onClose, orden }: EnviarWhatsAppModalProps) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState("LISTO_ENTREGA");
  const [mensajePersonalizado, setMensajePersonalizado] = useState("");
  const [usarPersonalizado, setUsarPersonalizado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    success: boolean;
    linkWhatsApp?: string;
    mensaje?: string;
    error?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleEnviar = async () => {
    setLoading(true);
    setResultado(null);

    try {
      const res = await fetch("/api/notificaciones/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ordenId: orden.id,
          tipo: usarPersonalizado ? "PERSONALIZADO" : tipoSeleccionado,
          mensajePersonalizado: usarPersonalizado ? mensajePersonalizado : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al crear notificación");
      }

      setResultado({
        success: true,
        linkWhatsApp: data.linkWhatsApp,
        mensaje: data.mensaje,
      });
    } catch (err) {
      setResultado({
        success: false,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirWhatsApp = () => {
    if (resultado?.linkWhatsApp) {
      window.open(resultado.linkWhatsApp, "_blank");
    }
  };

  const handleCerrar = () => {
    setResultado(null);
    setUsarPersonalizado(false);
    setMensajePersonalizado("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleCerrar}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-[#092139]">Enviar WhatsApp</h2>
          </div>
          <button
            onClick={handleCerrar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Info de la orden */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Orden</p>
            <p className="font-medium text-gray-900">{orden.folio}</p>
            <p className="text-sm text-gray-600">
              {orden.cliente.nombre} • {orden.cliente.telefono}
            </p>
            <p className="text-sm text-gray-600">
              {orden.marcaEquipo} {orden.modeloEquipo}
            </p>
          </div>

          {/* Resultado */}
          {resultado && (
            <div
              className={`p-4 rounded-lg ${
                resultado.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              {resultado.success ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Notificación creada</span>
                  </div>
                  <p className="text-sm text-green-600">{resultado.mensaje}</p>
                  <Button
                    onClick={handleAbrirWhatsApp}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir WhatsApp
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span>{resultado.error}</span>
                </div>
              )}
            </div>
          )}

          {/* Selector de tipo */}
          {!resultado?.success && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de mensaje
                </label>
                <div className="space-y-2">
                  {TIPOS_NOTIFICACION.map((tipo) => (
                    <label
                      key={tipo.value}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        tipoSeleccionado === tipo.value && !usarPersonalizado
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipo"
                        value={tipo.value}
                        checked={tipoSeleccionado === tipo.value && !usarPersonalizado}
                        onChange={() => {
                          setTipoSeleccionado(tipo.value);
                          setUsarPersonalizado(false);
                        }}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{tipo.label}</p>
                        <p className="text-sm text-gray-500">{tipo.descripcion}</p>
                      </div>
                      {tipoSeleccionado === tipo.value && !usarPersonalizado && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </label>
                  ))}

                  {/* Opción personalizada */}
                  <label
                    className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                      usarPersonalizado
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo"
                      checked={usarPersonalizado}
                      onChange={() => setUsarPersonalizado(true)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Mensaje personalizado</p>
                      <p className="text-sm text-gray-500 mb-2">Escribe tu propio mensaje</p>
                      {usarPersonalizado && (
                        <textarea
                          value={mensajePersonalizado}
                          onChange={(e) => setMensajePersonalizado(e.target.value)}
                          placeholder="Escribe tu mensaje aquí..."
                          rows={4}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        />
                      )}
                    </div>
                    {usarPersonalizado && <CheckCircle className="w-5 h-5 text-green-600 mt-1" />}
                  </label>
                </div>
              </div>

              {/* Botón enviar */}
              <Button
                onClick={handleEnviar}
                disabled={loading || (usarPersonalizado && !mensajePersonalizado.trim())}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Crear Notificación
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
