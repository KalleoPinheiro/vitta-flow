const COLOR_BY_STATUS: Record<string, string> = {
  scheduled: "bg-sky-100 text-sky-800",
  confirmed: "bg-teal-100 text-teal-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-600",
  no_show: "bg-amber-100 text-amber-800",
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
};

interface StatusBadgeProps {
  status: string;
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const color = COLOR_BY_STATUS[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
