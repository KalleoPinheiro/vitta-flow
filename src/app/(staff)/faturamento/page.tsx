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
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
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
      <tbody className="divide-y divide-slate-100">
        {invoices.map((invoice) => (
          <tr key={invoice.id}>
            <td className="px-4 py-3 text-slate-600">{formatDate(invoice.issuedAt)}</td>
            <td className="px-4 py-3 font-medium">{invoice.patientName}</td>
            <td className="max-w-56 truncate px-4 py-3 text-slate-600">
              {invoice.description}
            </td>
            <td className="px-4 py-3 font-medium">{formatCurrency(invoice.amountCents)}</td>
            <td className="px-4 py-3">
              <StatusBadge
                status={invoice.status}
                label={INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
              />
            </td>
            <td className="px-4 py-3 text-slate-600">
              {invoice.paymentMethod
                ? `${PAYMENT_METHOD_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod}${
                    invoice.paidAt ? ` em ${formatDate(invoice.paidAt)}` : ""
                  }`
                : "—"}
            </td>
            <td className="px-4 py-3 text-right">
              {invoice.status === "pending" && (
                <>
                  <button
                    type="button"
                    onClick={() => onPay(invoice)}
                    className="mr-2 font-medium text-emerald-700 hover:underline"
                  >
                    Receber
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancel(invoice)}
                    className="font-medium text-red-700 hover:underline"
                  >
                    Cancelar
                  </button>
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
        <h1 className="text-2xl font-bold">Faturamento</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSellingPackage(true)}
            className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            Vender pacote
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            + Nova fatura
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-xl">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total recebido (lista atual)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{formatCurrency(totals.paid)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total a receber (lista atual)</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{formatCurrency(totals.pending)}</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              statusFilter === filter.value
                ? "bg-teal-700 text-white"
                : "border border-slate-300 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
      </div>

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
          <p className="mb-4 text-sm text-slate-600">
            {paying.patientName} — {formatCurrency(paying.amountCents)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PAYMENT_METHOD_LABELS).map(([method, label]) => (
              <button
                key={method}
                type="button"
                onClick={() => void handlePay(paying, method)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:border-teal-500 hover:bg-teal-50"
              >
                {label}
              </button>
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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none";
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
        <select required value={patientId} onChange={(e) => setPatientId(e.target.value)} className={`mt-1 ${inputClass}`}>
          <option value="">Selecione…</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.fullName}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Procedimento *
        <select required value={procedureId} onChange={(e) => setProcedureId(e.target.value)} className={`mt-1 ${inputClass}`}>
          <option value="">Selecione…</option>
          {activeProcedures.map((procedure) => (
            <option key={procedure.id} value={procedure.id}>
              {procedure.name}
            </option>
          ))}
        </select>
        {activeProcedures.length === 0 && (
          <span className="mt-1 block text-xs font-normal text-amber-600">
            Cadastre procedimentos no catálogo para vender pacotes.
          </span>
        )}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Sessões *
          <input required type="number" min="1" max="100" value={sessions} onChange={(e) => setSessions(e.target.value)} className={`mt-1 ${inputClass}`} />
        </label>
        <label className="text-sm font-medium">
          Preço total (R$) *
          <input required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={`mt-1 ${inputClass}`} />
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="mt-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {saving ? "Vendendo…" : "Vender pacote"}
      </button>
    </form>
  );
}
