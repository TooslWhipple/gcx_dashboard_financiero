// hooks/useRecoveredTrend.ts
import { useQuery } from '@tanstack/react-query';
import { RecoveredTrendData } from '@/types/dashboard';

interface UseRecoveredTrendParams {
  year: number;
  idEmpresa?: number;
}

export function useRecoveredTrend({ year, idEmpresa = 1 }: UseRecoveredTrendParams) {
  return useQuery<RecoveredTrendData, Error>({
    queryKey: ['recovered-trend', year, idEmpresa],
    queryFn: async () => {
      const res = await fetch(`/api/garantias/tendencia-recuperado?year=${year}&idEmpresa=${idEmpresa}`);
      if (!res.ok) {
        throw new Error('Error fetching recovered trend data');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
