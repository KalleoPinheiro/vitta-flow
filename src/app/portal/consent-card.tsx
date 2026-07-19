"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import { useApiQuery } from "@/lib/use-api-query";
import { formatDateTime } from "@/lib/format";
import { ErrorAlert } from "@/components/feedback";

interface ConsentStatusDto {
  consentText: string;
  accepted: boolean;
  acceptedAt: string | null;
}

/** Consentimento digital (O4.1): paciente lê o termo vigente e aceita no portal. */
export function ConsentCard() {
  const { data, refresh } = useApiQuery<ConsentStatusDto>("/api/portal/patient/consent");
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  if (!data) return null;

  if (data.accepted) {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        ✓ Termo de consentimento aceito
        {data.acceptedAt ? ` em ${formatDateTime(data.acceptedAt)}` : ""}.
      </p>
    );
  }

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      await apiFetch("/api/portal/patient/consent", { method: "POST" });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar aceite");
      setAccepting(false);
    }
  };

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h2 className="mb-2 text-sm font-bold text-amber-900">
        Termo de consentimento pendente
      </h2>
      {error && <ErrorAlert message={error} />}
      <pre className="mb-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded border border-amber-200 bg-white p-3 text-xs text-slate-700">
        {data.consentText}
      </pre>
      <button
        type="button"
        disabled={accepting}
        onClick={() => void accept()}
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {accepting ? "Registrando…" : "Li e aceito o termo"}
      </button>
    </section>
  );
}

/** Envio remoto de foto (O4.2) para condição ativa do próprio paciente. */
export function PatientPhotoUpload({
  conditionId,
  onSent,
}: {
  conditionId: string;
  onSent: () => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const upload = async (file: File) => {
    setSending(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("conditionId", conditionId);
      if (note) body.append("note", note);
      const response = await fetch("/api/portal/patient/photos", { method: "POST", body });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Erro ao enviar foto");
      }
      setSent(true);
      setNote("");
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar foto");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      {error && <ErrorAlert message={error} />}
      {sent && (
        <p className="mb-2 text-xs text-emerald-700">
          Foto enviada — a equipe vai avaliar e retorna se for preciso antecipar sua consulta.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Observação (opcional): dor, vazamento, vermelhidão…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
        />
        <label className="cursor-pointer rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800">
          {sending ? "Enviando…" : "Enviar foto"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={sending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}
