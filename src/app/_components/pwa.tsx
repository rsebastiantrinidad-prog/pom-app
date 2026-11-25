"use client";

import { useEffect } from "react";

/** Registra el service worker (PER-102) para que la app se pueda instalar. Solo en producción. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
