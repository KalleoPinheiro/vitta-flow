import { Sidebar, SidebarSection } from "@still-void/ui/react";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { StaffNav } from "./staff-nav";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* O <main> não usa o <Layout> do pacote de propósito: `.sv-layout` limita
          a 1120px e as telas do staff são tabelas largas. */}
      <Sidebar className="w-56 shrink-0 justify-between border-r border-border p-5">
        <div className="flex flex-col gap-8">
          <div>
            <BrandLogo />
            <p className="mt-1 text-xs text-ink-3">
              Clínica de Estomaterapia
            </p>
          </div>
          <SidebarSection title="Navegação">
            <StaffNav />
          </SidebarSection>
        </div>
        <LogoutButton />
      </Sidebar>
      <main className="flex-1 overflow-x-hidden p-6 lg:p-8">{children}</main>
    </div>
  );
}
