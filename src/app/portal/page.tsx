"use client";

import Link from "next/link";
import { Card, CardContent, Icon } from "@still-void/ui/react";
import { useApiQuery } from "@/lib/use-api-query";
import { ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { PatientPortalView } from "./patient-view";
import { PartnerPortalView } from "./partner-view";

interface Me {
  subject: string;
  role: "super_admin" | "company_admin" | "atendente" | "profissional" | "partner" | "patient";
}

export default function PortalPage() {
  const { data: me, error } = useApiQuery<Me>("/api/portal/me");

  if (error) return <ErrorAlert message={error} />;
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
