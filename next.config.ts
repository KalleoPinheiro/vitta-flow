import type { NextConfig } from "next";

// Content-Security-Policy saiu daqui (issue #76): precisa de um nonce por
// request, gerado em `src/proxy.ts` — headers() estáticos do next.config não
// têm acesso à requisição.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  // O indicador de dev tools (<nextjs-portal>) fica fixo no canto da tela e
  // intercepta cliques em elementos reais ali embaixo (ex.: botão "Sair" da
  // sidebar) — atrapalha o Playwright em modo dev sem existir em produção.
  devIndicators: false,
  // Permite rodar mais de um `next dev` (portas distintas) no mesmo checkout sem
  // colidir no lock de distDir do Next 16 — usado pelo Playwright (playwright.config.ts)
  // para subir um segundo servidor "modo aberto" em paralelo ao principal.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["pg", "@electric-sql/pglite", "googleapis"],
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
