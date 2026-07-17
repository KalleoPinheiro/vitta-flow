"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import type { InvoiceDto, PatientDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import {
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  formatDate,
} from "@/lib/format";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { InvoiceForm, type InvoiceFormValues } from "./invoice-form";

const STATUS_FILTERS = [
  { value: "", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "paid", label: "Pagas" },
  { value: "cancelled", label: "Canceladas" },
];

export default function BillingPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<InvoiceDto | null>(null);

  const {
    data: invoices,
    error: loadError,
    refresh,
  } = useApiQuery<InvoiceDto[]>(`/api/invoices${statusFilter ? `?status=${statusFilter}` : ""}`);
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
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          + Nova fatura
        </button>
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
        {!invoices ? (
          <LoadingIndicator />
        ) : invoices.length === 0 ? (
          <EmptyState message="Nenhuma fatura encontrada." />
        ) : (
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
                          onClick={() => setPaying(invoice)}
                          className="mr-2 font-medium text-emerald-700 hover:underline"
                        >
                          Receber
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCancel(invoice)}
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
        )}
      </div>

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
