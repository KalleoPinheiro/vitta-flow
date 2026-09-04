import type { NextRequest } from 'next/server';

const DEFAULT_TRUSTED_HOPS = 1;

/**
 * Deriva o IP do cliente da cadeia `x-forwarded-for` respeitando a topologia de
 * proxies confiáveis: o cliente controla o INÍCIO da cadeia (forjável); cada
 * proxy confiável appenda ao FINAL. Com N hops confiáveis, o IP real é o
 * N-ésimo a partir do fim. Fora da cadeia → "unknown" (bucket compartilhado,
 * nunca uma chave forjável).
 */
export function clientIpFromHeader(
  header: string | null,
  trustedHops: number = DEFAULT_TRUSTED_HOPS,
): string {
  const hops =
    Number.isFinite(trustedHops) && trustedHops >= 1
      ? Math.floor(trustedHops)
      : DEFAULT_TRUSTED_HOPS;
  const chain = (header ?? '')
    .split(',')
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0);
  const candidate = chain[chain.length - hops];
  return candidate ?? 'unknown';
}

/** IP do cliente da requisição usando `TRUSTED_PROXY_HOPS` (default 1). */
export function clientIp(request: NextRequest): string {
  return clientIpFromHeader(
    request.headers.get('x-forwarded-for'),
    Number(process.env.TRUSTED_PROXY_HOPS) || DEFAULT_TRUSTED_HOPS,
  );
}
