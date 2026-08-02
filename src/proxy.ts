import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_NOT_CONFIGURED_MESSAGE,
  STAFF_ONLY_MESSAGE,
  UNAUTHENTICATED_MESSAGE,
  isAllowedForRole,
  isPublicPath,
  resolveAuthMode,
} from "@/lib/auth/access-policy";
import { getRequestSession } from "@/lib/auth/request-session";
import { RateLimiter } from "@/lib/auth/rate-limit";

/**
 * Camada 1 de autorização (borda). No Next.js 16 este arquivo se chama `proxy.ts`
 * — é o antigo `middleware.ts`, renomeado pelo framework.
 *
 * Checagem OTIMISTA: barra tráfego não autenticado antes de chegar à rota e
 * redireciona páginas para /login. A autorização efetiva de cada rota de API é
 * feita de novo no handler (`src/lib/auth/require-session.ts`), porque a doc do
 * Next é explícita que o proxy não deve ser a única barreira. Ver
 * `docs/adr/002-autorizacao-em-duas-camadas.md`.
 */

// Configurável via env para permitir relaxar em ambientes de teste E2E (muitas
// chamadas de setup em sequência) sem afetar o padrão de produção.
const API_RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX) || 120;
const API_RATE_LIMIT = new RateLimiter(API_RATE_LIMIT_MAX, 60_000);

const clientIp = (request: NextRequest): string =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

const isApiPath = (pathname: string): boolean => pathname.startsWith("/api/");

function unauthorized(request: NextRequest): NextResponse {
  if (isApiPath(request.nextUrl.pathname)) {
    return NextResponse.json(
      { success: false, data: null, error: UNAUTHENTICATED_MESSAGE },
      { status: 401 },
    );
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

function forbidden(request: NextRequest): NextResponse {
  if (isApiPath(request.nextUrl.pathname)) {
    return NextResponse.json(
      { success: false, data: null, error: STAFF_ONLY_MESSAGE },
      { status: 403 },
    );
  }
  return NextResponse.redirect(new URL("/portal", request.url));
}

function authNotConfiguredResponse(): NextResponse {
  return NextResponse.json(
    { success: false, data: null, error: AUTH_NOT_CONFIGURED_MESSAGE },
    { status: 503 },
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (isApiPath(pathname) && !API_RATE_LIMIT.allow(clientIp(request))) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Limite de requisições excedido, tente novamente em instantes",
      },
      { status: 429 },
    );
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const mode = resolveAuthMode();
  if (mode === "unconfigured") {
    return authNotConfiguredResponse();
  }
  if (mode === "open") {
    return NextResponse.next();
  }

  const session = getRequestSession(request);
  if (!session) {
    return unauthorized(request);
  }
  if (!isAllowedForRole(pathname, session.role)) {
    return forbidden(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
