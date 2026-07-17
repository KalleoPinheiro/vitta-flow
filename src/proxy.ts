import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfig, verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { googleOAuthConfigFromEnv } from "@/lib/auth/google-oauth";
import { RateLimiter } from "@/lib/auth/rate-limit";

const API_RATE_LIMIT = new RateLimiter(120, 60_000);

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/providers",
  "/api/auth/google",
  "/api/auth/google/callback",
];

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
  if (!isAuthUsable(auth)) {
    return authNotConfiguredResponse();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(auth.secret, token);
  if (!session) {
    return unauthorized(request);
  }
  if (!isAllowedForRole(pathname, session.role)) {
    return forbidden(request);
  }

  return NextResponse.next();
}

/** Rotas acessíveis a qualquer papel autenticado; todo o resto é exclusivo do admin (equipe). */
const SHARED_PATH_PREFIXES = ["/portal", "/api/portal", "/api/auth/logout"];

function isAllowedForRole(pathname: string, role: string): boolean {
  if (role === "admin") {
    return true;
  }
  return SHARED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function forbidden(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, data: null, error: "Acesso restrito à equipe da clínica" },
      { status: 403 },
    );
  }
  return NextResponse.redirect(new URL("/portal", request.url));
}

type AuthConfig = ReturnType<typeof getAuthConfig>;

function isAuthUsable(auth: AuthConfig): auth is NonNullable<AuthConfig> {
  if (!auth) {
    return false;
  }
  return Boolean(auth.password) || Boolean(googleOAuthConfigFromEnv());
}

function authNotConfiguredResponse(): NextResponse {
  if (isProduction()) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error:
          "Autenticação não configurada: defina AUTH_SECRET e AUTH_PASSWORD (ou login Google via GOOGLE_CLIENT_ID/SECRET + APP_URL + GOOGLE_ALLOWED_EMAILS)",
      },
      { status: 503 },
    );
  }
  if (!warnedAuthDisabled) {
    warnedAuthDisabled = true;
    console.warn(
      "⚠ Autenticação DESATIVADA — configure AUTH_SECRET + senha ou Google (permitido apenas em desenvolvimento)",
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
