// app/api/garantias/estatus/route.ts
// API Route para US-005: Estatus de Garantías por mes
// GET /api/garantias/estatus?year=2026&idEmpresa=1
// Fuente: EXEC dbo.[sp_Estatus_Garantia] @Year, @IdEmpresa
// SP devuelve: Estatus (Programadas/Naviera/Operación/Recuperadas), ImporteMN, MES

import { NextRequest, NextResponse } from 'next/server';
import { executeSP } from '@/lib/reco-api';
import {
  GuaranteeStatusData, GuaranteeStatusSummary,
  WeekGuaranteeData, GuaranteeStatus,
} from '@/types/dashboard';
import { formatMonthName } from '@/lib/utils/formatters';

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

    console.log(`[GARANTIAS-ESTATUS] EXEC sp_Estatus_Garantia ${year}, ${idEmpresa}`);

    const result = await executeSP(
      'sp_Estatus_Garantia',
      { Year: year, IdEmpresa: idEmpresa },
      { useCache: true, retries: 1 }
    );

    if (!result.success || !result.data) {
      console.warn('[GARANTIAS-ESTATUS] Sin datos:', result.error);
      const empty: GuaranteeStatusData = { summary: [], weeks: [], chartData: [] };
      return NextResponse.json(empty);
    }

    const rawData: any[] = result.data;
    console.log(`[GARANTIAS-ESTATUS] ${rawData.length} filas del SP`);

    // Agrupar por MES (el SP devuelve MES numérico 1-12)
    const today = new Date();
    const maxMonth = year < today.getFullYear() ? 12 : today.getMonth() + 1;

    const monthMap = new Map<number, {
      scheduled: number; naviera: number; operation: number; recovered: number;
    }>();
    for (let m = 1; m <= maxMonth; m++) {
      monthMap.set(m, { scheduled: 0, naviera: 0, operation: 0, recovered: 0 });
    }

    rawData.forEach((row) => {
      const mes: number = row.MES ?? row.Mes ?? row.mes ?? 0;
      if (mes < 1 || mes > maxMonth) return;

      const estatus: string = (row.Estatus ?? row.estatus ?? '').toString();
      const importe: number  = row.ImporteMN ?? row.importemn ?? 0;

      const entry = monthMap.get(mes)!;
      if (estatus === 'Programadas')      entry.scheduled += importe;
      else if (estatus === 'Naviera')     entry.naviera   += importe;
      else if (estatus === 'Operación' || estatus === 'Operacion') entry.operation += importe;
      else if (estatus === 'Recuperadas') entry.recovered += importe;
    });

    // Construir semanas (meses) ordenados — la UI consume el tipo WeekGuaranteeData
    const weeks: WeekGuaranteeData[] = Array.from(monthMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([mes, data]) => ({
        weekNumber: mes,
        weekLabel:  formatMonthName(mes),
        scheduled:  Math.round(data.scheduled * 100) / 100,
        naviera:    Math.round(data.naviera   * 100) / 100,
        operation:  Math.round(data.operation * 100) / 100,
        recovered:  Math.round(data.recovered * 100) / 100,
        total:      Math.round((data.scheduled + data.naviera + data.operation + data.recovered) * 100) / 100,
      }));

    // Totales por estatus
    const totalScheduled = weeks.reduce((s, w) => s + w.scheduled, 0);
    const totalNaviera   = weeks.reduce((s, w) => s + w.naviera,   0);
    const totalOperation = weeks.reduce((s, w) => s + w.operation, 0);
    const totalRecovered = weeks.reduce((s, w) => s + w.recovered, 0);
    const grandTotal     = totalScheduled + totalNaviera + totalOperation + totalRecovered;

    const pct = (v: number) => grandTotal > 0 ? Math.round((v / grandTotal) * 10000) / 100 : 0;

    const summary: GuaranteeStatusSummary[] = [
      { status: 'Programadas' as GuaranteeStatus, amount: Math.round(totalScheduled * 100) / 100, percentage: pct(totalScheduled) },
      { status: 'Naviera'     as GuaranteeStatus, amount: Math.round(totalNaviera   * 100) / 100, percentage: pct(totalNaviera)   },
      { status: 'Operación'   as GuaranteeStatus, amount: Math.round(totalOperation * 100) / 100, percentage: pct(totalOperation) },
      { status: 'Recuperadas' as GuaranteeStatus, amount: Math.round(totalRecovered * 100) / 100, percentage: pct(totalRecovered) },
    ];

    const response: GuaranteeStatusData = { summary, weeks, chartData: weeks };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error en /api/garantias/estatus:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
