"use client";

import { useState } from "react";
import type { MonthlyReport } from "@/application/reports/get-monthly-report";
import { useApiQuery } from "@/lib/use-api-query";
import { APPOINTMENT_STATUS_LABELS, formatCurrency } from "@/lib/format";
import { ErrorAlert, LoadingIndicator, EmptyState } from "@/components/feedback";
import { Card, Input } from "@still-void/ui/react";

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth);
  const { data: report, error } = useApiQuery<MonthlyReport>(`/api/reports?month=${month}`);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="sv-display text-2xl font-bold">Relatório gerencial</h1>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>

      {error && <ErrorAlert message={error} />}
      {!report ? (
        <LoadingIndicator />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Consultas no mês" value={String(report.totalAppointments)} />
            <MetricCard
              label="Taxa de falta (no-show)"
              value={`${(report.noShowRate * 100).toFixed(1)}%`}
              accent={report.noShowRate > 0.15 ? "text-danger" : "text-accent-ink"}
            />
            <MetricCard label="Recebido" value={formatCurrency(report.billing.paidCents)} accent="text-success" />
            <MetricCard label="A receber" value={formatCurrency(report.billing.pendingCents)} accent="text-warning" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* sv-gap: card-as-element */}
            <section className="rounded-lg border border-sv-border bg-sv-surface p-5">
              <h2 className="mb-3 text-lg font-semibold">Consultas por status</h2>
              <ul className="divide-y divide-border text-sm">
                {Object.entries(report.byStatus).map(([status, count]) => (
                  <li key={status} className="flex justify-between py-2">
                    <span>{APPOINTMENT_STATUS_LABELS[status] ?? status}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* sv-gap: card-as-element */}
            <section className="rounded-lg border border-sv-border bg-sv-surface p-5">
              <h2 className="mb-3 text-lg font-semibold">
                Receita e margem por procedimento (concluídas)
              </h2>
              {report.revenueByProcedure.length === 0 ? (
                <EmptyState message="Nenhuma consulta concluída no mês." />
              ) : (
                <>
                  {/* sv-gap: table */}
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-ink-3">
                      <tr>
                        <th className="py-2">Procedimento</th>
                        <th className="py-2 text-right">Qtde</th>
                        <th className="py-2 text-right">Receita</th>
                        <th className="py-2 text-right">Insumos</th>
                        <th className="py-2 text-right">Margem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.revenueByProcedure.map((row) => (
                        <tr key={row.procedure}>
                          <td className="py-2">{row.procedure}</td>
                          <td className="py-2 text-right">{row.count}</td>
                          <td className="py-2 text-right font-medium">
                            {formatCurrency(row.totalCents)}
                          </td>
                          <td className="py-2 text-right text-ink-3">
                            {formatCurrency(row.supplyCostCents)}
                          </td>
                          <td
                            className={`py-2 text-right font-medium ${
                              row.marginCents >= 0 ? "text-success" : "text-danger"
                            }`}
                          >
                            {formatCurrency(row.marginCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {report.unattributedSupplyCostCents > 0 && (
                    <p className="mt-3 text-xs text-warning">
                      Custo de insumos não vinculado a consulta no mês:{" "}
                      <strong>{formatCurrency(report.unattributedSupplyCostCents)}</strong> —
                      vincule as saídas de atendimento à consulta para margem completa.
                    </p>
                  )}
                </>
              )}
            </section>
          </div>

          {report.productionByProfessional.length > 0 && (
            // sv-gap: card-as-element
            <section className="rounded-lg border border-sv-border bg-sv-surface p-5">
              <h2 className="mb-3 text-lg font-semibold">Produção por profissional</h2>
              {/* sv-gap: table */}
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-ink-3">
                  <tr>
                    <th className="py-2">Profissional</th>
                    <th className="py-2 text-right">Concluídas</th>
                    <th className="py-2 text-right">Receita</th>
                    <th className="py-2 text-right">Repasse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.productionByProfessional.map((row) => (
                    <tr key={row.professionalId ?? "none"}>
                      <td className="py-2">{row.professionalName}</td>
                      <td className="py-2 text-right">{row.count}</td>
                      <td className="py-2 text-right font-medium">
                        {formatCurrency(row.totalCents)}
                      </td>
                      <td className="py-2 text-right text-ink-2">
                        {row.commissionCents != null ? formatCurrency(row.commissionCents) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent = "text-accent-ink",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-ink-3">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </Card>
  );
}
