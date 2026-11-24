import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Cache Components queda desactivado: no es compatible todavía con el runtime de
  // Cloudflare Workers (cuelga las respuestas) y la app no lo necesita.
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

// En `npm run dev`, expone los bindings de Cloudflare (D1 local) a Next.js.
initOpenNextCloudflareForDev();
