"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-700"
    >
      Sair
    </button>
  );
}
