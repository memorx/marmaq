"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/components/ui";
import { EvidenciaUpload } from "@/components/ordenes";
import { MARMAQ_COLORS } from "@/lib/constants/colors";
import type { TipoServicio, Prioridad, CondicionEquipo, CreateOrdenInput } from "@/types/ordenes";
import {
  Shield,
  Building2,
  CreditCard,
  Snowflake,
  X,
  Search,
  Plus,
  ArrowLeft,
  User,
  AlertCircle,
} from "lucide-react";

// Opciones de tipos de equipo
const TIPO_EQUIPO_OPTIONS = [
  "Báscula",
  "Molino",
  "Rebanadora",
  "Sierra",
  "Empacadora",
  "Refrigerador",
  "Congelador",
  "Vitrina",
  "Otro",
];

// Opciones de marcas
const MARCA_OPTIONS = [
  "Torrey",
  "Imbera",
  "Migsa",
  "Ojeda",
  "Rhino",
  "Otro",
];

// Opciones de prioridad
const PRIORIDAD_OPTIONS: { value: Prioridad; label: string }[] = [
  { value: "BAJA", label: "Baja" },
  { value: "NORMAL", label: "Normal" },
  { value: "ALTA", label: "Alta" },
  { value: "URGENTE", label: "Urgente" },
];

// Tipos de servicio con info
const TIPOS_SERVICIO: {
  value: TipoServicio;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "GARANTIA",
    label: "Garantía Fábrica",
    description: "Equipo vendido por nosotros",
    icon: <Shield className="w-6 h-6" />,
    color: "#8B5CF6", // purple
  },
  {
    value: "CENTRO_SERVICIO",
    label: "Centro Servicio",
    description: "Otro distribuidor trae",
    icon: <Building2 className="w-6 h-6" />,
    color: MARMAQ_COLORS.blue.light,
  },
  {
    value: "POR_COBRAR",
    label: "Por Cobrar",
    description: "Cliente paga el servicio",
    icon: <CreditCard className="w-6 h-6" />,
    color: MARMAQ_COLORS.orange,
  },
  {
    value: "REPARE",
    label: "Canalizar REPARE",
    description: "Refrigeración Imbera/Torrey",
    icon: <Snowflake className="w-6 h-6" />,
    color: MARMAQ_COLORS.blue.dark,
  },
];

interface Tecnico {
  id: string;
  name: string;
}

interface ClienteBusqueda {
  id: string;
  nombre: string;
  empresa: string | null;
  telefono: string;
  email: string | null;
}

