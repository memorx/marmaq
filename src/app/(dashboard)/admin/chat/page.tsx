"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Search,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Archive,
  Clock,
  User,
} from "lucide-react";

interface Conversacion {
  id: string;
  titulo: string | null;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
  usuario: { name: string };
  _count: { mensajes: number };
}

interface Mensaje {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

export default function AdminChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroActiva, setFiltroActiva] = useState<"todas" | "activas" | "archivadas">("todas");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loadingMensajes, setLoadingMensajes] = useState(false);

  // Redirect if not SUPER_ADMIN
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  const fetchConversaciones = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ all: "true", limit: "50" });
      if (filtroActiva === "activas") params.set("activa", "true");
      if (filtroActiva === "archivadas") params.set("activa", "false");

      const res = await fetch(`/api/chat/conversaciones?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConversaciones(data.conversaciones || []);
    } catch {
      setConversaciones([]);
    } finally {
      setLoading(false);
    }
  }, [filtroActiva]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "SUPER_ADMIN") {
      fetchConversaciones();
    }
  }, [status, session, fetchConversaciones]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setMensajes([]);
      return;
    }

    setExpandedId(id);
    setLoadingMensajes(true);
    try {
      const res = await fetch(`/api/chat/conversaciones/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMensajes(data.conversacion.mensajes || []);
    } catch {
      setMensajes([]);
    } finally {
      setLoadingMensajes(false);
    }
  };

  const filtered = conversaciones.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.titulo?.toLowerCase().includes(q) ||
      c.usuario.name.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31A7D4]" />
      </div>
    );
  }

  if (session?.user?.role !== "SUPER_ADMIN") return null;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-[#31A7D4]" />
          Chat Maq — Conversaciones
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Historial de conversaciones de todos los usuarios con el asistente Maq
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por usuario o título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(["todas", "activas", "archivadas"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroActiva(f)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors capitalize ${
                filtroActiva === f
                  ? "bg-[#31A7D4] text-white border-[#31A7D4]"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No se encontraron conversaciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((conv) => (
            <div key={conv.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleExpand(conv.id)}
                className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {conv.usuario.name}
                    </span>
                    {!conv.activa && (
                      <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        <Archive className="w-3 h-3" />
                        Archivada
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {conv.titulo || "Sin título"}
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {conv._count.mensajes}
                  </span>
                  <span className="flex items-center gap-1 hidden sm:flex">
                    <Clock className="w-3 h-3" />
                    {formatDate(conv.updatedAt)}
                  </span>
                  {expandedId === conv.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* Expanded messages */}
              {expandedId === conv.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-4 max-h-96 overflow-y-auto">
                  {loadingMensajes ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#31A7D4]" />
                    </div>
                  ) : mensajes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Sin mensajes</p>
                  ) : (
                    <div className="space-y-3">
                      {mensajes.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                              msg.role === "USER"
                                ? "bg-[#31A7D4] text-white"
                                : "bg-white text-gray-900 border border-gray-200"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-xs mt-1 ${msg.role === "USER" ? "text-white/60" : "text-gray-400"}`}>
                              {formatDate(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
