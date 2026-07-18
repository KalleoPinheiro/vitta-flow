interface WindowState {
  count: number;
  resetAtMs: number;
}

/**
 * Rate limiter de janela fixa em memória (por instância).
 * Para múltiplas réplicas, trocar por armazenamento compartilhado (Redis).
 */
const PRUNE_SIZE_THRESHOLD = 10_000;

export class RateLimiter {
  private readonly windows = new Map<string, WindowState>();
  private lastPruneMs = 0;

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  /** Retorna true se a requisição está dentro do limite. */
  allow(key: string, nowMs: number = Date.now()): boolean {
    const state = this.windows.get(key);
    if (!state || nowMs >= state.resetAtMs) {
      this.windows.set(key, { count: 1, resetAtMs: nowMs + this.windowMs });
      this.pruneIfNeeded(nowMs);
      return true;
    }
    if (state.count >= this.maxRequests) {
      return false;
    }
    this.windows.set(key, { ...state, count: state.count + 1 });
    return true;
  }

  /** Poda por tamanho ou por tempo — chaves únicas em rajada não seguram memória por horas. */
  private pruneIfNeeded(nowMs: number): void {
    const isOversized = this.windows.size > PRUNE_SIZE_THRESHOLD;
    const isStale = nowMs - this.lastPruneMs >= this.windowMs;
    if (!isOversized && !isStale) {
      return;
    }
    this.lastPruneMs = nowMs;
    for (const [key, state] of this.windows) {
      if (nowMs >= state.resetAtMs) {
        this.windows.delete(key);
      }
    }
  }
}
