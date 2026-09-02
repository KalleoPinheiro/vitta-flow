"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import { useToast } from "@still-void/ui/react/client";
import type { ProfessionalDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { Modal } from "@/components/modal";
import { ConfirmAction } from "@/components/confirm-action";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorAlert, LoadingIndicator } from "@/components/feedback";
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

export default function ProfessionalsPage() {
  const { toast } = useToast();
  const { data: professionals, error, refresh } = useApiQuery<ProfessionalDto[]>(
    "/api/professionals",
  );
  const [editing, setEditing] = useState<ProfessionalDto | "new" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const toggleActive = async (professional: ProfessionalDto) => {
    try {
      await apiFetch(`/api/professionals/${professional.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !professional.active }),
      });
      toast({
        description: professional.active ? "Profissional desativado" : "Profissional ativado",
        variant: "success",
      });
      setActionError(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao atualizar profissional");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="sv-display text-2xl font-bold">Profissionais</h1>
        <Button
          type="button"
          onClick={() => setEditing("new")}
          variant="accent"
        >
          + Novo profissional
        </Button>
      </div>

      {(error || actionError) && <ErrorAlert message={actionError ?? error ?? ""} />}

      <Card>
        {!professionals ? (
          <LoadingIndicator />
        ) : professionals.length === 0 ? (
          <EmptyState message="Nenhum profissional cadastrado. Consultas e evoluções podem ser atribuídas após o cadastro." />
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 py-3">Nome</TableHead>
                  <TableHead className="px-4 py-3">Registro</TableHead>
                  <TableHead className="px-4 py-3">Situação</TableHead>
                  <TableHead className="px-4 py-3 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professionals.map((professional) => (
                  <TableRow key={professional.id} className={professional.active ? "" : "opacity-50"}>
                    <TableCell className="px-4 py-3 font-medium">{professional.fullName}</TableCell>
                    <TableCell className="px-4 py-3 text-ink-2">{professional.registry ?? "—"}</TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge
                        status={professional.active ? "confirmed" : "cancelled"}
                        label={professional.active ? "Ativo" : "Inativo"}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        onClick={() => setEditing(professional)}
                        variant="link"
                        className="h-auto p-0 mr-2 text-accent-ink"
                      >
                        Editar
                      </Button>
                      {professional.active ? (
                        <ConfirmAction
                          trigger={
                            <Button type="button" variant="link" className="h-auto p-0 text-ink-3">
                              Desativar
                            </Button>
                          }
                          title="Desativar profissional?"
                          description="O profissional para de estar disponível pra agendar."
                          confirmLabel="Confirmar"
                          variant="danger"
                          onConfirm={() => toggleActive(professional)}
                        />
                      ) : (
                        <Button
                          type="button"
                          onClick={() => void toggleActive(professional)}
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
        )}
      </Card>

      {editing && (
        <Modal
          title={editing === "new" ? "Novo profissional" : "Editar profissional"}
          onClose={() => setEditing(null)}
        >
          <ProfessionalForm
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

function ProfessionalForm({
  initial,
  onSaved,
}: {
  initial?: ProfessionalDto;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [registry, setRegistry] = useState(initial?.registry ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { fullName, registry: registry || null };
      if (initial) {
        await apiFetch(`/api/professionals/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/professionals", { method: "POST", body: JSON.stringify(payload) });
      }
      toast({
        description: "Profissional salvo",
        variant: "success",
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar profissional");
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
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1"
        />
      </label>
      <label className="text-sm font-medium">
        Registro profissional
        <Input
          value={registry}
          onChange={(e) => setRegistry(e.target.value)}
          placeholder="Ex.: COREN-SP 123456"
          className="mt-1"
        />
      </label>
      <Button
        type="submit"
        disabled={saving}
        variant="accent"
        className="mt-1"
      >
        {saving ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
