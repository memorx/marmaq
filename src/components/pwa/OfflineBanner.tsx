"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi, X } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      setDismissed(false);

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Don't show if online and not just reconnected
  if (isOnline && !showReconnected) {
    return null;
  }

  // Don't show if dismissed (only for offline state)
  if (!isOnline && dismissed) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 p-3 transition-all duration-300 ${
        isOnline
          ? "bg-green-500 text-white"
          : "bg-amber-500 text-white"
      }`}
    >
      <div className="max-w-screen-xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <>
              <Wifi className="w-5 h-5" />
              <span className="text-sm font-medium">
                Conexión restaurada. Sincronizando datos...
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5" />
              <div>
                <span className="text-sm font-medium">Sin conexión a internet</span>
                <p className="text-xs opacity-90">
                  Los cambios se guardarán localmente y se sincronizarán al reconectar
                </p>
              </div>
            </>
          )}
        </div>

        {!isOnline && (
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
