"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import type { AppointmentDto, StockMovementDto, SupplyDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorAlert, LoadingIndicator } from "@/components/feedback";
import {
  Button,
  Card,
  Checkbox,
  Input,
  NativeSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@still-void/ui/react";
import { accentButton } from "@/lib/ui";

interface SupplyInsightDto {
  supplyId: string;
  avgDailyOut: number;
  daysToStockout: number | null;
}

interface ExpiringBatchDto {
  batchId: string;
  supplyId: string;
  supplyName: string;
  label: string | null;
  expiresAt: string;
  remaining: number;
  isExpired: boolean;
}

interface SupplyInsightsDto {
  bySupply: SupplyInsightDto[];
  expiringBatches: ExpiringBatchDto[];
}

const STOCKOUT_ALERT_DAYS = 30;

export default function SuppliesPage() {
  const { data: supplies, error, refresh } = useApiQuery<SupplyDto[]>("/api/supplies");
  const { data: insights, refresh: refreshInsights } =
    useApiQuery<SupplyInsightsDto>("/api/supplies/insights");
  const [editing, setEditing] = useState<SupplyDto | "new" | null>(null);
  const [moving, setMoving] = useState<SupplyDto | null>(null);
  const [history, setHistory] = useState<SupplyDto | null>(null);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="sv-display text-2xl font-bold">Materiais e estoque</h1>
        <Button
          type="button"
          onClick={() => setEditing("new")}
          className={accentButton}
        >
          + Novo insumo
        </Button>
      </div>

      {error && <ErrorAlert message={error} />}
      <LowStockBanner supplies={supplies} />
      <ExpiryBanner batches={insights?.expiringBatches ?? []} />

      <SuppliesTable
        supplies={supplies}
        insights={insights?.bySupply ?? []}
        onMove={setMoving}
        onHistory={setHistory}
        onEdit={setEditing}
      />

      <EditSupplyModal
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refresh();
        }}
      />

      {moving && (
        <Modal title={`Movimentar — ${moving.name}`} onClose={() => setMoving(null)}>
          <MovementForm
            supply={moving}
            onSaved={() => {
              setMoving(null);
              refresh();
              refreshInsights();
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

interface EditSupplyModalProps {
  editing: SupplyDto | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditSupplyModal({ editing, onClose, onSaved }: EditSupplyModalProps) {
  if (!editing) {
    return null;
  }
  return (
    <Modal title={editing === "new" ? "Novo insumo" : "Editar insumo"} onClose={onClose}>
      <SupplyForm initial={editing === "new" ? undefined : editing} onSaved={onSaved} />
    </Modal>
  );
}

function LowStockBanner({ supplies }: { supplies: SupplyDto[] | null }) {
  const count = (supplies ?? []).filter((s) => s.active && s.isLowStock).length;
  if (count === 0) {
    return null;
  }
  return (
    <div className="mb-4 rounded-lg border border-warning bg-warning-soft px-4 py-3 text-sm text-warning">
      ⚠ {count} {count === 1 ? "insumo está" : "insumos estão"} com estoque baixo (≤ mínimo).
    </div>
  );
}

function ExpiryBanner({ batches }: { batches: ExpiringBatchDto[] }) {
  if (batches.length === 0) {
    return null;
  }
  const expired = batches.filter((b) => b.isExpired);
  const expiring = batches.filter((b) => !b.isExpired);
  return (
    <div className="mb-4 rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger">
      {expired.length > 0 && (
        <p>
          ⛔ {expired.length} {expired.length === 1 ? "lote vencido" : "lotes vencidos"} com saldo:{" "}
          {expired.map((b) => `${b.supplyName}${b.label ? ` (${b.label})` : ""}`).join(", ")}
        </p>
      )}
      {expiring.length > 0 && (
        <p>
          ⏳ {expiring.length} {expiring.length === 1 ? "lote vence" : "lotes vencem"} em até 30
          dias:{" "}
          {expiring
            .map(
              (b) =>
                `${b.supplyName}${b.label ? ` (${b.label})` : ""} — ${formatDate(b.expiresAt)}`,
            )
            .join(", ")}
        </p>
      )}
    </div>
  );
}

interface SuppliesTableProps {
  supplies: SupplyDto[] | null;
  insights: SupplyInsightDto[];
  onMove: (supply: SupplyDto) => void;
  onHistory: (supply: SupplyDto) => void;
  onEdit: (supply: SupplyDto) => void;
}

function SuppliesTable({ supplies, insights, onMove, onHistory, onEdit }: SuppliesTableProps) {
  const insightBySupply = new Map(insights.map((i) => [i.supplyId, i]));
  return (
    <Card>
      {!supplies ? (
        <LoadingIndicator />
      ) : supplies.length === 0 ? (
        <EmptyState message="Nenhum insumo cadastrado." />
      ) : (
        <Table className="w-full text-left text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-3">Insumo</TableHead>
              <TableHead className="px-4 py-3">Estoque</TableHead>
              <TableHead className="px-4 py-3">Mínimo</TableHead>
              <TableHead className="px-4 py-3">Previsão</TableHead>
              <TableHead className="px-4 py-3">Preço</TableHead>
              <TableHead className="px-4 py-3">Situação</TableHead>
              <TableHead className="px-4 py-3 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supplies.map((supply) => (
              <SupplyRow
                key={supply.id}
                supply={supply}
                insight={insightBySupply.get(supply.id)}
                onMove={() => onMove(supply)}
                onHistory={() => onHistory(supply)}
                onEdit={() => onEdit(supply)}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

interface SupplyRowProps {
  supply: SupplyDto;
  insight?: SupplyInsightDto;
  onMove: () => void;
  onHistory: () => void;
  onEdit: () => void;
}

function StockoutForecast({ insight }: { insight?: SupplyInsightDto }) {
  if (!insight || insight.daysToStockout == null) {
    return <span className="text-ink-3">—</span>;
  }
  const days = insight.daysToStockout;
  const urgent = days <= STOCKOUT_ALERT_DAYS;
  return (
    <span className={urgent ? "font-medium text-danger" : "text-ink-2"}>
      ~{days} {days === 1 ? "dia" : "dias"}
    </span>
  );
}

function SupplyRow({ supply, insight, onMove, onHistory, onEdit }: SupplyRowProps) {
  return (
    <TableRow className={supply.active ? "" : "opacity-50"}>
      <TableCell className="px-4 py-3 font-medium">{supply.name}</TableCell>
      <TableCell className="px-4 py-3">
        {supply.stockQty} {supply.unit}
        {supply.active && supply.isLowStock && (
          <span className="ml-2">
            <StatusBadge status="pending" label="Estoque baixo" />
          </span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3 text-ink-2">{supply.minQty}</TableCell>
      <TableCell className="px-4 py-3">
        <StockoutForecast insight={insight} />
      </TableCell>
      <TableCell className="px-4 py-3">{formatCurrency(supply.priceCents)}</TableCell>
      <TableCell className="px-4 py-3">
        <StatusBadge
          status={supply.active ? "confirmed" : "cancelled"}
          label={supply.active ? "Ativo" : "Inativo"}
        />
      </TableCell>
      <TableCell className="px-4 py-3 text-right text-sm">
        <Button type="button" onClick={onMove}
          variant="link"
          className="h-auto p-0 mr-2 text-success"
        >
          Movimentar
        </Button>
        <Button type="button" onClick={onHistory}
          variant="link"
          className="h-auto p-0 mr-2 text-accent-ink"
        >
          Histórico
        </Button>
        <Button type="button" onClick={onEdit}
          variant="link"
          className="h-auto p-0 text-ink-3"
        >
          Editar
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface SupplyFormValues {
  name: string;
  unit: string;
  minQty: string;
  price: string;
  active: boolean;
}

const toSupplyFormValues = (initial?: SupplyDto): SupplyFormValues => ({
  name: initial?.name ?? "",
  unit: initial?.unit ?? "un",
  minQty: initial ? String(initial.minQty) : "0",
  price: initial ? String(initial.priceCents / 100) : "",
  active: initial?.active ?? true,
});

const saveSupply = async (values: SupplyFormValues, initial?: SupplyDto): Promise<void> => {
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
    return;
  }
  await apiFetch<SupplyDto>("/api/supplies", { method: "POST", body: JSON.stringify(payload) });
};

function SupplyForm({ initial, onSaved }: { initial?: SupplyDto; onSaved: () => void }) {
  const [values, setValues] = useState<SupplyFormValues>(() => toSupplyFormValues(initial));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveSupply(values, initial);
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
        <Input
          required
          value={values.name}
          onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Ex.: Bolsa colostomia 1 peça 60mm"
          className="mt-1"
        />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm font-medium">
          Unidade *
          <Input
            required
            value={values.unit}
            onChange={(e) => setValues((prev) => ({ ...prev, unit: e.target.value }))}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-medium">
          Estoque mínimo *
          <Input
            required
            type="number"
            min="0"
            value={values.minQty}
            onChange={(e) => setValues((prev) => ({ ...prev, minQty: e.target.value }))}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-medium">
          Preço (R$) *
          <Input
            required
            type="number"
            min="0"
            step="0.01"
            value={values.price}
            onChange={(e) => setValues((prev) => ({ ...prev, price: e.target.value }))}
            className="mt-1"
          />
        </label>
      </div>
      {initial && (
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={values.active}
            onChange={(e) => setValues((prev) => ({ ...prev, active: e.target.checked }))}
          />
          Insumo ativo
        </label>
      )}
      <Button
        type="submit"
        disabled={saving}
        className={`mt-1 ${accentButton}`}
      >
        {saving ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}

const todayRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
};

function MovementForm({ supply, onSaved }: { supply: SupplyDto; onSaved: () => void }) {
  const [type, setType] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [batchLabel, setBatchLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [{ from, to }] = useState(todayRange);
  const { data: todayAppointments } = useApiQuery<AppointmentDto[]>(
    `/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch<SupplyDto>(`/api/supplies/${supply.id}/movements`, {
        method: "POST",
        body: JSON.stringify({
          type,
          quantity: Number(quantity),
          reason,
          appointmentId: type === "out" && appointmentId ? appointmentId : null,
          batchLabel: type === "in" && batchLabel ? batchLabel : null,
          expiresAt: type === "in" && expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
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
      <p className="text-sm text-ink-2">
        Estoque atual: <strong>{supply.stockQty} {supply.unit}</strong>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Tipo *
          <NativeSelect
            value={type}
            onChange={(e) => setType(e.target.value as "in" | "out")}
            className="mt-1"
          >
            <option value="in">Entrada (compra/devolução)</option>
            <option value="out">Saída (uso/perda)</option>
          </NativeSelect>
        </label>
        <label className="text-sm font-medium">
          Quantidade *
          <Input
            required
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-1"
          />
        </label>
      </div>
      <label className="text-sm font-medium">
        Motivo *
        <Input
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex.: Uso em atendimento, compra fornecedor X, vencimento…"
          className="mt-1"
        />
      </label>
      {type === "in" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Lote (opcional)
            <Input
              value={batchLabel}
              onChange={(e) => setBatchLabel(e.target.value)}
              placeholder="Ex.: L2026-091"
              className="mt-1"
            />
          </label>
          <label className="text-sm font-medium">
            Validade (opcional)
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1"
            />
          </label>
        </div>
      )}
      {type === "out" && (
        <label className="text-sm font-medium">
          Consulta atendida (custo por atendimento)
          <NativeSelect
            value={appointmentId}
            onChange={(e) => setAppointmentId(e.target.value)}
            className="mt-1"
          >
            <option value="">— sem vínculo —</option>
            {(todayAppointments ?? []).map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {new Date(appointment.startsAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                — {appointment.patientName ?? "Paciente"} ({appointment.procedure})
              </option>
            ))}
          </NativeSelect>
          <span className="mt-1 block text-xs font-normal text-ink-3">
            Vincular a saída à consulta alimenta a margem por procedimento no relatório.
          </span>
        </label>
      )}
      <Button
        type="submit"
        disabled={saving}
        className={`mt-1 ${accentButton}`}
      >
        {saving ? "Registrando…" : "Registrar movimentação"}
      </Button>
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
    <ul className="divide-y divide-border text-sm">
      {movements.map((movement) => (
        <li key={movement.id} className="flex items-center gap-3 py-2">
          <span
            className={`inline-block w-14 rounded-full px-2 py-0.5 text-center text-xs font-medium ${
              movement.type === "in"
                ? "bg-success-soft text-success"
                : "bg-warning-soft text-warning"
            }`}
          >
            {movement.type === "in" ? "+" : "−"}
            {movement.quantity}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate">{movement.reason}</p>
            <p className="text-xs text-ink-3">{formatDateTime(movement.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
