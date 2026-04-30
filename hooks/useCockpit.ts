// hooks/useCockpit.ts
// React Query hook para Cockpit Ejecutivo GCX.
// Permite refetch manual con ?refresh=1 para forzar regeneración sin esperar TTL Redis.

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { DashboardData } from '@/lib/cockpit/contract';

const fetchCockpit = async (forceRefresh = false): Promise<DashboardData> => {
  const qs = forceRefresh ? '?refresh=1' : '';
  const res = await fetch(`/api/cockpit${qs}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Error al cargar cockpit');
  return res.json();
};

export function useCockpit() {
  return useQuery({
    queryKey: ['cockpit'],
    queryFn: () => fetchCockpit(false),
    staleTime: 0,        // siempre stale → refetch al remount/focus
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCockpitRefresh() {
  const queryClient = useQueryClient();
  const { isFetching, data } = useQuery({
    queryKey: ['cockpit'],
    queryFn: () => fetchCockpit(false),
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const refresh = async () => {
    // Force refresh via API param → invalida Redis + regenera IA
    const fresh = await fetchCockpit(true);
    // Actualiza cache local de React Query sin nueva llamada
    queryClient.setQueryData(['cockpit'], fresh);
    return fresh;
  };

  return { data, isLoading: isFetching, refresh };
}
