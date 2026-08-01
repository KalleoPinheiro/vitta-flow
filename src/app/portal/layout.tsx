import { Header, Layout } from "@still-void/ui/react";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header
        logo={
          <div>
            <BrandLogo />
            <p className="text-xs text-ink-3">
              Portal do paciente e do parceiro
            </p>
          </div>
        }
        actions={<LogoutButton />}
      />
      {/* `.sv-layout` centraliza em 1120px; o portal lê melhor mais estreito e o
          utilitário vence porque o CSS do pacote entra em layer(components). */}
      <Layout className="max-w-3xl">{children}</Layout>
    </>
  );
}
