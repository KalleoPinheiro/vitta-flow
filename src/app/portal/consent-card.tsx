"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import { useApiQuery } from "@/lib/use-api-query";
import { formatDateTime } from "@/lib/format";
import { Button, Input } from "@still-void/ui/react";
import { ErrorAlert } from "@/components/feedback";
import { accentButton } from "@/lib/ui";

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
      <p className="rounded-lg border border-success-soft bg-success-soft px-4 py-3 text-sm text-success">
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
    // sv-gap: card-as-element
    <section className="rounded-lg border border-warning bg-warning-soft p-4">
      <h2 className="mb-2 text-sm font-bold text-warning">
        Termo de consentimento pendente
      </h2>
      {error && <ErrorAlert message={error} />}
      <pre className="mb-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded border border-warning-soft bg-sv-surface p-3 text-xs text-ink">
        {data.consentText}
      </pre>
      <Button
        type="button"
        disabled={accepting}
        onClick={() => void accept()}
        className={accentButton}
      >
        {accepting ? "Registrando…" : "Li e aceito o termo"}
      </Button>
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
  const { data: consent } = useApiQuery<ConsentStatusDto>("/api/portal/patient/consent");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Envio exige consentimento vigente (COMP3-01) — avisa antes de escolher o arquivo.
  const consentPending = consent !== null && consent.accepted === false;

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

  if (consentPending) {
    return (
      <p className="mt-2 rounded-lg border border-warning-soft bg-warning-soft px-3 py-2 text-xs text-warning">
        Aceite o termo de consentimento acima para enviar fotos à equipe.
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-bg p-3">
      {error && <ErrorAlert message={error} />}
      {sent && (
        <p className="mb-2 text-xs text-success">
          Foto enviada — a equipe vai avaliar e retorna se for preciso antecipar sua consulta.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Observação (opcional): dor, vazamento, vermelhidão…"
          className="h-8 min-w-0 flex-1 text-xs"
        />
        <label className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium ${accentButton}`}>
          {sending ? "Enviando…" : "Enviar foto"}
          {/* sv-gap: file-input */}
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
