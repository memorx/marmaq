import type {
  Orden,
  Cliente,
  User,
  Evidencia,
  MaterialUsado,
  Material,
  HistorialEstado,
  TipoServicio,
  EstadoOrden,
  Prioridad,
  CondicionEquipo,
} from "@prisma/client";

// ============ CONFIGURACIÓN DEL SEMÁFORO ============
export const SEMAFORO_CONFIG = {
  ROJO: {
    color: "#DC2626",
    label: "Crítico",
    description: "Listo para entrega > 5 días sin recoger",
  },
  NARANJA: {
    color: "#EA580C",
    label: "Esperando refacciones",
    description: "En espera de refacciones",
  },
  AMARILLO: {
    color: "#CA8A04",
    label: "Atención",
    description: "En diagnóstico o cotización > 72 horas",
  },
  AZUL: {
    color: "#2563EB",
    label: "Nuevo",
    description: "Recibido hoy",
  },
  VERDE: {
    color: "#16A34A",
    label: "Normal",
    description: "En proceso normal",
  },
} as const;

export type SemaforoColor = keyof typeof SEMAFORO_CONFIG;

// ============ LABELS PARA UI ============
export const STATUS_LABELS: Record<EstadoOrden, string> = {
  RECIBIDO: "Recibido",
  EN_DIAGNOSTICO: "En Diagnóstico",
  ESPERA_REFACCIONES: "Espera Refacciones",
  COTIZACION_PENDIENTE: "Cotización Pendiente",
  EN_REPARACION: "En Reparación",
  REPARADO: "Reparado",
  LISTO_ENTREGA: "Listo para Entrega",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export const SERVICE_TYPE_LABELS: Record<TipoServicio, string> = {
  GARANTIA: "Garantía",
  CENTRO_SERVICIO: "Centro Servicio",
  POR_COBRAR: "Por Cobrar",
  REPARE: "REPARE",
};

export const PRIORIDAD_LABELS: Record<Prioridad, string> = {
  BAJA: "Baja",
  NORMAL: "Normal",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

export const CONDICION_LABELS: Record<CondicionEquipo, string> = {
  BUENA: "Buena",
  REGULAR: "Regular",
  MALA: "Mala",
};

// ============ TIPOS DE ORDEN CON RELACIONES ============
export type OrdenConRelaciones = Orden & {
  cliente: Cliente;
  tecnico: User | null;
  creadoPor: User;
  evidencias: Evidencia[];
  materialesUsados: (MaterialUsado & {
    material: Material;
  })[];
  historial: (HistorialEstado & {
    usuario: User;
  })[];
};

export type OrdenListItem = Orden & {
  cliente: Pick<Cliente, "id" | "nombre" | "empresa" | "telefono">;
  tecnico: Pick<User, "id" | "name"> | null;
  _count: {
    evidencias: number;
  };
  semaforo: SemaforoColor;
};

// ============ TIPOS PARA API ============
export interface OrdenesListResponse {
  ordenes: OrdenListItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface OrdenesFilters {
  tipoServicio?: TipoServicio;
  estado?: EstadoOrden;
  prioridad?: Prioridad;
  tecnicoId?: string;
  clienteId?: string;
  search?: string;
  semaforo?: SemaforoColor;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateOrdenInput {
  tipoServicio: TipoServicio;
  prioridad?: Prioridad;
  // Cliente (puede ser ID existente o datos para crear nuevo)
  clienteId?: string;
  clienteNuevo?: {
    nombre: string;
    empresa?: string;
    telefono: string;
    email?: string;
    direccion?: string;
    ciudad?: string;
    esDistribuidor?: boolean;
    codigoDistribuidor?: string;
  };
  // Equipo
  marcaEquipo: string;
  modeloEquipo: string;
  serieEquipo?: string;
  condicionEquipo?: CondicionEquipo;
  accesorios?: Record<string, boolean>;
  // Problema
  fallaReportada: string;
  // Garantía
  numeroFactura?: string;
  fechaFactura?: string;
  // REPARE
  numeroRepare?: string;
  coordenadasGPS?: string;
  // Fechas
  fechaPromesa?: string;
  // Asignación
  tecnicoId?: string;
}

export interface UpdateOrdenInput {
  estado?: EstadoOrden;
  prioridad?: Prioridad;
  tecnicoId?: string | null;
  diagnostico?: string;
  notasTecnico?: string;
  cotizacion?: number;
  cotizacionAprobada?: boolean;
  fechaPromesa?: string;
  // Datos del equipo (editables)
  marcaEquipo?: string;
  modeloEquipo?: string;
  serieEquipo?: string;
  condicionEquipo?: CondicionEquipo;
  accesorios?: Record<string, boolean>;
  fallaReportada?: string;
  // Garantía
  numeroFactura?: string;
  fechaFactura?: string;
  // REPARE
  numeroRepare?: string;
  coordenadasGPS?: string;
}

// ============ HELPER PARA CALCULAR SEMÁFORO ============
export function calcularSemaforo(orden: Orden): SemaforoColor {
  const ahora = new Date();
  const fechaRecepcion = new Date(orden.fechaRecepcion);

  // Calcular horas desde recepción
  const horasDesdeRecepcion = (ahora.getTime() - fechaRecepcion.getTime()) / (1000 * 60 * 60);

  // ROJO: Listo para entrega y más de 5 días sin recoger
  if (orden.estado === "LISTO_ENTREGA") {
    const fechaReparacion = orden.fechaReparacion ? new Date(orden.fechaReparacion) : fechaRecepcion;
    const diasSinRecoger = (ahora.getTime() - fechaReparacion.getTime()) / (1000 * 60 * 60 * 24);
    if (diasSinRecoger > 5) {
      return "ROJO";
    }
  }

  // NARANJA: En espera de refacciones
  if (orden.estado === "ESPERA_REFACCIONES") {
    return "NARANJA";
  }

  // AMARILLO: En diagnóstico o cotización pendiente por más de 72 horas
  if (
    (orden.estado === "EN_DIAGNOSTICO" || orden.estado === "COTIZACION_PENDIENTE") &&
    horasDesdeRecepcion > 72
  ) {
    return "AMARILLO";
  }

  // AZUL: Recibido hoy
  if (orden.estado === "RECIBIDO") {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaRecepcionDia = new Date(fechaRecepcion);
    fechaRecepcionDia.setHours(0, 0, 0, 0);

    if (fechaRecepcionDia.getTime() === hoy.getTime()) {
      return "AZUL";
    }
  }

  // VERDE: Todo lo demás
  return "VERDE";
}

// Re-exportar tipos de Prisma para conveniencia
export type {
  Orden,
  Cliente,
  User,
  Evidencia,
  MaterialUsado,
  Material,
  HistorialEstado,
  TipoServicio,
  EstadoOrden,
  Prioridad,
  CondicionEquipo,
};
