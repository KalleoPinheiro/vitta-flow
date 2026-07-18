import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/agenda", label: "Agenda" },
  { href: "/pacientes", label: "Pacientes" },
  { href: "/parceiros", label: "Parceiros" },
  { href: "/profissionais", label: "Profissionais" },
  { href: "/faturamento", label: "Faturamento" },
  { href: "/materiais", label: "Materiais" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/auditoria", label: "Auditoria" },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <span className="text-lg font-bold text-teal-700">VittaFlow</span>
          <p className="mt-0.5 text-xs text-slate-500">Clínica de Estomaterapia</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden p-6 lg:p-8">{children}</main>
    </div>
  );
}
