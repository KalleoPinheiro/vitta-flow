"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import type { PatientDto } from "@/lib/dto";
import { formatDate } from "@/lib/format";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { PatientForm, type PatientFormValues } from "./patient-form";

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientDto[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PatientDto | "new" | null>(null);

  const load = useCallback(async (term: string) => {
    try {
      const query = term ? `?search=${encodeURIComponent(term)}` : "";
      setPatients(await apiFetch<PatientDto[]>(`/api/patients${query}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pacientes");
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => void load(search), 300);
    return () => clearTimeout(handle);
  }, [search, load]);

  const handleSubmit = async (values: PatientFormValues) => {
    const payload = {
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      birthDate: values.birthDate ? new Date(values.birthDate).toISOString() : null,
      notes: values.notes || null,
    };
    if (editing === "new") {
      await apiFetch<PatientDto>("/api/patients", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } else if (editing) {
      await apiFetch<PatientDto>(`/api/patients/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    }
    setEditing(null);
    await load(search);
  };

  const toggleActive = async (patient: PatientDto) => {
    try {
      await apiFetch<PatientDto>(`/api/patients/${patient.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !patient.active }),
      });
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar paciente");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pacientes</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          + Novo paciente
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por nome, email ou telefone…"
        className="mb-4 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {!patients ? (
          <LoadingIndicator />
        ) : patients.length === 0 ? (
          <EmptyState message="Nenhum paciente encontrado." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Nascimento</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((patient) => (
                <tr key={patient.id} className={patient.active ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-medium">{patient.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{patient.email}</div>
                    <div className="text-xs text-slate-400">{patient.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {patient.birthDate ? formatDate(patient.birthDate) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={patient.active ? "confirmed" : "cancelled"}
                      label={patient.active ? "Ativo" : "Inativo"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(patient)}
                      className="mr-2 font-medium text-teal-700 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActive(patient)}
                      className="font-medium text-slate-500 hover:underline"
                    >
                      {patient.active ? "Desativar" : "Reativar"}
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
          title={editing === "new" ? "Novo paciente" : "Editar paciente"}
          onClose={() => setEditing(null)}
        >
          <PatientForm
            initial={editing === "new" ? undefined : editing}
            onSubmit={handleSubmit}
          />
        </Modal>
      )}
    </div>
  );
}
