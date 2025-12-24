"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#092139] to-[#1a4a6e] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <WifiOff className="w-10 h-10 text-gray-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[#092139] mb-2">
          Sin conexión
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          No hay conexión a internet. Verifica tu conexión y vuelve a intentar.
        </p>

        {/* Features available offline */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-[#092139] mb-2 text-sm">
            Mientras tanto puedes:
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Ver órdenes guardadas en caché</li>
            <li>• Tomar fotos para subir después</li>
            <li>• Ver información de clientes recientes</li>
          </ul>
        </div>

        {/* Retry button */}
        <Button onClick={handleRetry} className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar conexión
        </Button>

        {/* Logo */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h2 className="text-lg font-bold text-[#092139]">
            MAR<span className="text-[#31A7D4]">MAQ</span>
          </h2>
          <p className="text-xs text-gray-400">Servicios</p>
        </div>
      </div>
    </div>
  );
}
