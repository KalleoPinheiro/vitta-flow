import { Card } from "@still-void/ui/react";

interface MetricCardProps {
  label: string;
  value: string;
  accent?: string;
  /** Delta percentual vs. período anterior (REL-04) — ex.: "+12,5% vs mês anterior". */
  delta?: string;
}

export function MetricCard({ label, value, accent = "text-accent-ink", delta }: MetricCardProps) {
  return (
    <Card className="p-5">
      <p className="text-sm text-ink-3">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      {delta && <p className="mt-1 text-xs text-ink-3">{delta}</p>}
    </Card>
  );
}
