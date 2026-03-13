// app/api/garantias/tendencia-recuperado/route.ts
// Nueva API Route para Tendencia de Garantías Recuperadas
// GET /api/garantias/tendencia-recuperado?year=2026&idEmpresa=1

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryWithRetry } from '@/lib/reco-api';
import { formatMonthNameShort } from '@/lib/utils/formatters';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const idEmpresa = parseInt(searchParams.get('idEmpresa') || '1');

    if (isNaN(year) || isNaN(idEmpresa)) {
      return NextResponse.json(
        { error: 'Parámetros inválidos. Se requiere year y idEmpresa numéricos.' },
        { status: 400 }
      );
    }

    const fechaInicio = `${year}-01-01`;
    const fechaCorte = `${year}-12-31`;

    // Query para obtener SOLO lo Recuperado, agrupado por mes
    const query = `
      SELECT
        MONTH(dDeposito) AS Mes,
        SUM(Saldo) AS ImporteMN
      FROM dbo.fn_Garantias_Estatus('${fechaInicio}', '${fechaCorte}', ${idEmpresa})
      WHERE EstatusGarantia = 'Recuperadas'
      GROUP BY MONTH(dDeposito)
      ORDER BY Mes
    `;

    const result = await executeQueryWithRetry(query, { useCache: true, retries: 1 });

    if (!result.success || !result.data) {
      return NextResponse.json({ data: [] });
    }

    const rawData: any[] = result.data;
    const monthMap = new Map<number, number>();

    // Inicializar todos los meses hasta el mes actual si es el año en curso
    const today = new Date();
    const isCurrentYear = year === today.getFullYear();
    const maxMonth = isCurrentYear ? today.getMonth() + 1 : 12;

    for (let m = 1; m <= maxMonth; m++) {
      monthMap.set(m, 0);
    }

    rawData.forEach((row) => {
      const mes = row.Mes || row.mes || 0;
      const importe = row.ImporteMN || 0;
      if (monthMap.has(mes)) {
        monthMap.set(mes, importe);
      }
    });

    const monthsData = Array.from(monthMap.entries()).map(([month, amount]) => ({
      month,
      monthName: formatMonthNameShort(month),
      amount: Math.round(amount * 100) / 100,
    }));

    return NextResponse.json({ data: monthsData });
  } catch (error) {
    console.error('Error en /api/garantias/tendencia-recuperado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
