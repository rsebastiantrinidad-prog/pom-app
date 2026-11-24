"use client";

// Alarma suave (PER-85). Los navegadores móviles solo dejan reproducir sonido
// después de una interacción del usuario: `unlockAudio()` se llama al tocar
// "Iniciar" (o cualquier toque en la pantalla) y deja el audio habilitado.

let ctx: AudioContext | null = null;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

/** Tres notas cortas y suaves (campanita), más vibración donde se pueda. */
export function playAlarm() {
  navigator.vibrate?.([200, 120, 200, 120, 400]);
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.05;
  [659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = t0 + i * 0.35;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.25, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 1.2);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start);
    osc.stop(start + 1.3);
  });
}
