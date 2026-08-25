"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import type { InvoiceDto, PatientDto, ProcedureDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { usePagedQuery } from "@/lib/use-paged-query";
import {
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  formatDate,
} from "@/lib/format";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { ErrorAlert } from "@/components/feedback";
import { LoadMoreButton } from "@/components/load-more-button";
import { PagedList } from "@/components/paged-list";
import { InvoiceForm, type InvoiceFormValues } from "./invoice-form";
import { Button, Card, Input, NativeSelect } from "@still-void/ui/react";
import { accentButton } from "@/lib/ui";

const STATUS_FILTERS = [
  { value: "", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "paid", label: "Pagas" },
  { value: "cancelled", label: "Canceladas" },
];

const PAGE_SIZE = 100;

interface InvoicesTableProps {
  invoices: InvoiceDto[];
  onPay: (invoice: InvoiceDto) => void;
  onCancel: (invoice: InvoiceDto) => void;
}

function InvoicesTable({ invoices, onPay, onCancel }: InvoicesTableProps) {
  return (
    // sv-gap: table
    <table className="w-full text-left text-sm">
      <thead className="border-b border-border bg-bg text-xs uppercase text-ink-3">
        <tr>
          <th className="px-4 py-3">Emissão</th>
          <th className="px-4 py-3">Paciente</th>
          <th className="px-4 py-3">Descrição</th>
          <th className="px-4 py-3">Valor</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Pagamento</th>
          <th className="px-4 py-3 text-right">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {invoices.map((invoice) => (
          <tr key={invoice.id}>
            <td className="px-4 py-3 text-ink-2">{formatDate(invoice.issuedAt)}</td>
            <td className="px-4 py-3 font-medium">{invoice.patientName}</td>
            <td className="max-w-56 truncate px-4 py-3 text-ink-2">
              {invoice.description}
            </td>
            <td className="px-4 py-3 font-medium">{formatCurrency(invoice.amountCents)}</td>
            <td className="px-4 py-3">
              <StatusBadge
                status={invoice.status}
                label={INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
              />
            </td>
            <td className="px-4 py-3 text-ink-2">
              {invoice.paymentMethod
                ? `${PAYMENT_METHOD_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod}${
                    invoice.paidAt ? ` em ${formatDate(invoice.paidAt)}` : ""
                  }`
                : "—"}
            </td>
            <td className="px-4 py-3 text-right">
              {invoice.status === "pending" && (
                <>
                  <Button
                    type="button"
                    onClick={() => onPay(invoice)}
                    variant="link"
                    className="h-auto p-0 mr-2 text-success"
                  >
                    Receber
                  </Button>
                  <Button
                    type="button"
                    onClick={() => onCancel(invoice)}
                    variant="link"
                    className="h-auto p-0 text-danger"
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function BillingPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [sellingPackage, setSellingPackage] = useState(false);
  const [paying, setPaying] = useState<InvoiceDto | null>(null);

  const {
    items: invoices,
    hasMore,
    error: loadError,
    refresh,
    loadMore,
  } = usePagedQuery<InvoiceDto>(
    `/api/invoices${statusFilter ? `?status=${statusFilter}` : ""}`,
    PAGE_SIZE,
  );

  const { data: patients } = useApiQuery<PatientDto[]>("/api/patients");
  const error = actionError ?? loadError;

  const handleCreate = async (values: InvoiceFormValues) => {
    await apiFetch<InvoiceDto>("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        patientId: values.patientId,
        description: values.description,
        amountCents: Math.round(Number(values.amount) * 100),
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      }),
    });
    setCreating(false);
    refresh();
  };

  const handlePay = async (invoice: InvoiceDto, method: string) => {
    try {
      await apiFetch<InvoiceDto>(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "pay", method }),
      });
      setPaying(null);
      setActionError(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao registrar pagamento");
    }
  };

  const handleCancel = async (invoice: InvoiceDto) => {
    try {
      await apiFetch<InvoiceDto>(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "cancel" }),
      });
      setActionError(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao cancelar fatura");
    }
  };

  const totals = (invoices ?? []).reduce(
    (acc, invoice) => ({
      paid: acc.paid + (invoice.status === "paid" ? invoice.amountCents : 0),
      pending: acc.pending + (invoice.status === "pending" ? invoice.amountCents : 0),
    }),
    { paid: 0, pending: 0 },
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="sv-display text-2xl font-bold">Faturamento</h1>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => setSellingPackage(true)}
            variant="outline"
            className="text-accent-ink hover:bg-accent-soft"
          >
            Vender pacote
          </Button>
          <Button
            type="button"
            onClick={() => setCreating(true)}
            className={accentButton}
          >
            + Nova fatura
          </Button>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-xl">
        <Card className="p-5">
          <p className="text-sm text-ink-3">Total recebido (lista atual)</p>
          <p className="mt-1 text-2xl font-bold text-success">{formatCurrency(totals.paid)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-ink-3">Total a receber (lista atual)</p>
          <p className="mt-1 text-2xl font-bold text-warning">{formatCurrency(totals.pending)}</p>
        </Card>
      </div>

      <div className="mb-4 flex gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              statusFilter === filter.value
                ? "bg-accent-ink text-white"
                : "border border-border-strong text-ink-2 hover:bg-surface-2"
            }`}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <PagedList
          items={invoices}
          emptyMessage="Nenhuma fatura encontrada."
          render={(list) => (
            <InvoicesTable
              invoices={list}
              onPay={setPaying}
              onCancel={(invoice) => void handleCancel(invoice)}
            />
          )}
        />
      </Card>

      <LoadMoreButton visible={Boolean(invoices) && hasMore} onClick={loadMore} />

      <PackageSaleModal
        open={sellingPackage}
        patients={(patients ?? []).filter((p) => p.active)}
        onClose={() => setSellingPackage(false)}
        onSaved={() => {
          setSellingPackage(false);
          refresh();
        }}
      />

      {creating && (
        <Modal title="Nova fatura" onClose={() => setCreating(false)}>
          <InvoiceForm patients={(patients ?? []).filter((p) => p.active)} onSubmit={handleCreate} />
        </Modal>
      )}

      {paying && (
        <Modal title="Registrar pagamento" onClose={() => setPaying(null)}>
          <p className="mb-4 text-sm text-ink-2">
            {paying.patientName} — {formatCurrency(paying.amountCents)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PAYMENT_METHOD_LABELS).map(([method, label]) => (
              <Button
                key={method}
                type="button"
                onClick={() => void handlePay(paying, method)}
                variant="outline"
                className="hover:bg-accent-soft"
              >
                {label}
              </Button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function PackageSaleModal({
  open,
  patients,
  onClose,
  onSaved,
}: {
  open: boolean;
  patients: PatientDto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!open) {
    return null;
  }
  return (
    <Modal title="Vender pacote de sessões" onClose={onClose}>
      <PackageForm patients={patients} onSaved={onSaved} />
    </Modal>
  );
}

/** Venda de pacote (O3.3): fatura única; sessões consomem saldo na conclusão. */
function PackageForm({
  patients,
  onSaved,
}: {
  patients: PatientDto[];
  onSaved: () => void;
}) {
  const { data: procedures } = useApiQuery<ProcedureDto[]>("/api/procedures");
  const [patientId, setPatientId] = useState("");
  const [procedureId, setProcedureId] = useState("");
  const [sessions, setSessions] = useState("10");
  const [price, setPrice] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const activeProcedures = (procedures ?? []).filter((p) => p.active);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/packages", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          procedureId,
          totalSessions: Number(sessions),
          priceCents: Math.round(Number(price) * 100),
          // Validade opcional: fim do dia escolhido no fuso local da clínica —
          // forçar UTC encurtaria o último dia em fusos a oeste (UTC-3: 20:59).
          expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao vender pacote");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} />}
      <label className="text-sm font-medium">
        Paciente *
        <NativeSelect required value={patientId} onChange={(e) => setPatientId(e.target.value)} className="mt-1">
          <option value="">Selecione…</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.fullName}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="text-sm font-medium">
        Procedimento *
        <NativeSelect required value={procedureId} onChange={(e) => setProcedureId(e.target.value)} className="mt-1">
          <option value="">Selecione…</option>
          {activeProcedures.map((procedure) => (
            <option key={procedure.id} value={procedure.id}>
              {procedure.name}
            </option>
          ))}
        </NativeSelect>
        {activeProcedures.length === 0 && (
          <span className="mt-1 block text-xs font-normal text-warning">
            Cadastre procedimentos no catálogo para vender pacotes.
          </span>
        )}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Sessões *
          <Input required type="number" min="1" max="100" value={sessions} onChange={(e) => setSessions(e.target.value)} className="mt-1" />
        </label>
        <label className="text-sm font-medium">
          Preço total (R$) *
          <Input required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1" />
        </label>
      </div>
      <label className="text-sm font-medium">
        Validade
        <Input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="mt-1"
        />
        <span className="mt-1 block text-xs font-normal text-ink-3">
          Opcional — sem data, o pacote não expira.
        </span>
      </label>
      <Button
        type="submit"
        disabled={saving}
        className={`mt-1 ${accentButton}`}
      >
        {saving ? "Vendendo…" : "Vender pacote"}
      </Button>
    </form>
  );
}
