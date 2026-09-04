'use client';

import { Button } from '@still-void/ui/react';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="self-start"
      onClick={() => void handleLogout()}
    >
      Sair
    </Button>
  );
}
