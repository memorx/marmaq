"use client";

import { useEffect, useState } from "react";

interface EasterEggOverlayProps {
  show: boolean;
  onDismiss: () => void;
}

// Generate confetti particles
const COLORS = ["#31A7D4", "#D57828", "#092139", "#16A34A", "#31A7D4", "#D57828"];
const PARTICLES = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  color: COLORS[i % COLORS.length],
  left: Math.random() * 100,
  delay: Math.random() * 2,
  duration: 2 + Math.random() * 2,
  size: 6 + Math.random() * 6,
  rotation: Math.random() * 360,
}));

export default function EasterEggOverlay({ show, onDismiss }: EasterEggOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [closeable, setCloseable] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setCloseable(false);
      const timer = setTimeout(() => setCloseable(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setCloseable(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${
        show ? "opacity-100" : "opacity-0"
      }`}
      onClick={closeable ? onDismiss : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="absolute animate-confetti"
            style={{
              left: `${p.left}%`,
              top: "-10px",
              width: `${p.size}px`,
              height: `${p.size * 0.6}px`,
              backgroundColor: p.color,
              borderRadius: "2px",
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              transform: `rotate(${p.rotation}deg)`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div
        className={`relative z-10 text-center transition-transform duration-500 ${
          show ? "scale-100" : "scale-0"
        }`}
      >
        {/* Photo */}
        <div className="mb-6">
          <img
            src="/images/easter-egg.jpg"
            alt="Easter Egg"
            className="w-64 h-64 object-cover rounded-2xl shadow-2xl mx-auto border-4 border-white/20"
          />
        </div>

        {/* Text */}
        <p className="text-white text-xl font-bold mb-2">
          Hecho con ❤️ por Memo para Torrey
        </p>
        <p className="text-white/70 text-sm">
          MARMAQ Servicios — Hecho con el corazón 🤝
        </p>

        {/* Close button */}
        {closeable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="mt-6 px-6 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-full transition-colors animate-fade-in"
          >
            Cerrar
          </button>
        )}
      </div>

    </div>
  );
}
