"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { useApiQuery } from "@/lib/use-api-query";
import { Button, CardSkeleton, Input } from "@still-void/ui/react";
import { ErrorAlert } from "@/components/feedback";

interface Providers {
  password: boolean;
}

// Allowlist de mensagens de erro (LOG-02): nunca renderiza o valor bruto de
// `?error=` — texto arbitrário da URL dentro da marca é vetor de phishing por
// texto refletido, mesmo sem XSS (React já escapa).
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  session_expired: "Sua sessão expirou. Entre novamente.",
};
const GENERIC_LOGIN_ERROR = "Não foi possível concluir a operação. Tente novamente.";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginCard />
    </Suspense>
  );
}

function LoginCard() {
  const searchParams = useSearchParams();
  const { data: providers } = useApiQuery<Providers>("/api/auth/providers");
  const redirectErrorCode = searchParams.get("error");
  const redirectErrorMessage = redirectErrorCode
    ? (LOGIN_ERROR_MESSAGES[redirectErrorCode] ?? GENERIC_LOGIN_ERROR)
    : null;

  return (
    <main className="flex min-h-[70vh] items-center justify-center">
      {/* sv-gradient-border é a assinatura visual do Still Void — nunca trocada
          por box-shadow, e cards do sistema não têm sombra. */}
      <div className="sv-gradient-border w-full max-w-sm p-8">
        <h1 className="sv-display text-xl font-bold">VittaFlow</h1>
        <p className="mb-6 mt-1 text-sm text-ink-3">Entre com seu e-mail e sua senha</p>
        {redirectErrorMessage && <ErrorAlert message={redirectErrorMessage} />}
        {providers ? (
          providers.password ? (
            <PasswordForm />
          ) : (
            <ErrorAlert message="Autenticação não configurada no servidor." />
          )
        ) : (
          <CardSkeleton />
        )}
      </div>
    </main>
  );
}

function PasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorAlert message={error} />}
      <label className="text-sm font-medium">
        Email
        <Input
          required
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="mt-1"
        />
      </label>
      <label className="mt-3 block text-sm font-medium">
        Senha
        <Input
          required
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1"
        />
      </label>
      <Button type="submit" disabled={submitting} variant="accent" className="mt-4 w-full">
        {submitting ? "Entrando…" : "Entrar"}
      </Button>
      <p className="mt-4 text-center text-sm">
        <Link href="/esqueci-senha" className="text-accent-ink hover:underline">
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}
