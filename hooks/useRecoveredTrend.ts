// hooks/useRecoveredTrend.ts
import { useQuery } from '@tanstack/react-query';
import { RecoveredTrendData } from '@/types/dashboard';

interface UseRecoveredTrendParams {
  year: number;
  idEmpresa?: number;
  previousYear?: boolean;
}

export function useRecoveredTrend({ year, idEmpresa = 1, previousYear = true }: UseRecoveredTrendParams) {
  return useQuery<RecoveredTrendData, Error>({
    queryKey: ['recovered-trend', year, idEmpresa, previousYear],
    queryFn: async () => {
      const params = new URLSearchParams({
        year: year.toString(),
        idEmpresa: idEmpresa.toString(),
        ...(previousYear && { previousYear: 'true' }),
      });
      const res = await fetch(`/api/garantias/tendencia-recuperado?${params}`);
      if (!res.ok) {
        throw new Error('Error fetching recovered trend data');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
