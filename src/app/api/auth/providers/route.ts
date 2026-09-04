import { ok } from '@/lib/api-response';
import { getAuthConfig } from '@/lib/auth/session';

/**
 * Informa à tela de login quais métodos estão habilitados (rota pública, sem
 * dados sensíveis). Desde a ADR-004 existe um método só — e-mail e senha —,
 * habilitado sempre que o segredo de sessão está configurado.
 */
export async function GET() {
  return ok({ password: getAuthConfig() !== null });
}
