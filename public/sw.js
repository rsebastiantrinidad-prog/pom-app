// Service worker de PoM (PER-102). No guarda páginas en caché: los datos siempre
// vienen del servidor (y de Cloudflare Access). Solo muestra un aviso si no hay red.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const OFFLINE_HTML = `<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>PoM · sin conexión</title>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center;background:#fff;color:#000">
<div><h1 style="margin:0 0 8px">Sin conexión</h1>
<p style="color:#666">PoM necesita internet para guardar tus bloques. Probá de nuevo en un momento.</p>
<button onclick="location.reload()" style="margin-top:12px;padding:12px 20px;border:0;border-radius:6px 24px;background:#661EDA;color:#fff;font-weight:700">Reintentar</button></div>`;

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
});

// Aviso de fin de bloque (PER-106). El push llega sin contenido: el texto es fijo.
// En Android, las notificaciones se replican en el reloj (Galaxy Watch / Wear OS).
self.addEventListener("push", (event) => {
  event.waitUntil(
    self.registration.showNotification("¡Bloque terminado!", {
      body: "Terminó tu PoM. Tomá tu descanso y valorá cómo te fue.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "pom-fin",
      renotify: true,
      requireInteraction: true,
      vibrate: [400, 150, 400, 150, 700],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => new URL(c.url).origin === self.location.origin);
      return open ? open.focus().then((c) => c.navigate("/")) : self.clients.openWindow("/");
    }),
  );
});
