"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { useApiQuery } from "@/lib/use-api-query";
import { Button, Input } from "@still-void/ui/react";
import { ErrorAlert } from "@/components/feedback";

interface Providers {
  password: boolean;
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
  const redirectError = searchParams.get("error");

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      {/* sv-gradient-border é a assinatura visual do Still Void — nunca trocada
          por box-shadow, e cards do sistema não têm sombra. */}
      <div className="sv-gradient-border w-full max-w-sm p-8">
        <h1 className="sv-display text-xl font-bold">VittaFlow</h1>
        <p className="mb-6 mt-1 text-sm text-ink-3">Entre com seu e-mail e sua senha</p>
        {redirectError && <ErrorAlert message={redirectError} />}
        {providers &&
          (providers.password ? (
            <PasswordForm />
          ) : (
            <ErrorAlert message="Autenticação não configurada no servidor." />
          ))}
      </div>
    </div>
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
