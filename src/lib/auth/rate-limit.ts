interface WindowState {
  count: number;
  resetAtMs: number;
}

/**
 * Rate limiter de janela fixa em memória (por instância).
 * Para múltiplas réplicas, trocar por armazenamento compartilhado (Redis).
 */
export class RateLimiter {
  private readonly windows = new Map<string, WindowState>();

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

  private pruneIfNeeded(nowMs: number): void {
    if (this.windows.size <= 10_000) {
      return;
    }
    for (const [key, state] of this.windows) {
      if (nowMs >= state.resetAtMs) {
        this.windows.delete(key);
      }
    }
  }
}
