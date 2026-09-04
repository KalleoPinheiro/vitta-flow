import { NextRequest } from 'next/server';
import { adminCookieHeader } from './session';

/**
 * Builders de requisição compartilhados pelos testes de rota. As rotas exigem
 * sessão válida (`src/lib/auth/require-session.ts`), então autenticam como
 * equipe (papel admin) por padrão — passe `headers` para sobrescrever (ex.:
 * sessão de paciente/parceiro, ou nenhuma sessão para exercitar um 401 real).
 */
export const jsonRequest = (
  url: string,
  method: string,
  body?: unknown,
  headers?: Record<string, string>,
): NextRequest =>
  new NextRequest(`http://localhost${url}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...adminCookieHeader(),
      ...headers,
    },
  });

/** Upload multipart autenticado como equipe — usado pelos endpoints de foto. */
export const multipartRequest = (
  url: string,
  formData: FormData,
  headers?: Record<string, string>,
): NextRequest =>
  new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    body: formData,
    headers: { ...adminCookieHeader(), ...headers },
  });
