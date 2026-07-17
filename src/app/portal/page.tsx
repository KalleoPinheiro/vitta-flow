"use client";

import Link from "next/link";
import { useApiQuery } from "@/lib/use-api-query";
import { ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { PatientPortalView } from "./patient-view";
import { PartnerPortalView } from "./partner-view";

interface Me {
  subject: string;
  role: "admin" | "partner" | "patient";
}

export default function PortalPage() {
  const { data: me, error } = useApiQuery<Me>("/api/portal/me");

  if (error) return <ErrorAlert message={error} />;
  if (!me) return <LoadingIndicator />;

  if (me.role === "patient") return <PatientPortalView />;
  if (me.role === "partner") return <PartnerPortalView />;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <p className="mb-3">
        Você está logado como <strong>equipe da clínica</strong> ({me.subject}).
      </p>
      <Link href="/" className="font-medium text-teal-700 hover:underline">
        Ir para o sistema da clínica →
      </Link>
    </div>
  );
}
