"use client";

import { useApiQuery } from "@/lib/use-api-query";
import { formatCurrency, formatDate } from "@/lib/format";
import { LoadingIndicator } from "@/components/feedback";

export interface PackageDto {
  id: string;
  procedureId: string;
  procedureName?: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  priceCents: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

const isExpired = (pkg: PackageDto): boolean =>
  pkg.expiresAt !== null && new Date(pkg.expiresAt).getTime() <= Date.now();

/** Pacotes pré-pagos do paciente: saldo e validade à vista da equipe (COMP3-10). */
export function PackagesSection({ patientId }: { patientId: string }) {
  const { data: packages } = useApiQuery<PackageDto[]>(`/api/packages?patientId=${patientId}`);

  if (!packages) return <LoadingIndicator />;
  if (packages.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum pacote de sessões para este paciente.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {packages.map((pkg) => (
        <li
          key={pkg.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 p-3 text-sm"
        >
          <span className="font-medium">{pkg.procedureName ?? "Procedimento"}</span>
          <span className="text-slate-600">
            {pkg.remainingSessions} de {pkg.totalSessions} sessões restantes
          </span>
          <span className="text-slate-500">{formatCurrency(pkg.priceCents)}</span>
          <span className={isExpired(pkg) ? "font-medium text-red-700" : "text-slate-500"}>
            {pkg.expiresAt
              ? `${isExpired(pkg) ? "Expirado em" : "Válido até"} ${formatDate(pkg.expiresAt)}`
              : "Sem validade"}
          </span>
        </li>
      ))}
    </ul>
  );
}
