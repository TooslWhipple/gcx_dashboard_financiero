// hooks/useOfficeSummary.ts
// React Query hook for US-006: Resumen por Oficinas

import { useQuery } from '@tanstack/react-query';
import { OfficeSummaryData, OfficeSummaryParams } from '@/types/dashboard';

const fetchOfficeSummary = async (params: OfficeSummaryParams): Promise<OfficeSummaryData> => {
  const url = new URL('/api/resumen-oficinas', window.location.origin);
  url.searchParams.set('fechaCorte', params.fechaCorte);
  if (params.idEmpresa) {
    url.searchParams.set('idEmpresa', params.idEmpresa.toString());
  }

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error('Error al cargar resumen por oficinas');
  }
  
  return response.json();
};

export function useOfficeSummary(params: OfficeSummaryParams, enabled = true) {
  return useQuery({
    queryKey: ['officeSummary', params.fechaCorte, params.idEmpresa],
    queryFn: () => fetchOfficeSummary(params),
    enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
