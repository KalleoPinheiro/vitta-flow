"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { useApiQuery } from "@/lib/use-api-query";
import { Button, Input } from "@still-void/ui/react";
import { accentButton } from "@/lib/ui";
import { ErrorAlert } from "@/components/feedback";

interface Providers {
  password: boolean;
  google: boolean;
}

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
  const oauthError = searchParams.get("error");

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      {/* sv-gradient-border é a assinatura visual do Still Void — nunca trocada
          por box-shadow, e cards do sistema não têm sombra. */}
      <div className="sv-gradient-border w-full max-w-sm p-8">
        <h1 className="sv-display text-xl font-bold">VittaFlow</h1>
        <p className="mb-6 mt-1 text-sm text-ink-3">
          Acesso restrito à equipe da clínica
        </p>
        {oauthError && <ErrorAlert message={oauthError} />}
        {providers && <ProviderButtons providers={providers} />}
      </div>
    </div>
  );
}

function ProviderButtons({ providers }: { providers: Providers }) {
  if (!providers.password && !providers.google) {
    return <ErrorAlert message="Nenhum método de login configurado no servidor." />;
  }
  return (
    <>
      {providers.google && <GoogleLoginButton />}
      {providers.google && providers.password && (
        // sv-gap: separator
        <div className="my-4 flex items-center gap-3 text-xs text-ink-3">
          <span className="h-px flex-1 bg-surface-2" />
          ou
          <span className="h-px flex-1 bg-surface-2" />
        </div>
      )}
      {providers.password && <PasswordForm />}
    </>
  );
}

function GoogleLoginButton() {
  return (
    <>
      <GoogleAnchor />
      <p className="mt-2 text-center text-xs text-ink-3">
        Equipe:{" "}
        <a href="/api/auth/google?connect=calendar" className="text-accent-ink hover:underline">
          entrar conectando o Google Agenda
        </a>
      </p>
    </>
  );
}

function GoogleAnchor() {
  return (
    <a
      href="/api/auth/google"
      className="flex w-full items-center justify-center gap-2 rounded-md border border-sv-border bg-sv-surface px-4 py-2 text-sm font-medium text-sv-text hover:bg-sv-surface-2"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
      Entrar com Google
    </a>
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
        body: JSON.stringify(email ? { email, password } : { password }),
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
        Email (contas individuais — vazio para senha da clínica)
        <Input
          type="email"
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1"
        />
      </label>
      <Button type="submit" disabled={submitting} className={`mt-4 w-full ${accentButton}`}>
        {submitting ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
