"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import type { PartnerDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorAlert, LoadingIndicator } from "@/components/feedback";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none";

export default function PartnersPage() {
  const { data: partners, error, refresh } = useApiQuery<PartnerDto[]>("/api/partners");
  const [editing, setEditing] = useState<PartnerDto | "new" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const toggleActive = async (partner: PartnerDto) => {
    try {
      await apiFetch<PartnerDto>(`/api/partners/${partner.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: !partner.active }),
      });
      setActionError(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao atualizar parceiro");
    }
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="sv-display text-2xl font-bold">Médicos parceiros</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          + Novo parceiro
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Parceiros indicam pacientes e acompanham a evolução das suas indicações pelo portal,
        entrando com a conta Google do email cadastrado aqui.
      </p>

      {(error ?? actionError) && <ErrorAlert message={(actionError ?? error) as string} />}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {!partners ? (
          <LoadingIndicator />
        ) : partners.length === 0 ? (
          <EmptyState message="Nenhum parceiro cadastrado." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">CRM</th>
                <th className="px-4 py-3">Especialidade</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners.map((partner) => (
                <tr key={partner.id} className={partner.active ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-medium">{partner.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{partner.email}</div>
                    <div className="text-xs text-slate-400">{partner.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{partner.crm ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{partner.specialty ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={partner.active ? "confirmed" : "cancelled"}
                      label={partner.active ? "Ativo" : "Inativo"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(partner)}
                      className="mr-2 font-medium text-teal-700 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActive(partner)}
                      className="font-medium text-slate-500 hover:underline"
                    >
                      {partner.active ? "Desativar" : "Reativar"}
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
          title={editing === "new" ? "Novo parceiro" : "Editar parceiro"}
          onClose={() => setEditing(null)}
        >
          <PartnerForm
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

interface PartnerFormValues {
  fullName: string;
  email: string;
  phone: string;
  crm: string;
  specialty: string;
}

const toFormValues = (initial?: PartnerDto): PartnerFormValues => {
  if (!initial) {
    return { fullName: "", email: "", phone: "", crm: "", specialty: "" };
  }
  return {
    fullName: initial.fullName,
    email: initial.email,
    phone: initial.phone,
    crm: initial.crm ?? "",
    specialty: initial.specialty ?? "",
  };
};

function PartnerForm({ initial, onSaved }: { initial?: PartnerDto; onSaved: () => void }) {
  const [values, setValues] = useState<PartnerFormValues>(() => toFormValues(initial));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof PartnerFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        crm: values.crm || null,
        specialty: values.specialty || null,
      };
      if (initial) {
        await apiFetch<PartnerDto>(`/api/partners/${initial.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch<PartnerDto>("/api/partners", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar parceiro");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} />}
      <label className="text-sm font-medium">
        Nome completo *
        <input required value={values.fullName} onChange={(e) => set("fullName")(e.target.value)} className={`mt-1 ${inputClass}`} />
      </label>
      <label className="text-sm font-medium">
        Email (usado no login com Google) *
        <input required type="email" value={values.email} onChange={(e) => set("email")(e.target.value)} className={`mt-1 ${inputClass}`} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Telefone *
          <input required value={values.phone} onChange={(e) => set("phone")(e.target.value)} className={`mt-1 ${inputClass}`} />
        </label>
        <label className="text-sm font-medium">
          CRM
          <input value={values.crm} onChange={(e) => set("crm")(e.target.value)} placeholder="Ex.: CRM-SP 123456" className={`mt-1 ${inputClass}`} />
        </label>
      </div>
      <label className="text-sm font-medium">
        Especialidade
        <input value={values.specialty} onChange={(e) => set("specialty")(e.target.value)} placeholder="Ex.: Cirurgia vascular" className={`mt-1 ${inputClass}`} />
      </label>
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
