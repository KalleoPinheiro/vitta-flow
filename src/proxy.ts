import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfig, verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { RateLimiter } from "@/lib/auth/rate-limit";

const API_RATE_LIMIT = new RateLimiter(120, 60_000);

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

const isProduction = () => process.env.NODE_ENV === "production";

let warnedAuthDisabled = false;

const clientIp = (request: NextRequest): string =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

function unauthorized(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, data: null, error: "Não autenticado" },
      { status: 401 },
    );
  }
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && !API_RATE_LIMIT.allow(clientIp(request))) {
    return NextResponse.json(
      { success: false, data: null, error: "Limite de requisições excedido, tente novamente em instantes" },
      { status: 429 },
    );
  }

  if (PUBLIC_PATHS.some((path) => pathname === path)) {
    return NextResponse.next();
  }

  const auth = getAuthConfig();
  if (!auth) {
    if (isProduction()) {
      return NextResponse.json(
        { success: false, data: null, error: "Autenticação não configurada (AUTH_PASSWORD/AUTH_SECRET)" },
        { status: 503 },
      );
    }
    if (!warnedAuthDisabled) {
      warnedAuthDisabled = true;
      console.warn(
        "⚠ AUTH_PASSWORD/AUTH_SECRET não configurados — autenticação DESATIVADA (permitido apenas em desenvolvimento)",
      );
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(auth.secret, token)) {
    return unauthorized(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
