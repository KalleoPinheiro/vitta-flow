import { LogoutButton } from "@/components/logout-button";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-lg font-bold text-teal-700">VittaFlow</span>
          <p className="text-xs text-slate-500">Portal do paciente e do parceiro</p>
        </div>
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}
