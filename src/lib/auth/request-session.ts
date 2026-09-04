import type { NextRequest } from 'next/server';
import {
  getAuthConfig,
  SESSION_COOKIE,
  type Session,
  verifySessionToken,
} from './session';

/** Sessão da requisição (o proxy já barrou não autenticados; aqui é defesa em profundidade). */
export function getRequestSession(request: NextRequest): Session | null {
  const auth = getAuthConfig();
  if (!auth) {
    return null;
  }
  return verifySessionToken(
    auth.secret,
    request.cookies.get(SESSION_COOKIE)?.value,
  );
}
