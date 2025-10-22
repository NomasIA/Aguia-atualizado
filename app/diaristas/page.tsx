'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DiaristasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/funcionarios');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted">Redirecionando...</p>
    </div>
  );
}
