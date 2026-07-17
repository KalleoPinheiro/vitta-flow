import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VittaFlow — Clínica de Estomaterapia",
  description: "Gestão de pacientes, agenda e faturamento para clínica de estomaterapia",
};

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/agenda", label: "Agenda" },
  { href: "/pacientes", label: "Pacientes" },
  { href: "/faturamento", label: "Faturamento" },
  { href: "/materiais", label: "Materiais" },
  { href: "/relatorios", label: "Relatórios" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-screen bg-slate-50 text-slate-900">
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
      </body>
    </html>
  );
}
