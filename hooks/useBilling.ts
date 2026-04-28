// hooks/useBilling.ts
// React Query hook para US-007: Facturación DAC

import { useQuery } from '@tanstack/react-query';
import { BillingData } from '@/types/dashboard';

interface BillingParams {
  year: number;
  aduanaId?: string;
  view?: 'semanal' | 'mensual';
}

const fetchBilling = async (params: BillingParams): Promise<BillingData> => {
  const qs = new URLSearchParams({ year: String(params.year) });
  if (params.aduanaId) qs.set('aduanaId', params.aduanaId);
  if (params.view)     qs.set('view', params.view);

  const response = await fetch(`/api/facturacion?${qs.toString()}`);
  if (!response.ok) throw new Error('Error al cargar datos de facturación');
  return response.json();
};

export function useBilling(params: BillingParams, enabled = true) {
  return useQuery({
    queryKey: ['billing', params.year, params.aduanaId, params.view ?? 'semanal'],
    queryFn: () => fetchBilling(params),
    enabled,
    staleTime: 0,            // siempre stale → refetch al remount/focus
    gcTime: 5 * 60 * 1000,   // mantener 5 min en memoria por si vuelve rápido
  });
}
