// hooks/useCollectionTrend.ts
// React Query hook for US-001: Tendencia Cobrado

import { useQuery } from '@tanstack/react-query';
import { CollectionTrendData, CollectionTrendParams, MonthlyCollectionData } from '@/types/dashboard';

const fetchCollectionTrend = async (params: CollectionTrendParams): Promise<CollectionTrendData> => {
  // La nueva consulta en backend usa CROSS APPLY y trae los 12 meses juntos de forma instantánea.
  // Ya no es necesario hacer peticiones en lotes mes por mes.
  const response = await fetch(
    `/api/tendencia-cobrado?year=${params.year}&idEmpresa=${params.idEmpresa}&_t=${Date.now()}`
  );
  
  if (!response.ok) {
    throw new Error('Error al obtener la tendencia de cobrado');
  }
  
  return await response.json();
};

export function useCollectionTrend(params: CollectionTrendParams, enabled = true) {
  return useQuery({
    queryKey: ['collectionTrend', params.year, params.idEmpresa],
    queryFn: () => fetchCollectionTrend(params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}
