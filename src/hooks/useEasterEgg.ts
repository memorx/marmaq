import { useState, useRef, useCallback } from "react";

type EasterEggLevel = 0 | 1 | 2 | 3;

// Web Audio API sounds
function playOrbPickup() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // ignore
  }
}

function playLevelUp() {
  try {
    const ctx = new AudioContext();
    const freqs = [600, 900, 1200];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.1);
      osc.start(start);
      osc.stop(start + 0.12);
    });
  } catch {
    // ignore
  }
}

function playAchievement() {
  try {
    const ctx = new AudioContext();
    // C major chord: C4(261), E4(329), G4(392)
    const freqs = [261.63, 329.63, 392.0];
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    });
  } catch {
    // ignore
  }
}

interface UseEasterEggReturn {
  handleClick: () => void;
  level: EasterEggLevel;
  showOverlay: boolean;
  dismissOverlay: () => void;
  shake: boolean;
  toast: string | null;
}

export function useEasterEgg(): UseEasterEggReturn {
  const [level, setLevel] = useState<EasterEggLevel>(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const clickCount = useRef(0);
  const lastClick = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const handleClick = useCallback(() => {
    const now = Date.now();

    // Reset if more than 2 seconds between clicks
    if (now - lastClick.current > 2000) {
      clickCount.current = 0;
    }
    lastClick.current = now;
    clickCount.current += 1;

    const count = clickCount.current;

    if (count === 30 && level < 1) {
      setLevel(1);
      playOrbPickup();
      showToast("🟡 ¿Algo se mueve por aquí...?");
    } else if (count === 60 && level < 2) {
      setLevel(2);
      playLevelUp();
      showToast("🟠 ¡Easter egg encontrado! ¿Pero hay más...?");
      setShake(true);
      setTimeout(() => setShake(false), 1000);
    } else if (count === 100) {
      setLevel(3);
      playAchievement();
      setShowOverlay(true);
      clickCount.current = 0;

      // Auto-dismiss after 8 seconds
      setTimeout(() => setShowOverlay(false), 8000);
    }
  }, [level, showToast]);

  const dismissOverlay = useCallback(() => {
    setShowOverlay(false);
  }, []);

  return { handleClick, level, showOverlay, dismissOverlay, shake, toast };
}
