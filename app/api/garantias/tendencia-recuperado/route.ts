// app/api/garantias/tendencia-recuperado/route.ts
// Nueva API Route para Tendencia de Garantías Recuperadas
// GET /api/garantias/tendencia-recuperado?year=2026&idEmpresa=1&previousYear=true

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryWithRetry } from '@/lib/reco-api';
import { formatMonthNameShort } from '@/lib/utils/formatters';

export const dynamic = 'force-dynamic';

interface MonthlyRecoveredData {
  month: number;
  monthName: string;
  amount: number;
}

async function getRecoveredData(year: number, idEmpresa: number): Promise<MonthlyRecoveredData[]> {
  const fechaInicio = `${year}-01-01`;
  const fechaCorte = `${year}-12-31`;

  // Query para obtener SOLO lo Recuperado, agrupado por mes
  const query = `
    SELECT
      MONTH(dDeposito) AS Mes,
      SUM(ABS(ImporteMN)) AS ImporteMN
    FROM dbo.fn_GarantiasPorCobrar('${fechaCorte}', ${idEmpresa})
    WHERE dDeposito >= '${fechaInicio}'
      AND dDeposito <= '${fechaCorte}'
      AND EstatusGarantia = 'Recuperadas'
    GROUP BY MONTH(dDeposito)
    ORDER BY Mes
  `;

  const result = await executeQueryWithRetry(query, { useCache: true, retries: 2 });
  
  if (!result.success || !result.data) {
    console.error(`Error fetching recovered data for year ${year}:`, result.error);
    return [];
  }

  const today = new Date();
  const isCurrentYear = year === today.getFullYear();
  const maxMonth = isCurrentYear ? today.getMonth() + 1 : 12;

  // Initialize all months with 0
  const monthMap = new Map<number, number>();
  for (let m = 1; m <= maxMonth; m++) {
    monthMap.set(m, 0);
  }

  // Fill with actual data
  result.data.forEach((row: any) => {
    const mes = row.Mes || 0;
    const importe = row.ImporteMN || 0;
    if (monthMap.has(mes)) {
      monthMap.set(mes, importe);
    }
  });

  return Array.from(monthMap.entries()).map(([month, amount]) => ({
    month,
    monthName: formatMonthNameShort(month),
    amount: Math.round(amount * 100) / 100,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const idEmpresa = parseInt(searchParams.get('idEmpresa') || '1');
    const includePreviousYear = searchParams.get('previousYear') === 'true';

    if (isNaN(year) || isNaN(idEmpresa)) {
      return NextResponse.json(
        { error: 'Parámetros inválidos. Se requiere year y idEmpresa numéricos.' },
        { status: 400 }
      );
    }

    // Get current year data
    const currentYearData = await getRecoveredData(year, idEmpresa);
    
    // Get previous year data if requested
    let previousYearData: MonthlyRecoveredData[] = [];
    if (includePreviousYear) {
      previousYearData = await getRecoveredData(year - 1, idEmpresa);
    }

    const response = {
      currentYear: currentYearData,
      previousYear: previousYearData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error en /api/garantias/tendencia-recuperado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
