"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";
import type { AppointmentDto, PatientDto, ProfessionalDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { Modal } from "@/components/modal";
import { ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { CalendarGrid } from "./calendar-grid";
import { AppointmentForm, type AppointmentFormValues } from "./appointment-form";
import { AppointmentDetail } from "./appointment-detail";

function ProfessionalFilter({
  professionals,
  value,
  onChange,
}: {
  professionals: ProfessionalDto[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (professionals.length === 0) {
    return null;
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none"
    >
      <option value="">Todos os profissionais</option>
      {professionals.map((professional) => (
        <option key={professional.id} value={professional.id}>
          {professional.fullName}
        </option>
      ))}
    </select>
  );
}

const monthLabel = (date: Date): string =>
  date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

export default function AgendaPage() {
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [creatingFor, setCreatingFor] = useState<Date | null>(null);
  const [selected, setSelected] = useState<AppointmentDto | null>(null);
  const [professionalFilter, setProfessionalFilter] = useState("");

  const appointmentsUrl = useMemo(() => {
    const from = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const to = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    const filter = professionalFilter
      ? `&professionalId=${encodeURIComponent(professionalFilter)}`
      : "";
    return `/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}${filter}`;
  }, [monthDate, professionalFilter]);

  const { data: appointments, error, refresh } = useApiQuery<AppointmentDto[]>(appointmentsUrl);
  const { data: patients } = useApiQuery<PatientDto[]>("/api/patients");
  const { data: professionals } = useApiQuery<ProfessionalDto[]>("/api/professionals");

  const changeMonth = (delta: number) =>
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  const handleCreate = async (values: AppointmentFormValues) => {
    const startsAt = new Date(`${values.date}T${values.startTime}:00`);
    const endsAt = new Date(startsAt.getTime() + values.durationMinutes * 60_000);
    await apiFetch<AppointmentDto>("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        patientId: values.patientId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        procedure: values.procedure,
        priceCents: Math.round(Number(values.price) * 100),
        notes: values.notes || null,
        professionalId: values.professionalId || null,
      }),
    });
    setCreatingFor(null);
    refresh();
  };

  const handleAction = async (
    action: "confirm" | "cancel" | "no_show" | "complete",
    followUpInDays?: number | null,
  ) => {
    if (!selected) return;
    await apiFetch<AppointmentDto>(`/api/appointments/${selected.id}`, {
      method: "PATCH",
      body: JSON.stringify(
        action === "complete" ? { action, followUpInDays: followUpInDays ?? null } : { action },
      ),
    });
    setSelected(null);
    refresh();
  };

  const handleReschedule = async (startsAt: Date, endsAt: Date) => {
    if (!selected) return;
    await apiFetch<AppointmentDto>(`/api/appointments/${selected.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        action: "reschedule",
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      }),
    });
    setSelected(null);
    refresh();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <button
          type="button"
          onClick={() => setCreatingFor(new Date())}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          + Nova consulta
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Mês anterior"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
        >
          ←
        </button>
        <span className="min-w-48 text-center text-lg font-semibold capitalize">
          {monthLabel(monthDate)}
        </span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Próximo mês"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
        >
          →
        </button>
        <ProfessionalFilter
          professionals={professionals ?? []}
          value={professionalFilter}
          onChange={setProfessionalFilter}
        />
      </div>

      {!appointments ? (
        <LoadingIndicator />
      ) : (
        <CalendarGrid
          monthDate={monthDate}
          appointments={appointments}
          onDayClick={(day) => setCreatingFor(day)}
          onAppointmentClick={setSelected}
        />
      )}

      {creatingFor && (
        <Modal title="Nova consulta" onClose={() => setCreatingFor(null)}>
          <AppointmentForm
            patients={patients ?? []}
            professionals={(professionals ?? []).filter((p) => p.active)}
            defaultDate={creatingFor}
            onSubmit={handleCreate}
          />
        </Modal>
      )}

      {selected && (
        <Modal title="Detalhes da consulta" onClose={() => setSelected(null)}>
          <AppointmentDetail
            appointment={selected}
            onAction={handleAction}
            onReschedule={handleReschedule}
          />
        </Modal>
      )}
    </div>
  );
}
