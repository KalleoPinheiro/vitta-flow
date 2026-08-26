"use client";

import { useState } from "react";
import type { MonthlyReport } from "@/application/reports/get-monthly-report";
import { useApiQuery } from "@/lib/use-api-query";
import { APPOINTMENT_STATUS_LABELS, formatCurrency } from "@/lib/format";
import { ErrorAlert, LoadingIndicator, EmptyState } from "@/components/feedback";
import {
  Card,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@still-void/ui/react";

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
            <Card as="section" className="p-5">
              <h2 className="mb-3 text-lg font-semibold">Consultas por status</h2>
              <ul className="divide-y divide-border text-sm">
                {Object.entries(report.byStatus).map(([status, count]) => (
                  <li key={status} className="flex justify-between py-2">
                    <span>{APPOINTMENT_STATUS_LABELS[status] ?? status}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card as="section" className="p-5">
              <h2 className="mb-3 text-lg font-semibold">
                Receita e margem por procedimento (concluídas)
              </h2>
              {report.revenueByProcedure.length === 0 ? (
                <EmptyState message="Nenhuma consulta concluída no mês." />
              ) : (
                <>
                  <Table className="w-full text-left text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-2">Procedimento</TableHead>
                        <TableHead className="py-2 text-right">Qtde</TableHead>
                        <TableHead className="py-2 text-right">Receita</TableHead>
                        <TableHead className="py-2 text-right">Insumos</TableHead>
                        <TableHead className="py-2 text-right">Margem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.revenueByProcedure.map((row) => (
                        <TableRow key={row.procedure}>
                          <TableCell className="py-2">{row.procedure}</TableCell>
                          <TableCell className="py-2 text-right">{row.count}</TableCell>
                          <TableCell className="py-2 text-right font-medium">
                            {formatCurrency(row.totalCents)}
                          </TableCell>
                          <TableCell className="py-2 text-right text-ink-3">
                            {formatCurrency(row.supplyCostCents)}
                          </TableCell>
                          <TableCell
                            className={`py-2 text-right font-medium ${
                              row.marginCents >= 0 ? "text-success" : "text-danger"
                            }`}
                          >
                            {formatCurrency(row.marginCents)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {report.unattributedSupplyCostCents > 0 && (
                    <p className="mt-3 text-xs text-warning">
                      Custo de insumos não vinculado a consulta no mês:{" "}
                      <strong>{formatCurrency(report.unattributedSupplyCostCents)}</strong> —
                      vincule as saídas de atendimento à consulta para margem completa.
                    </p>
                  )}
                </>
              )}
            </Card>
          </div>

          {report.productionByProfessional.length > 0 && (
            <Card as="section" className="p-5">
              <h2 className="mb-3 text-lg font-semibold">Produção por profissional</h2>
              <Table className="w-full text-left text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2">Profissional</TableHead>
                    <TableHead className="py-2 text-right">Concluídas</TableHead>
                    <TableHead className="py-2 text-right">Receita</TableHead>
                    <TableHead className="py-2 text-right">Repasse</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.productionByProfessional.map((row) => (
                    <TableRow key={row.professionalId ?? "none"}>
                      <TableCell className="py-2">{row.professionalName}</TableCell>
                      <TableCell className="py-2 text-right">{row.count}</TableCell>
                      <TableCell className="py-2 text-right font-medium">
                        {formatCurrency(row.totalCents)}
                      </TableCell>
                      <TableCell className="py-2 text-right text-ink-2">
                        {row.commissionCents != null ? formatCurrency(row.commissionCents) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
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
