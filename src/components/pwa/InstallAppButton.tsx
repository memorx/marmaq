"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show banner after 5 seconds if user hasn't dismissed it before
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (!dismissed) {
        setTimeout(() => setShowInstallBanner(true), 5000);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
      }
    } catch (error) {
      console.error("Error installing app:", error);
    }

    setShowInstallBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Install banner (floating at bottom)
  if (showInstallBanner && deferredPrompt) {
    return (
      <div className="fixed bottom-16 left-4 right-4 z-40 animate-in slide-in-from-bottom duration-300">
        <div className="bg-[#092139] rounded-xl shadow-2xl p-4 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-[#31A7D4]/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6 text-[#31A7D4]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold">Instalar MARMAQ</h3>
              <p className="text-white/70 text-sm mt-1">
                Instala la app para acceso rápido y uso sin conexión
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="bg-[#31A7D4] hover:bg-[#2196c3]"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Instalar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  Ahora no
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Small install button for header (only show if prompt is available)
  if (deferredPrompt) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={handleInstall}
        className="text-white/70 hover:text-white hover:bg-white/10"
        title="Instalar app"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline ml-2">Instalar</span>
      </Button>
    );
  }

  return null;
}
