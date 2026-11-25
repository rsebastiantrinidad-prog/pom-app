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
