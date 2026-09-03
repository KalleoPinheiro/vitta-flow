"use client";

import Link from "next/link";
import { Card, CardContent, Icon } from "@still-void/ui/react";
import { useApiQuery } from "@/lib/use-api-query";
import { LoadingIndicator } from "@/components/feedback";
import { PatientPortalView } from "./patient-view";
import { PartnerPortalView } from "./partner-view";

interface Me {
  subject: string;
  role: "super_admin" | "company_admin" | "atendente" | "profissional" | "partner" | "patient";
}

// PORT-01/PORT-10: mensagens cruas de sessão ("Não autenticado", "Rota
// exclusiva do portal do paciente/parceiro" — src/lib/auth/access-policy.ts,
// require-session.ts) nunca aparecem na tela; qualquer erro de sessão vira o
// mesmo estado com ação clara de entrar de novo.
function SessionExpired() {
  return (
    <Card as="section" className="p-6 text-center">
      <Icon name="alert-circle" className="mx-auto mb-2 text-warning" />
      <h1 className="mb-1 text-lg font-semibold">Sua sessão expirou</h1>
      <p className="mb-4 text-sm text-ink-3">Entre novamente para continuar no portal.</p>
      <Link href="/login?error=session_expired" className="font-medium text-accent-ink hover:underline">
        Entrar <Icon name="chevron-right" />
      </Link>
    </Card>
  );
}

export default function PortalPage() {
  const { data: me, error } = useApiQuery<Me>("/api/portal/me");

  if (error) return <SessionExpired />;
  if (!me) return <LoadingIndicator />;

  if (me.role === "patient") return <PatientPortalView />;
  if (me.role === "partner") return <PartnerPortalView />;

  return (
    <Card>
      <CardContent className="p-6 text-sm">
        <p className="mb-3">
          Você está logado como <strong>equipe da clínica</strong> ({me.subject}).
        </p>
        <Link href="/" className="font-medium text-accent-ink hover:underline">
          Ir para o sistema da clínica <Icon name="chevron-right" />
        </Link>
      </CardContent>
    </Card>
  );
}
