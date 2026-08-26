"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import { Button, Card, FileInput, Icon, Input } from "@still-void/ui/react";
import { ErrorAlert } from "@/components/feedback";

export interface ConsentStatusDto {
  consentText: string;
  accepted: boolean;
  acceptedAt: string | null;
}

/**
 * Consentimento digital (O4.1): paciente lê o termo vigente e aceita no portal.
 * O status vem do pai (`PatientPortalView`) — o mesmo dado governa o envio de
 * foto (COMP3-01), então uma cópia só evita telas divergentes após o aceite.
 */
export function ConsentCard({
  status,
  onAccepted,
}: {
  status: ConsentStatusDto | null;
  onAccepted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  if (!status) return null;

  if (status.accepted) {
    return (
      <p className="rounded-lg border border-success-soft bg-success-soft px-4 py-3 text-sm text-success">
        <Icon name="check-circle" /> Termo de consentimento aceito
        {status.acceptedAt ? ` em ${formatDateTime(status.acceptedAt)}` : ""}.
      </p>
    );
  }

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      await apiFetch("/api/portal/patient/consent", { method: "POST" });
      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar aceite");
    } finally {
      // Sai de "Registrando…" mesmo no sucesso: quem confirma o aceite na tela é
      // o status recarregado pelo pai, e essa recarga pode falhar. Se o estado
      // ficasse preso aqui, o botão morria desabilitado e o envio de foto
      // (COMP3-01) seguia bloqueado sem caminho de volta. O POST é idempotente
      // (rota devolve o aceite existente), então tentar de novo é seguro.
      setAccepting(false);
    }
  };

  return (
    <Card as="section" className="border-warning bg-warning-soft p-4">
      <h2 className="mb-2 text-sm font-bold text-warning">
        Termo de consentimento pendente
      </h2>
      {error && <ErrorAlert message={error} />}
      <pre className="mb-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded border border-warning-soft bg-sv-surface p-3 text-xs text-ink">
        {status.consentText}
      </pre>
      <Button
        type="button"
        disabled={accepting}
        onClick={() => void accept()}
        variant="accent"
      >
        {accepting ? "Registrando…" : "Li e aceito o termo"}
      </Button>
    </Card>
  );
}

/** Envio remoto de foto (O4.2) para condição ativa do próprio paciente. */
export function PatientPhotoUpload({
  conditionId,
  consentPending,
  onSent,
}: {
  conditionId: string;
  // Envio exige consentimento vigente (COMP3-01) — avisa antes de escolher o
  // arquivo. Enquanto o status não chegou (null no pai), não bloqueia a tela.
  consentPending: boolean;
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
        {/* Afordância nativa do FileInput, visível — mesmo padrão de
            condition-photos.tsx (T16). spec.md, tabela de Assumptions & Open
            Questions, linha "FileInput muda a aparência dos 2 call sites":
            os dois call sites (este e condition-photos.tsx) perdem o link
            estilizado em favor do controle nativo com botão de seleção
            estilizado — confirmado pelo usuário em 2026-08-25, não é
            mudança restrita a um dos dois. `aria-label` preserva o nome
            acessível que o texto do <label> antigo dava ("Enviar foto"); o
            estado de envio em curso é comunicado só por `disabled={sending}`
            (nenhum texto "Enviando…" equivalente sobrevive — mesma escolha
            já aceita em T16, que também não preservou o texto de estado do
            link antigo). */}
        <FileInput
          accept="image/jpeg,image/png,image/webp"
          aria-label="Enviar foto"
          disabled={sending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
