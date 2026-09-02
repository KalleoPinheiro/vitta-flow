"use client";

import { useEffect, useState } from "react";
import { useToast } from "@still-void/ui/react/client";
import { apiFetch } from "@/lib/client";
import type { PartnerDto, PatientDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { useCursorPagedQuery } from "@/lib/use-cursor-paged-query";
import { formatDate } from "@/lib/format";
import { Modal } from "@/components/modal";
import { ConfirmAction } from "@/components/confirm-action";
import { StatusBadge } from "@/components/status-badge";
import { ErrorAlert } from "@/components/feedback";
import { LoadMoreButton } from "@/components/load-more-button";
import { PagedList } from "@/components/paged-list";
import { PatientForm, type PatientFormValues } from "./patient-form";
import {
  Button,
  Card,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@still-void/ui/react";

const PAGE_SIZE = 100;

const SEARCH_DEBOUNCE_MS = 300;

interface PatientsTableProps {
  patients: PatientDto[];
  onEdit: (patient: PatientDto) => void;
  onToggleActive: (patient: PatientDto) => void;
}

function PatientsTable({ patients, onEdit, onToggleActive }: PatientsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-left text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="px-4 py-3">Nome</TableHead>
            <TableHead className="px-4 py-3">Contato</TableHead>
            <TableHead className="px-4 py-3">Nascimento</TableHead>
            <TableHead className="px-4 py-3">Situação</TableHead>
            <TableHead className="px-4 py-3 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id} className={patient.active ? "" : "opacity-50"}>
              <TableCell className="px-4 py-3 font-medium">{patient.fullName}</TableCell>
              <TableCell className="px-4 py-3 text-ink-2">
                <div>{patient.email}</div>
                <div className="text-xs text-ink-3">{patient.phone}</div>
              </TableCell>
              <TableCell className="px-4 py-3 text-ink-2">
                {patient.birthDate ? formatDate(patient.birthDate) : "—"}
              </TableCell>
              <TableCell className="px-4 py-3">
                <StatusBadge
                  status={patient.active ? "confirmed" : "cancelled"}
                  label={patient.active ? "Ativo" : "Inativo"}
                />
              </TableCell>
              <TableCell className="px-4 py-3 text-right">
                <a
                  href={`/pacientes/${patient.id}`}
                  className="mr-2 font-medium text-accent-ink hover:underline"
                >
                  Prontuário
                </a>
                <Button
                  type="button"
                  onClick={() => onEdit(patient)}
                  variant="link"
                  className="h-auto p-0 mr-2 text-accent-ink"
                >
                  Editar
                </Button>
                {patient.active ? (
                  <ConfirmAction
                    trigger={
                      <Button type="button" variant="link" className="h-auto p-0 text-ink-3">
                        Desativar
                      </Button>
                    }
                    title="Desativar paciente?"
                    description="O paciente para de aparecer nos fluxos ativos."
                    confirmLabel="Confirmar"
                    variant="danger"
                    onConfirm={() => onToggleActive(patient)}
                  />
                ) : (
                  <Button
                    type="button"
                    onClick={() => onToggleActive(patient)}
                    variant="link"
                    className="h-auto p-0 text-ink-3"
                  >
                    Reativar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function PatientsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PatientDto | "new" | null>(null);
  const { data: partners } = useApiQuery<PartnerDto[]>("/api/partners");

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  const {
    items: patients,
    hasMore,
    error: loadError,
    refresh,
    loadMore,
  } = useCursorPagedQuery<PatientDto>(
    `/api/patients${debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ""}`,
    PAGE_SIZE,
  );
  const error = actionError ?? loadError;

  const handleSubmit = async (values: PatientFormValues) => {
    const payload = {
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      birthDate: values.birthDate ? new Date(values.birthDate).toISOString() : null,
      notes: values.notes || null,
      referredByPartnerId: values.referredByPartnerId || null,
    };
    try {
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
      toast({
        description: editing === "new" ? "Paciente criado" : "Paciente atualizado",
        variant: "success",
      });
    } catch (err) {
      toast({
        description: err instanceof Error ? err.message : "Erro ao salvar paciente",
        variant: "danger",
      });
      throw err;
    }
    setEditing(null);
    refresh();
  };

  const toggleActive = async (patient: PatientDto) => {
    try {
      await apiFetch<PatientDto>(`/api/patients/${patient.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !patient.active }),
      });
      setActionError(null);
      toast({
        description: patient.active ? "Paciente desativado" : "Paciente reativado",
        variant: "success",
      });
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar paciente";
      setActionError(message);
      toast({ description: message, variant: "danger" });
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="sv-display text-2xl font-bold">Pacientes</h1>
        <Button
          type="button"
          onClick={() => setEditing("new")}
          variant="accent"
        >
          + Novo paciente
        </Button>
      </div>

      {error && <ErrorAlert message={error} />}

      <Input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por nome, email ou telefone…"
        className="mb-4 w-full"
      />

      <Card>
        <PagedList
          items={patients}
          emptyMessage="Nenhum paciente encontrado."
          render={(list) => (
            <PatientsTable
              patients={list}
              onEdit={setEditing}
              onToggleActive={(patient) => void toggleActive(patient)}
            />
          )}
        />
      </Card>

      <LoadMoreButton visible={Boolean(patients) && hasMore} onClick={loadMore} />

      {editing && (
        <Modal
          title={editing === "new" ? "Novo paciente" : "Editar paciente"}
          onClose={() => setEditing(null)}
        >
          <PatientForm
            initial={editing === "new" ? undefined : editing}
            partners={partners ?? []}
            onSubmit={handleSubmit}
          />
        </Modal>
      )}
    </div>
  );
}
