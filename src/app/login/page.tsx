"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { ErrorAlert } from "@/components/feedback";

export default function LoginPage() {
  const router = useRouter();
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
        body: JSON.stringify({ password }),
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-bold text-teal-700">VittaFlow</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Acesso restrito à equipe da clínica</p>
        {error && <ErrorAlert message={error} />}
        <label className="text-sm font-medium">
          Senha
          <input
            required
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
