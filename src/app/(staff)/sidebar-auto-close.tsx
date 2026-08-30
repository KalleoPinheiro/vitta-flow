"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "@still-void/ui/react/client";

export function SidebarAutoClose() {
  const pathname = usePathname();
  const { setOpen } = useSidebar();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setOpen(false);
  }, [pathname, setOpen]);

  return null;
}
