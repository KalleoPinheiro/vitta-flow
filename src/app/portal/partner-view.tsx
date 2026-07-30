"use client";

import { useState } from "react";
import { Hero } from "@still-void/ui/react";
import type { PartnerDto, PortalAppointmentDto, ReferredPatientSummaryDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { APPOINTMENT_STATUS_LABELS, formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { ConditionProgress, type ConditionWithAssessmentsDto } from "./condition-progress";

interface ReferredPatientDto {
  patient: ReferredPatientSummaryDto;
  appointments: PortalAppointmentDto[];
  conditions: ConditionWithAssessmentsDto[];
}

interface PartnerPortalDto {
  partner: PartnerDto;
  referredPatients: ReferredPatientDto[];
}

export function PartnerPortalView() {
  const { data, error } = useApiQuery<PartnerPortalDto>("/api/portal/partner");
  const [expanded, setExpanded] = useState<string | null>(null);

  if (error) return <ErrorAlert message={error} />;
  if (!data) return <LoadingIndicator />;

  return (
    <div className="flex flex-col gap-6">
      <Hero
        className="pt-0 pb-2"
        eyebrow="Portal do parceiro"
        title={data.partner.fullName}
        description={`${data.partner.crm ?? ""} ${
          data.partner.specialty ? `· ${data.partner.specialty}` : ""
        } — acompanhamento dos pacientes que você indicou.`}
      />

      {data.referredPatients.length === 0 ? (
        <EmptyState message="Nenhum paciente indicado por você até o momento." />
      ) : (
        <div className="flex flex-col gap-3">
          {data.referredPatients.map(({ patient, appointments, conditions }) => {
            const isOpen = expanded === patient.id;
            return (
              <div key={patient.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : patient.id)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <p className="font-medium">{patient.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {appointments.length} consulta(s) · {conditions.length} condição(ões) em
                      acompanhamento
                    </p>
                  </div>
                  <span className="text-sm font-medium text-teal-700">
                    {isOpen ? "Ocultar" : "Ver evolução"}
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-4 flex flex-col gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Consultas</h3>
                      {appointments.length === 0 ? (
                        <EmptyState message="Nenhuma consulta." />
                      ) : (
                        <ul className="divide-y divide-slate-100 text-sm">
                          {appointments.map((appointment) => (
                            <li key={appointment.id} className="flex items-center gap-3 py-2">
                              <span className="flex-1">
                                {formatDateTime(appointment.startsAt)} — {appointment.procedure}
                              </span>
                              <StatusBadge
                                status={appointment.status}
                                label={
                                  APPOINTMENT_STATUS_LABELS[appointment.status] ??
                                  appointment.status
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Evolução clínica</h3>
                      {conditions.length === 0 ? (
                        <EmptyState message="Nenhuma condição registrada." />
                      ) : (
                        <div className="flex flex-col gap-3">
                          {conditions.map((entry) => (
                            <ConditionProgress key={entry.condition.id} {...entry} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