export default function NuevaOrdenPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tipo de servicio
  const [tipoServicio, setTipoServicio] = useState<TipoServicio | null>(null);

  // Equipo
  const [tipoEquipo, setTipoEquipo] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [serie, setSerie] = useState("");
  const [accesorios, setAccesorios] = useState("");
  const [fallaReportada, setFallaReportada] = useState("");
  const [condicionEquipo, setCondicionEquipo] = useState<CondicionEquipo>("REGULAR");

  // Cliente
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<ClienteBusqueda[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteBusqueda | null>(null);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    empresa: "",
    telefono: "",
    email: "",
  });

  // Asignación
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tecnicoId, setTecnicoId] = useState("");
  const [prioridad, setPrioridad] = useState<Prioridad>("NORMAL");

  // Garantía específicos
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaFactura, setFechaFactura] = useState("");

  // REPARE específicos
  const [numeroRepare, setNumeroRepare] = useState("");

  // Evidencias (archivos pendientes de subir)
  const [evidenciasFiles, setEvidenciasFiles] = useState<File[]>([]);

  // Cargar técnicos
  useEffect(() => {
    async function fetchTecnicos() {
      try {
        const res = await fetch("/api/usuarios?role=TECNICO");
        if (res.ok) {
          const data = await res.json();
          setTecnicos(data.usuarios || []);
        }
      } catch {
        // Datos de prueba si no hay API
        setTecnicos([
          { id: "1", name: "Juan Pérez" },
          { id: "2", name: "Carlos García" },
          { id: "3", name: "Miguel López" },
        ]);
      }
    }
    fetchTecnicos();
  }, []);

  // Buscar clientes
  useEffect(() => {
    if (busquedaCliente.length < 2) {
      setClientesEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clientes?search=${encodeURIComponent(busquedaCliente)}`);
        if (res.ok) {
          const data = await res.json();
          setClientesEncontrados(data.clientes || []);
        }
      } catch {
        setClientesEncontrados([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [busquedaCliente]);

  const handleSubmit = async () => {
    // Validaciones
    if (!tipoServicio) {
      setError("Selecciona un tipo de servicio");
      return;
    }

    if (!marca || !modelo) {
      setError("Marca y modelo del equipo son requeridos");
      return;
    }

    if (!fallaReportada) {
      setError("Describe la falla reportada");
      return;
    }

    if (!clienteSeleccionado && !mostrarNuevoCliente) {
      setError("Selecciona o crea un cliente");
      return;
    }

    if (mostrarNuevoCliente && (!nuevoCliente.nombre || !nuevoCliente.telefono)) {
      setError("Nombre y teléfono del cliente son requeridos");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Concatenar accesorios a la falla si existen
      const fallaCompleta = accesorios
        ? `${fallaReportada}\n\nAccesorios entregados: ${accesorios}`
        : fallaReportada;

      const payload: CreateOrdenInput = {
        tipoServicio,
        prioridad,
        marcaEquipo: marca,
        modeloEquipo: modelo,
        serieEquipo: serie || undefined,
        condicionEquipo,
        fallaReportada: fallaCompleta,
        tecnicoId: tecnicoId || undefined,
        numeroFactura: numeroFactura || undefined,
        fechaFactura: fechaFactura || undefined,
        numeroRepare: numeroRepare || undefined,
      };

      if (clienteSeleccionado) {
        payload.clienteId = clienteSeleccionado.id;
      } else {
        payload.clienteNuevo = {
          nombre: nuevoCliente.nombre,
          empresa: nuevoCliente.empresa || undefined,
          telefono: nuevoCliente.telefono,
          email: nuevoCliente.email || undefined,
        };
      }

      const res = await fetch("/api/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear la orden");
      }

      const orden = await res.json();

      // Subir evidencias si hay archivos pendientes
      if (evidenciasFiles.length > 0) {
        const formData = new FormData();
        formData.append("tipo", "RECEPCION");
        evidenciasFiles.forEach((file) => {
          formData.append("files", file);
        });

        try {
          await fetch(`/api/ordenes/${orden.id}/evidencias`, {
            method: "POST",
            body: formData,
          });
        } catch (uploadError) {
          console.error("Error uploading evidencias:", uploadError);
          // No bloquear la navegación si falla el upload
        }
      }

      router.push(`/ordenes/${orden.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/ordenes")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#092139]">Nueva Orden de Servicio</h1>
          <p className="text-gray-500 text-sm mt-1">Registra un nuevo equipo para reparación</p>
        </div>
      </div>

      {/* Error global */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Layout 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
        {/* COLUMNA IZQUIERDA */}
        <div className="space-y-6">
          {/* 1. Tipo de Servicio */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[#092139] mb-4">Tipo de Servicio</h2>
            <div className="grid grid-cols-2 gap-4">
              {TIPOS_SERVICIO.map((tipo) => (
                <button
                  key={tipo.value}
                  onClick={() => setTipoServicio(tipo.value)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    tipoServicio === tipo.value
                      ? "border-[#31A7D4] bg-[#31A7D4]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${tipo.color}15`, color: tipo.color }}
                  >
                    {tipo.icon}
                  </div>
                  <p className="font-medium text-[#092139]">{tipo.label}</p>
                  <p className="text-sm text-gray-500 mt-1">{tipo.description}</p>
                </button>
              ))}
            </div>

            {/* Campos específicos según tipo */}
            {tipoServicio === "GARANTIA" && (
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                <Input
                  label="No. Factura"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  placeholder="FAC-2024-XXXX"
                />
                <Input
                  label="Fecha de Factura"
                  type="date"
                  value={fechaFactura}
                  onChange={(e) => setFechaFactura(e.target.value)}
                />
              </div>
            )}

            {tipoServicio === "REPARE" && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Input
                  label="No. REPARE"
                  value={numeroRepare}
                  onChange={(e) => setNumeroRepare(e.target.value)}
                  placeholder="REP-XXXX"
                />
              </div>
            )}
          </Card>

          {/* 2. Información del Equipo */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[#092139] mb-4">Información del Equipo</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Equipo
                  </label>
                  <select
                    value={tipoEquipo}
                    onChange={(e) => setTipoEquipo(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    {TIPO_EQUIPO_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marca *
                  </label>
                  <select
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    {MARCA_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Modelo *"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Ej: L-EQ 10/20"
                />
                <Input
                  label="No. Serie"
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  placeholder="Ej: 1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condición del Equipo
                </label>
                <div className="flex gap-4">
                  {(["BUENA", "REGULAR", "MALA"] as CondicionEquipo[]).map((cond) => (
                    <label key={cond} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="condicion"
                        checked={condicionEquipo === cond}
                        onChange={() => setCondicionEquipo(cond)}
                        className="w-4 h-4 text-[#31A7D4] focus:ring-[#31A7D4]"
                      />
                      <span className="text-gray-700">
                        {cond === "BUENA" ? "Buena" : cond === "REGULAR" ? "Regular" : "Mala"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Input
                label="Accesorios Entregados"
                value={accesorios}
                onChange={(e) => setAccesorios(e.target.value)}
                placeholder="Ej: Plato, eliminador, cable de corriente"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción de la Falla *
                </label>
                <textarea
                  value={fallaReportada}
                  onChange={(e) => setFallaReportada(e.target.value)}
                  placeholder="Describe el problema que reporta el cliente..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent resize-none"
                />
              </div>
            </div>
          </Card>

          {/* 3. Datos del Cliente */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[#092139] mb-4">Datos del Cliente</h2>

            {!clienteSeleccionado && !mostrarNuevoCliente && (
              <div className="space-y-4">
                {/* Búsqueda */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar cliente por nombre o teléfono..."
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Resultados de búsqueda */}
                {clientesEncontrados.length > 0 && (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {clientesEncontrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => {
                          setClienteSeleccionado(cliente);
                          setBusquedaCliente("");
                          setClientesEncontrados([]);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <p className="font-medium text-gray-900">{cliente.nombre}</p>
                        <p className="text-sm text-gray-500">
                          {cliente.telefono}
                          {cliente.empresa && ` • ${cliente.empresa}`}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Botón nuevo cliente */}
                <button
                  onClick={() => setMostrarNuevoCliente(true)}
                  className="flex items-center gap-2 text-[#31A7D4] hover:text-[#2891ba] font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Crear nuevo cliente
                </button>
              </div>
            )}

            {/* Cliente seleccionado */}
            {clienteSeleccionado && (
              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#31A7D4]/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-[#31A7D4]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{clienteSeleccionado.nombre}</p>
                    <p className="text-sm text-gray-500">
                      {clienteSeleccionado.telefono}
                      {clienteSeleccionado.empresa && ` • ${clienteSeleccionado.empresa}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setClienteSeleccionado(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}

            {/* Formulario nuevo cliente */}
            {mostrarNuevoCliente && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-700">Nuevo Cliente</p>
                  <button
                    onClick={() => setMostrarNuevoCliente(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Nombre *"
                    value={nuevoCliente.nombre}
                    onChange={(e) =>
                      setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })
                    }
                    placeholder="Nombre completo"
                  />
                  <Input
                    label="Empresa"
                    value={nuevoCliente.empresa}
                    onChange={(e) =>
                      setNuevoCliente({ ...nuevoCliente, empresa: e.target.value })
                    }
                    placeholder="Nombre de empresa"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Teléfono *"
                    value={nuevoCliente.telefono}
                    onChange={(e) =>
                      setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })
                    }
                    placeholder="10 dígitos"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={nuevoCliente.email}
                    onChange={(e) =>
                      setNuevoCliente({ ...nuevoCliente, email: e.target.value })
                    }
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-6">
          {/* Fotos de Recepción */}
          <Card className="p-6">
            <EvidenciaUpload
              tipo="RECEPCION"
              onFilesChange={setEvidenciasFiles}
              maxFiles={5}
            />
            <p className="text-sm text-gray-500 mt-3 text-center">
              Las fotos se subirán después de crear la orden
            </p>
          </Card>

          {/* Asignación */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[#092139] mb-4">Asignación</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Técnico Asignado
                </label>
                <select
                  value={tecnicoId}
                  onChange={(e) => setTecnicoId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
                >
                  <option value="">Sin asignar</option>
                  {tecnicos.map((tec) => (
                    <option key={tec.id} value={tec.id}>
                      {tec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridad
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRIORIDAD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPrioridad(opt.value)}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                        prioridad === opt.value
                          ? opt.value === "URGENTE"
                            ? "border-red-500 bg-red-50 text-red-700"
                            : opt.value === "ALTA"
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-[#31A7D4] bg-[#31A7D4]/10 text-[#31A7D4]"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Resumen */}
          <Card className="p-6 bg-gray-50">
            <h2 className="text-lg font-semibold text-[#092139] mb-4">Resumen</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo:</span>
                <span className="font-medium text-gray-900">
                  {tipoServicio
                    ? TIPOS_SERVICIO.find((t) => t.value === tipoServicio)?.label
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Equipo:</span>
                <span className="font-medium text-gray-900">
                  {marca && modelo ? `${marca} ${modelo}` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente:</span>
                <span className="font-medium text-gray-900">
                  {clienteSeleccionado?.nombre || nuevoCliente.nombre || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Prioridad:</span>
                <span className="font-medium text-gray-900">
                  {PRIORIDAD_OPTIONS.find((p) => p.value === prioridad)?.label}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={() => router.push("/ordenes")}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} isLoading={loading}>
          Guardar Orden
        </Button>
      </div>
    </div>
  );
}
