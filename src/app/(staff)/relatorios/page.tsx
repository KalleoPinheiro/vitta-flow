"use client";

import { useState } from "react";
import type { MonthlyReport } from "@/application/reports/get-monthly-report";
import { useApiQuery } from "@/lib/use-api-query";
import { APPOINTMENT_STATUS_LABELS, formatCurrency } from "@/lib/format";
import { ErrorAlert, LoadingIndicator, EmptyState } from "@/components/feedback";

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
        <h1 className="text-2xl font-bold">Relatório gerencial</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        />
      </div>

      {error && <ErrorAlert message={error} />}
      {!report ? (
        <LoadingIndicator />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Consultas no mês" value={String(report.totalAppointments)} />
            <Card
              label="Taxa de falta (no-show)"
              value={`${(report.noShowRate * 100).toFixed(1)}%`}
              accent={report.noShowRate > 0.15 ? "text-red-700" : "text-teal-700"}
            />
            <Card label="Recebido" value={formatCurrency(report.billing.paidCents)} accent="text-emerald-700" />
            <Card label="A receber" value={formatCurrency(report.billing.pendingCents)} accent="text-amber-600" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-lg font-semibold">Consultas por status</h2>
              <ul className="divide-y divide-slate-100 text-sm">
                {Object.entries(report.byStatus).map(([status, count]) => (
                  <li key={status} className="flex justify-between py-2">
                    <span>{APPOINTMENT_STATUS_LABELS[status] ?? status}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-lg font-semibold">Receita por procedimento (concluídas)</h2>
              {report.revenueByProcedure.length === 0 ? (
                <EmptyState message="Nenhuma consulta concluída no mês." />
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Procedimento</th>
                      <th className="py-2 text-right">Qtde</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.revenueByProcedure.map((row) => (
                      <tr key={row.procedure}>
                        <td className="py-2">{row.procedure}</td>
                        <td className="py-2 text-right">{row.count}</td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(row.totalCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, accent = "text-teal-700" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
