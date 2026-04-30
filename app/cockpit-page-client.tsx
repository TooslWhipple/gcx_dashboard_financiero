// app/cockpit-page-client.tsx
// Wrapper cliente para Cockpit con React Query y botón de refresh.

'use client';

import { CockpitEjecutivo } from '@/components/cockpit/cockpit-ejecutivo';
import { useCockpitRefresh } from '@/hooks/useCockpit';
import { mockDashboardData } from '@/lib/cockpit/mock';

export default function CockpitPageClient() {
  const { data, isLoading, refresh } = useCockpitRefresh();

  const handleRefresh = async () => {
    await refresh();
  };

  if (!data && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#07185d] border-t-transparent mb-4" />
          <p className="text-sm text-slate-500">Cargando Cockpit Ejecutivo...</p>
        </div>
      </div>
    );
  }

  const displayData = data ?? mockDashboardData;

  return (
    <CockpitEjecutivo
      data={displayData}
      onRefresh={handleRefresh}
      isLoading={isLoading}
    />
  );
}
