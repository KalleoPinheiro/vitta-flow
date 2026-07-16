"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import type { StockMovementDto, SupplyDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorAlert, LoadingIndicator } from "@/components/feedback";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none";

export default function SuppliesPage() {
  const { data: supplies, error, refresh } = useApiQuery<SupplyDto[]>("/api/supplies");
  const [editing, setEditing] = useState<SupplyDto | "new" | null>(null);
  const [moving, setMoving] = useState<SupplyDto | null>(null);
  const [history, setHistory] = useState<SupplyDto | null>(null);

  const lowStockCount = (supplies ?? []).filter((s) => s.active && s.isLowStock).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Materiais e estoque</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          + Novo insumo
        </button>
      </div>

      {error && <ErrorAlert message={error} />}
      {lowStockCount > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ⚠ {lowStockCount} {lowStockCount === 1 ? "insumo está" : "insumos estão"} com estoque
          baixo (≤ mínimo).
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {!supplies ? (
          <LoadingIndicator />
        ) : supplies.length === 0 ? (
          <EmptyState message="Nenhum insumo cadastrado." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Insumo</th>
                <th className="px-4 py-3">Estoque</th>
                <th className="px-4 py-3">Mínimo</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {supplies.map((supply) => (
                <tr key={supply.id} className={supply.active ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-medium">{supply.name}</td>
                  <td className="px-4 py-3">
                    {supply.stockQty} {supply.unit}
                    {supply.active && supply.isLowStock && (
                      <span className="ml-2">
                        <StatusBadge status="pending" label="Estoque baixo" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{supply.minQty}</td>
                  <td className="px-4 py-3">{formatCurrency(supply.priceCents)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={supply.active ? "confirmed" : "cancelled"}
                      label={supply.active ? "Ativo" : "Inativo"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => setMoving(supply)}
                      className="mr-2 font-medium text-emerald-700 hover:underline"
                    >
                      Movimentar
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistory(supply)}
                      className="mr-2 font-medium text-teal-700 hover:underline"
                    >
                      Histórico
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(supply)}
                      className="font-medium text-slate-500 hover:underline"
                    >
                      Editar
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
          title={editing === "new" ? "Novo insumo" : "Editar insumo"}
          onClose={() => setEditing(null)}
        >
          <SupplyForm
            initial={editing === "new" ? undefined : editing}
            onSaved={() => {
              setEditing(null);
              refresh();
            }}
          />
        </Modal>
      )}

      {moving && (
        <Modal title={`Movimentar — ${moving.name}`} onClose={() => setMoving(null)}>
          <MovementForm
            supply={moving}
            onSaved={() => {
              setMoving(null);
              refresh();
            }}
          />
        </Modal>
      )}

      {history && (
        <Modal title={`Histórico — ${history.name}`} onClose={() => setHistory(null)}>
          <MovementHistory supplyId={history.id} />
        </Modal>
      )}
    </div>
  );
}

function SupplyForm({ initial, onSaved }: { initial?: SupplyDto; onSaved: () => void }) {
  const [values, setValues] = useState({
    name: initial?.name ?? "",
    unit: initial?.unit ?? "un",
    minQty: initial ? String(initial.minQty) : "0",
    price: initial ? String(initial.priceCents / 100) : "",
    active: initial?.active ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: values.name,
        unit: values.unit,
        minQty: Number(values.minQty),
        priceCents: Math.round(Number(values.price) * 100),
      };
      if (initial) {
        await apiFetch<SupplyDto>(`/api/supplies/${initial.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...payload, active: values.active }),
        });
      } else {
        await apiFetch<SupplyDto>("/api/supplies", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar insumo");
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
          value={values.name}
          onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Ex.: Bolsa colostomia 1 peça 60mm"
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm font-medium">
          Unidade *
          <input
            required
            value={values.unit}
            onChange={(e) => setValues((prev) => ({ ...prev, unit: e.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-sm font-medium">
          Estoque mínimo *
          <input
            required
            type="number"
            min="0"
            value={values.minQty}
            onChange={(e) => setValues((prev) => ({ ...prev, minQty: e.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-sm font-medium">
          Preço (R$) *
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={values.price}
            onChange={(e) => setValues((prev) => ({ ...prev, price: e.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
        </label>
      </div>
      {initial && (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={values.active}
            onChange={(e) => setValues((prev) => ({ ...prev, active: e.target.checked }))}
          />
          Insumo ativo
        </label>
      )}
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

function MovementForm({ supply, onSaved }: { supply: SupplyDto; onSaved: () => void }) {
  const [type, setType] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch<SupplyDto>(`/api/supplies/${supply.id}/movements`, {
        method: "POST",
        body: JSON.stringify({ type, quantity: Number(quantity), reason }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao movimentar estoque");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} />}
      <p className="text-sm text-slate-600">
        Estoque atual: <strong>{supply.stockQty} {supply.unit}</strong>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Tipo *
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "in" | "out")}
            className={`mt-1 ${inputClass}`}
          >
            <option value="in">Entrada (compra/devolução)</option>
            <option value="out">Saída (uso/perda)</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Quantidade *
          <input
            required
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </label>
      </div>
      <label className="text-sm font-medium">
        Motivo *
        <input
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex.: Uso em atendimento, compra fornecedor X, vencimento…"
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="mt-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {saving ? "Registrando…" : "Registrar movimentação"}
      </button>
    </form>
  );
}

function MovementHistory({ supplyId }: { supplyId: string }) {
  const { data: movements, error } = useApiQuery<StockMovementDto[]>(
    `/api/supplies/${supplyId}/movements`,
  );

  if (error) return <ErrorAlert message={error} />;
  if (!movements) return <LoadingIndicator />;
  if (movements.length === 0) return <EmptyState message="Nenhuma movimentação registrada." />;

  return (
    <ul className="divide-y divide-slate-100 text-sm">
      {movements.map((movement) => (
        <li key={movement.id} className="flex items-center gap-3 py-2">
          <span
            className={`inline-block w-14 rounded-full px-2 py-0.5 text-center text-xs font-medium ${
              movement.type === "in"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {movement.type === "in" ? "+" : "−"}
            {movement.quantity}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate">{movement.reason}</p>
            <p className="text-xs text-slate-400">{formatDateTime(movement.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
