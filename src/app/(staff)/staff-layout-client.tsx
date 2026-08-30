"use client";
import {
  SidebarProvider,
  SidebarPanel,
  SidebarTrigger,
  SidebarInset,
} from "@still-void/ui/react/client";
import { SidebarSection } from "@still-void/ui/react";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { StaffNav } from "./staff-nav";
import { SidebarAutoClose } from "./sidebar-auto-close";

interface StaffLayoutClientProps {
  children: React.ReactNode;
}

export function StaffLayoutClient({ children }: StaffLayoutClientProps) {
  return (
    // defaultOpen=false: o default da lib é `true` (pensado pro rail de
    // desktop, que fica visível independente de `open`) — sem essa prop,
    // `open` nasce true e o drawer mobile (que É gated por `open`) abre
    // sozinho assim que a hidratação detecta viewport mobile, sem clique
    // nenhum do usuário. Não afeta o desktop: o rail em modo "offcanvas"
    // renderiza incondicionalmente, sem olhar pra `open`.
    <SidebarProvider defaultOpen={false}>
      <SidebarAutoClose />
      <div className="flex min-h-screen">
        {/* O <main> não usa o <Layout> do pacote de propósito: `.sv-layout` limita
            a 1120px e as telas do staff são tabelas largas. */}
        <SidebarPanel className="w-56 shrink-0 justify-between border-r border-border p-5">
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
        </SidebarPanel>
        <SidebarInset className="flex-1 p-6 lg:p-8">
          <div className="mb-4 flex items-center gap-3 lg:hidden">
            <SidebarTrigger />
            <BrandLogo />
          </div>
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
