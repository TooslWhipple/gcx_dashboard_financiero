// app/api/garantias/estatus/route.ts
// API Route para US-005: Estatus de Garantías
// GET /api/garantias/estatus?year=2026&idEmpresa=1
// Fuente: fn_Garantias_Estatus(@FechaInicio DATE, @FechaCorte DATE, @IdEmpresa INT)
// Columnas clave: EstatusGarantia (Programadas/Naviera/Operacion), Saldo, dDeposito

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryWithRetry } from '@/lib/reco-api';
import { GuaranteeStatusData, GuaranteeStatusSummary, WeekGuaranteeData, GuaranteeStatus } from '@/types/dashboard';

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

    // Query: fn_Garantias_Estatus con agrupación por semana del año y estatus
    // DATEPART(WEEK, dDeposito) agrupa por semana calendario
    const query = `
      SELECT
        EstatusGarantia AS Estatus,
        DATEPART(WEEK, dDeposito) AS Semana,
        SUM(Saldo) AS ImporteMN
      FROM dbo.fn_Garantias_Estatus('${fechaInicio}', '${fechaCorte}', ${idEmpresa})
      WHERE Saldo > 0
      GROUP BY EstatusGarantia, DATEPART(WEEK, dDeposito)
      ORDER BY Semana, EstatusGarantia
    `;

    console.log(`[GARANTIAS-ESTATUS] Query año ${year}:\n${query.trim()}`);

    const result = await executeQueryWithRetry(query, { useCache: true, retries: 1 });

    if (!result.success || !result.data) {
      console.warn('[GARANTIAS-ESTATUS] Sin datos:', result.error);
      const empty: GuaranteeStatusData = { summary: [], weeks: [], chartData: [] };
      return NextResponse.json(empty);
    }

    const rawData: any[] = result.data;

    // Agrupar por semana
    const weekMap = new Map<number, { scheduled: number; naviera: number; operation: number; recovered: number }>();

    rawData.forEach((row) => {
      const semana = row.Semana || row.semana || 0;
      const estatus: string = row.Estatus || '';
      const importe = row.ImporteMN || 0;

      if (!weekMap.has(semana)) {
        weekMap.set(semana, { scheduled: 0, naviera: 0, operation: 0, recovered: 0 });
      }
      const entry = weekMap.get(semana)!;

      if (estatus === 'Programadas') entry.scheduled += importe;
      else if (estatus === 'Naviera') entry.naviera += importe;
      else if (estatus === 'Operación') entry.operation += importe;
      else if (estatus === 'Recuperadas') entry.recovered += importe;
    });

    // Construir array de semanas ordenado
    const weeks: WeekGuaranteeData[] = Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([weekNumber, data]) => ({
        weekNumber,
        weekLabel: `Sem.${weekNumber}`,
        scheduled: Math.round(data.scheduled * 100) / 100,
        naviera: Math.round(data.naviera * 100) / 100,
        operation: Math.round(data.operation * 100) / 100,
        recovered: Math.round(data.recovered * 100) / 100,
        total: Math.round((data.scheduled + data.naviera + data.operation + data.recovered) * 100) / 100,
      }));

    // Calcular resumen total por estatus
    const totalScheduled = weeks.reduce((s, w) => s + w.scheduled, 0);
    const totalNaviera = weeks.reduce((s, w) => s + w.naviera, 0);
    const totalOperation = weeks.reduce((s, w) => s + w.operation, 0);
    const totalRecovered = weeks.reduce((s, w) => s + w.recovered, 0);
    const grandTotal = totalScheduled + totalNaviera + totalOperation + totalRecovered;

    const summary: GuaranteeStatusSummary[] = [
      {
        status: 'Programadas' as GuaranteeStatus,
        amount: Math.round(totalScheduled * 100) / 100,
        percentage: grandTotal > 0 ? Math.round((totalScheduled / grandTotal) * 10000) / 100 : 0,
      },
      {
        status: 'Naviera' as GuaranteeStatus,
        amount: Math.round(totalNaviera * 100) / 100,
        percentage: grandTotal > 0 ? Math.round((totalNaviera / grandTotal) * 10000) / 100 : 0,
      },
      {
        status: 'Operación' as GuaranteeStatus,
        amount: Math.round(totalOperation * 100) / 100,
        percentage: grandTotal > 0 ? Math.round((totalOperation / grandTotal) * 10000) / 100 : 0,
      },
      {
        status: 'Recuperadas' as GuaranteeStatus,
        amount: Math.round(totalRecovered * 100) / 100,
        percentage: grandTotal > 0 ? Math.round((totalRecovered / grandTotal) * 10000) / 100 : 0,
      },
    ];

    const response: GuaranteeStatusData = {
      summary,
      weeks,
      chartData: weeks,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error en /api/garantias/estatus:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
