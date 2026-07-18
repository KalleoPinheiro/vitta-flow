"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import type { ProcedureDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { formatCurrency } from "@/lib/format";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorAlert, LoadingIndicator } from "@/components/feedback";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none";

export default function ProceduresPage() {
  const { data: procedures, error, refresh } = useApiQuery<ProcedureDto[]>("/api/procedures");
  const [editing, setEditing] = useState<ProcedureDto | "new" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const toggleActive = async (procedure: ProcedureDto) => {
    try {
      await apiFetch(`/api/procedures/${procedure.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !procedure.active }),
      });
      setActionError(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao atualizar procedimento");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Catálogo de procedimentos</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          + Novo procedimento
        </button>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Fonte única de nome, preço e duração — o agendamento preenche a partir daqui e a
        margem por procedimento fica consistente.
      </p>

      {(error || actionError) && <ErrorAlert message={actionError ?? error ?? ""} />}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {!procedures ? (
          <LoadingIndicator />
        ) : procedures.length === 0 ? (
          <EmptyState message="Nenhum procedimento cadastrado — o agendamento continua com texto livre até o catálogo existir." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Procedimento</th>
                <th className="px-4 py-3">Preço padrão</th>
                <th className="px-4 py-3">Duração</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {procedures.map((procedure) => (
                <tr key={procedure.id} className={procedure.active ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-medium">{procedure.name}</td>
                  <td className="px-4 py-3">{formatCurrency(procedure.priceCents)}</td>
                  <td className="px-4 py-3 text-slate-600">{procedure.durationMinutes} min</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={procedure.active ? "confirmed" : "cancelled"}
                      label={procedure.active ? "Ativo" : "Inativo"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(procedure)}
                      className="mr-2 font-medium text-teal-700 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActive(procedure)}
                      className="font-medium text-slate-500 hover:underline"
                    >
                      {procedure.active ? "Desativar" : "Reativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal
          title={editing === "new" ? "Novo procedimento" : "Editar procedimento"}
          onClose={() => setEditing(null)}
        >
          <ProcedureForm
            initial={editing === "new" ? undefined : editing}
            onSaved={() => {
              setEditing(null);
              refresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function ProcedureForm({
  initial,
  onSaved,
}: {
  initial?: ProcedureDto;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? String(initial.priceCents / 100) : "");
  const [duration, setDuration] = useState(initial ? String(initial.durationMinutes) : "60");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        priceCents: Math.round(Number(price) * 100),
        durationMinutes: Number(duration),
      };
      if (initial) {
        await apiFetch(`/api/procedures/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/procedures", { method: "POST", body: JSON.stringify(payload) });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar procedimento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} />}
      <label className="text-sm font-medium">
        Nome *
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Troca de bolsa de colostomia"
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Preço (R$) *
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-sm font-medium">
          Duração (min) *
          <input
            required
            type="number"
            min="1"
            max="480"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="mt-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
