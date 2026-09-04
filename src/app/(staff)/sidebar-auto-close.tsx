'use client';
import { useSidebar } from '@still-void/ui/react/client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function SidebarAutoClose() {
  const pathname = usePathname();
  const { setOpen } = useSidebar();
  const isFirstRender = useRef(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname não é lido no corpo — é o gatilho que faz o effect rodar de novo a cada navegação.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setOpen(false);
  }, [pathname, setOpen]);

  return null;
}
