"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import type { ProfessionalDto, UserAccountDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { Button, Input } from "@still-void/ui/react";
import { accentButton, nativeField } from "@/lib/ui";

const WEEKDAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

interface ScheduleConfigDto {
  weekdays: number[];
  startHour: number;
  endHour: number;
  minGapMinutes: number;
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="sv-display text-2xl font-bold">Configurações</h1>
      <ScheduleSection />
      <AccountsSection />
    </div>
  );
}

function ScheduleSection() {
  const { data, error } = useApiQuery<{ config: ScheduleConfigDto; isDefault: boolean }>(
    "/api/settings/schedule",
  );
  const [edits, setEdits] = useState<ScheduleConfigDto | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (error) return <ErrorAlert message={error} />;
  if (!data) return <LoadingIndicator />;

  // Sem edição local, exibe o que veio do servidor — nada de setState em effect.
  const draft = edits ?? data.config;
  const setDraft = (
    update: ScheduleConfigDto | ((prev: ScheduleConfigDto | null) => ScheduleConfigDto | null),
  ) => setEdits(typeof update === "function" ? update(draft) : update);

  const toggleDay = (day: number) =>
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            weekdays: prev.weekdays.includes(day)
              ? prev.weekdays.filter((d) => d !== day)
              : [...prev.weekdays, day].sort((a, b) => a - b),
          }
        : prev,
    );

  const save = async () => {
    setSaveError(null);
    setSaved(false);
    try {
      await apiFetch("/api/settings/schedule", { method: "PUT", body: JSON.stringify(draft) });
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar grade");
    }
  };

  return (
    // sv-gap: card-as-element
    <section className="rounded-lg border border-sv-border bg-sv-surface p-5">
      <h2 className="mb-1 text-lg font-semibold">Grade de horários</h2>
      <p className="mb-4 text-sm text-ink-3">
        Define dias e janela de atendimento usados na validação da agenda.
        {data.isDefault && " (usando padrão — nada salvo ainda)"}
      </p>
      {saveError && <ErrorAlert message={saveError} />}
      {saved && (
        <p className="mb-3 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
          Grade salva — vale imediatamente para novos agendamentos.
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {WEEKDAYS.map((day) => (
          <Button
            key={day.value}
            type="button"
            onClick={() => toggleDay(day.value)}
            size="sm"
            variant={draft.weekdays.includes(day.value) ? "default" : "outline"}
            aria-pressed={draft.weekdays.includes(day.value)}
            className={`rounded-full ${
              draft.weekdays.includes(day.value) ? accentButton : ""
            }`}
          >
            {day.label}
          </Button>
        ))}
      </div>

      <div className="grid max-w-md grid-cols-3 gap-3">
        <label className="text-sm font-medium">
          Abre (h)
          <Input
            type="number"
            min="0"
            max="23"
            value={draft.startHour}
            onChange={(e) => setDraft({ ...draft, startHour: Number(e.target.value) })}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-medium">
          Fecha (h)
          <Input
            type="number"
            min="1"
            max="24"
            value={draft.endHour}
            onChange={(e) => setDraft({ ...draft, endHour: Number(e.target.value) })}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-medium">
          Intervalo (min)
          <Input
            type="number"
            min="15"
            max="120"
            value={draft.minGapMinutes}
            onChange={(e) => setDraft({ ...draft, minGapMinutes: Number(e.target.value) })}
            className="mt-1"
          />
        </label>
      </div>

      <Button
        type="button"
        onClick={() => void save()}
        className={`mt-4 ${accentButton}`}
      >
        Salvar grade
      </Button>
    </section>
  );
}

function AccountsSection() {
  const { data: accounts, error, refresh } = useApiQuery<UserAccountDto[]>("/api/accounts");
  const { data: professionals } = useApiQuery<ProfessionalDto[]>("/api/professionals");
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const professionalName = (id: string | null) =>
    (professionals ?? []).find((p) => p.id === id)?.fullName ?? "—";

  const toggleActive = async (account: UserAccountDto) => {
    try {
      await apiFetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !account.active }),
      });
      setActionError(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao atualizar conta");
    }
  };

  return (
    // sv-gap: card-as-element
    <section className="rounded-lg border border-sv-border bg-sv-surface p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contas de acesso da equipe</h2>
        <Button
          type="button"
          onClick={() => setCreating(true)}
          className={accentButton}
        >
          + Nova conta
        </Button>
      </div>
      <p className="mb-4 text-sm text-ink-3">
        Cada pessoa com sua senha: auditoria identifica quem acessou o prontuário e a
        evolução assume o autor automaticamente.
      </p>
      {(error || actionError) && <ErrorAlert message={actionError ?? error ?? ""} />}

      {!accounts ? (
        <LoadingIndicator />
      ) : accounts.length === 0 ? (
        <EmptyState message="Nenhuma conta individual — todos usam a senha master (auditoria sem identificação pessoal)." />
      ) : (
        // sv-gap: table
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-ink-3">
            <tr>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Profissional vinculado</th>
              <th className="py-2 pr-3">Situação</th>
              <th className="py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accounts.map((account) => (
              <tr key={account.id} className={account.active ? "" : "opacity-50"}>
                <td className="py-2 pr-3 font-medium">{account.email}</td>
                <td className="py-2 pr-3 text-ink-2">
                  {professionalName(account.professionalId)}
                </td>
                <td className="py-2 pr-3">
                  <StatusBadge
                    status={account.active ? "confirmed" : "cancelled"}
                    label={account.active ? "Ativa" : "Desativada"}
                  />
                </td>
                <td className="py-2 text-right">
                  <Button
                    type="button"
                    onClick={() => void toggleActive(account)}
                    variant="link"
                    className="h-auto p-0 text-ink-3"
                  >
                    {account.active ? "Desativar" : "Reativar"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {creating && (
        <Modal title="Nova conta de acesso" onClose={() => setCreating(false)}>
          <AccountForm
            professionals={(professionals ?? []).filter((p) => p.active)}
            onSaved={() => {
              setCreating(false);
              refresh();
            }}
          />
        </Modal>
      )}
    </section>
  );
}

function AccountForm({
  professionals,
  onSaved,
}: {
  professionals: ProfessionalDto[];
  onSaved: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/accounts", {
        method: "POST",
        body: JSON.stringify({ email, password, professionalId: professionalId || null }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} />}
      <label className="text-sm font-medium">
        Email *
        <Input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1"
        />
      </label>
      <label className="text-sm font-medium">
        Senha * (mín. 8 caracteres)
        <Input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1"
        />
      </label>
      <label className="text-sm font-medium">
        Profissional vinculado
        {/* sv-gap: native-select */}
        <select
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          className={`mt-1 ${nativeField}`}
        >
          <option value="">— nenhum (recepção/gestão) —</option>
          {professionals.map((professional) => (
            <option key={professional.id} value={professional.id}>
              {professional.fullName}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="submit"
        disabled={saving}
        className={`mt-1 ${accentButton}`}
      >
        {saving ? "Criando…" : "Criar conta"}
      </Button>
    </form>
  );
}
