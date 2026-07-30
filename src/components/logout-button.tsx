"use client";

import { useRouter } from "next/navigation";
import { headerClasses } from "@still-void/ui";

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
      className={`${headerClasses.link} self-start`}
    >
      Sair
    </button>
  );
}
