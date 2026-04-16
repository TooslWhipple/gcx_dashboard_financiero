// app/api/garantias/tendencia-recuperado/route.ts
// Nueva API Route para Tendencia de Garantías Recuperadas (mensual)
// GET /api/garantias/tendencia-recuperado?year=2026&idEmpresa=1&previousYear=true
// Fuente: EXEC dbo.[sp_Estatus_Garantia] @Year, @IdEmpresa
// Filtramos solo Estatus = 'Recuperadas', agrupamos por MES

import { NextRequest, NextResponse } from 'next/server';
import { executeSP } from '@/lib/reco-api';
import { formatMonthNameShort } from '@/lib/utils/formatters';

export const dynamic = 'force-dynamic';

interface MonthlyRecoveredData {
  month: number;
  monthName: string;
  amount: number;
}

async function getRecoveredData(year: number, idEmpresa: number): Promise<MonthlyRecoveredData[]> {
  console.log(`[GARANTIAS-RECUPERADO] EXEC sp_Estatus_Garantia ${year}, ${idEmpresa}`);

  const result = await executeSP(
    'sp_Estatus_Garantia',
    { Year: year, IdEmpresa: idEmpresa },
    { useCache: true, retries: 2 }
  );

  if (!result.success || !result.data) {
    console.error(`[GARANTIAS-RECUPERADO] Error año ${year}:`, result.error);
    return [];
  }

  const today = new Date();
  const isCurrentYear = year === today.getFullYear();
  const maxMonth = isCurrentYear ? today.getMonth() + 1 : 12;

  // Inicializar todos los meses en 0
  const monthMap = new Map<number, number>();
  for (let m = 1; m <= maxMonth; m++) {
    monthMap.set(m, 0);
  }

  // Filtrar solo 'Recuperadas' y acumular por MES
  result.data.forEach((row: any) => {
    const estatus: string = (row.Estatus ?? row.estatus ?? '').toString();
    if (estatus !== 'Recuperadas') return;

    const mes: number  = row.MES       ?? row.Mes       ?? row.mes       ?? 0;
    const importe: number = row.ImporteMN ?? row.importemn ?? 0;

    if (monthMap.has(mes)) {
      monthMap.set(mes, (monthMap.get(mes) ?? 0) + Math.abs(importe));
    }
  });

  return Array.from(monthMap.entries()).map(([month, amount]) => ({
    month,
    monthName: formatMonthNameShort(month),
    amount:    Math.round(amount * 100) / 100,
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

    // Paralelo: año actual + año anterior (si se pidió)
    const [currentYearData, previousYearData] = await Promise.all([
      getRecoveredData(year, idEmpresa),
      includePreviousYear ? getRecoveredData(year - 1, idEmpresa) : Promise.resolve([]),
    ]);

    return NextResponse.json({ currentYear: currentYearData, previousYear: previousYearData });

  } catch (error) {
    console.error('Error en /api/garantias/tendencia-recuperado:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
