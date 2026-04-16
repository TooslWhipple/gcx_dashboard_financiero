// app/api/facturacion/route.ts
// API Route para US-008: Facturación DAC (Honorarios vs Complementarios)
// GET /api/facturacion?year=2026&idEmpresa=1&view=mensual|semanal
//
// Vista MENSUAL: EXEC dbo.[sp_Facturacion] @Year, @IdEmpresa
//   SP devuelve: Unidad, Oficina, Honorarios, OtrosIngresos, Total,
//                PagosHechos, Anticipos, TotalCGA, MES
//
// Vista SEMANAL: Query directa a fn_Facturacion agrupada por semana
//   Devuelve: Unidad, Oficina, Honorarios, Complementarios, PagosHechos, Semana
//
// Regla de negocio #4: Yuri quiere honorarios por semana Y por mes

import { NextRequest, NextResponse } from 'next/server';
import { executeSP, executeQueryWithRetry } from '@/lib/reco-api';
import { BillingData, MonthBillingData, AduanaBilling } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

// ─── VISTA MENSUAL (SP D8) ─────────────────────────────────────────────────

async function getMensualData(year: number, idEmpresa: number) {
  console.log(`[FACTURACION-MENSUAL] EXEC sp_Facturacion ${year}, ${idEmpresa}`);

  const result = await executeSP(
    'sp_Facturacion',
    { Year: year, IdEmpresa: idEmpresa },
    { useCache: true, retries: 2 }
  );

  const rows: any[] = result.success ? (result.data || []) : [];
  console.log(`[FACTURACION-MENSUAL] ${rows.length} filas del SP`);

  const today = new Date();
  const maxMonth = year < today.getFullYear() ? 12 : today.getMonth() + 1;

  // Map mes → totales consolidados
  const mesMap = new Map<number, { honorarios: number; otros: number; total: number; pagosHechos: number }>();
  for (let m = 1; m <= maxMonth; m++) {
    mesMap.set(m, { honorarios: 0, otros: 0, total: 0, pagosHechos: 0 });
  }

  // Map aduana → mes → totales
  const aduanaMap = new Map<string, Map<number, { honorarios: number; otros: number; total: number }>>();

  rows.forEach((row: any) => {
    const mes: number = row.MES ?? row.Mes ?? row.mes ?? 0;
    if (mes < 1 || mes > maxMonth) return;

    const hon     = Math.abs(row.Honorarios    ?? row.honorarios    ?? 0);
    const otros   = Math.abs(row.OtrosIngresos ?? row.otrosingresos ?? 0);
    const total   = Math.abs(row.Total         ?? row.total         ?? 0);
    const pagos   = Math.abs(row.PagosHechos   ?? row.pagoshechos   ?? 0);
    const oficina = (row.Oficina ?? row.oficina ?? 'Sin Oficina').toString().trim();

    // Acumular por mes
    const b = mesMap.get(mes)!;
    b.honorarios += hon;
    b.otros      += otros;
    b.total      += total;
    b.pagosHechos+= pagos;

    // Acumular por aduana
    if (!aduanaMap.has(oficina)) aduanaMap.set(oficina, new Map());
    const am = aduanaMap.get(oficina)!;
    const ab = am.get(mes) ?? { honorarios: 0, otros: 0, total: 0 };
    ab.honorarios += hon;
    ab.otros      += otros;
    ab.total      += total;
    am.set(mes, ab);
  });

  // Construir MonthBillingData[]
  const monthlyData: MonthBillingData[] = [];
  for (let m = 1; m <= maxMonth; m++) {
    const b = mesMap.get(m)!;
    monthlyData.push({
      month:      m,
      monthName:  new Date(year, m - 1).toLocaleString('es-MX', { month: 'short' }),
      honorarios: Math.round(b.honorarios * 100) / 100,
      otros:      Math.round(b.otros      * 100) / 100,
      total:      Math.round(b.total      * 100) / 100,
    });
  }

  const totalHonorarios = monthlyData.reduce((s, w) => s + w.honorarios, 0);
  const totalOtros      = monthlyData.reduce((s, w) => s + w.otros,      0);
  const totalGeneral    = monthlyData.reduce((s, w) => s + w.total,       0);
  const nonZero         = monthlyData.filter(w => w.total > 0);
  const avgGeneral      = nonZero.length > 0 ? totalGeneral / nonZero.length : 0;

  const aduanas: AduanaBilling[] = [
    {
      id:   'all',
      name: 'Todas las Aduanas',
      monthlyData,
      average:        Math.round(avgGeneral      * 100) / 100,
      totalHonorarios:Math.round(totalHonorarios * 100) / 100,
      totalOtros:     Math.round(totalOtros      * 100) / 100,
    },
  ];

  for (const [oficina, mMap] of Array.from(aduanaMap.entries()).sort()) {
    const aduanaMensual: MonthBillingData[] = [];
    for (let m = 1; m <= maxMonth; m++) {
      const ab = mMap.get(m) ?? { honorarios: 0, otros: 0, total: 0 };
      aduanaMensual.push({
        month:      m,
        monthName:  new Date(year, m - 1).toLocaleString('es-MX', { month: 'short' }),
        honorarios: Math.round(ab.honorarios * 100) / 100,
        otros:      Math.round(ab.otros      * 100) / 100,
        total:      Math.round(ab.total      * 100) / 100,
      });
    }
    const totH  = aduanaMensual.reduce((s, w) => s + w.honorarios, 0);
    const totO  = aduanaMensual.reduce((s, w) => s + w.otros,      0);
    const nz    = aduanaMensual.filter(w => w.total > 0);
    aduanas.push({
      id:   oficina,
      name: oficina,
      monthlyData: aduanaMensual,
      average:        nz.length > 0 ? Math.round((totH + totO) / nz.length * 100) / 100 : 0,
      totalHonorarios:Math.round(totH * 100) / 100,
      totalOtros:     Math.round(totO * 100) / 100,
    });
  }

  return { aduanas, months: monthlyData.map(w => w.monthName) };
}

// ─── VISTA SEMANAL (query directa a fn_Facturacion) ───────────────────────

async function getSemanalData(year: number, idEmpresa: number) {
  // fn_Facturacion(@FechaIni, @FechaFin, @IdEmpresa)
  // Columnas útiles: Unidad, Oficina, Honorarios_ImpMB, Complementarios_ImpMB,
  //                  TotalMB, PagosHechosMB, TotalFacturaME
  const fechaIni = `${year}-01-01`;
  const fechaFin = `${year}-12-31`;

  const query = `
    SELECT
      Unidad,
      Oficina,
      DATEPART(WEEK, FechaFactura) AS Semana,
      SUM(Honorarios_ImpMB)      AS Honorarios,
      SUM(Complementarios_ImpMB) AS OtrosIngresos,
      SUM(TotalMB)               AS Total,
      SUM(PagosHechosMB)         AS PagosHechos
    FROM dbo.fn_Facturacion('${fechaIni}', '${fechaFin}', ${idEmpresa})
    GROUP BY Unidad, Oficina, DATEPART(WEEK, FechaFactura)
    ORDER BY Semana, Oficina
  `;

  console.log(`[FACTURACION-SEMANAL] Query fn_Facturacion ${year}, agrupada por semana`);
  const result = await executeQueryWithRetry(query, { useCache: true, retries: 2 });
  const rows: any[] = result.success ? (result.data || []) : [];
  console.log(`[FACTURACION-SEMANAL] ${rows.length} filas`);

  // Agrupar por semana (global)
  const weekMap = new Map<number, { honorarios: number; otros: number; total: number }>();
  const aduanaWeekMap = new Map<string, Map<number, { honorarios: number; otros: number; total: number }>>();

  rows.forEach((row: any) => {
    const semana    = row.Semana    ?? row.semana    ?? 0;
    const hon       = Math.abs(row.Honorarios    ?? 0);
    const otros     = Math.abs(row.OtrosIngresos ?? 0);
    const total     = Math.abs(row.Total         ?? 0);
    const oficina   = (row.Oficina  ?? 'Sin Oficina').toString().trim();

    const wk = weekMap.get(semana) ?? { honorarios: 0, otros: 0, total: 0 };
    wk.honorarios += hon;
    wk.otros      += otros;
    wk.total      += total;
    weekMap.set(semana, wk);

    if (oficina) {
      if (!aduanaWeekMap.has(oficina)) aduanaWeekMap.set(oficina, new Map());
      const awMap = aduanaWeekMap.get(oficina)!;
      const awk = awMap.get(semana) ?? { honorarios: 0, otros: 0, total: 0 };
      awk.honorarios += hon;
      awk.otros      += otros;
      awk.total      += total;
      awMap.set(semana, awk);
    }
  });

  const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[0] - b[0]);

  const weeklyData: MonthBillingData[] = sortedWeeks.map(([semana, data]) => ({
    month:      semana,
    monthName:  `Sem.${String(semana).padStart(2, '0')}`,
    honorarios: Math.round(data.honorarios * 100) / 100,
    otros:      Math.round(data.otros      * 100) / 100,
    total:      Math.round(data.total      * 100) / 100,
  }));

  const totH  = weeklyData.reduce((s, w) => s + w.honorarios, 0);
  const totO  = weeklyData.reduce((s, w) => s + w.otros,      0);
  const totG  = weeklyData.reduce((s, w) => s + w.total,       0);
  const nzWk  = weeklyData.filter(w => w.total > 0);
  const avgG  = nzWk.length > 0 ? totG / nzWk.length : 0;

  const aduanas: AduanaBilling[] = [
    {
      id:   'all',
      name: 'Todas las Aduanas',
      monthlyData: weeklyData,
      average:        Math.round(avgG * 100) / 100,
      totalHonorarios:Math.round(totH * 100) / 100,
      totalOtros:     Math.round(totO * 100) / 100,
    },
  ];

  for (const [oficina, wMap] of Array.from(aduanaWeekMap.entries()).sort()) {
    const aduanaSemanal: MonthBillingData[] = sortedWeeks.map(([semana]) => {
      const ab = wMap.get(semana) ?? { honorarios: 0, otros: 0, total: 0 };
      return {
        month:      semana,
        monthName:  `Sem.${String(semana).padStart(2, '0')}`,
        honorarios: Math.round(ab.honorarios * 100) / 100,
        otros:      Math.round(ab.otros      * 100) / 100,
        total:      Math.round(ab.total      * 100) / 100,
      };
    });
    const tH  = aduanaSemanal.reduce((s, w) => s + w.honorarios, 0);
    const tO  = aduanaSemanal.reduce((s, w) => s + w.otros,      0);
    const nz  = aduanaSemanal.filter(w => w.total > 0);
    aduanas.push({
      id:   oficina,
      name: oficina,
      monthlyData: aduanaSemanal,
      average:        nz.length > 0 ? Math.round((tH + tO) / nz.length * 100) / 100 : 0,
      totalHonorarios:Math.round(tH * 100) / 100,
      totalOtros:     Math.round(tO * 100) / 100,
    });
  }

  return { aduanas, months: weeklyData.map(w => w.monthName) };
}

// ─── HANDLER PRINCIPAL ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year        = parseInt(searchParams.get('year')       || new Date().getFullYear().toString());
    const idEmpresa   = parseInt(searchParams.get('idEmpresa')  || '1');
    const view        = searchParams.get('view') || 'semanal'; // 'semanal' | 'mensual'

    if (isNaN(year) || isNaN(idEmpresa)) {
      return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 });
    }

    let response: BillingData;

    if (view === 'mensual') {
      const data = await getMensualData(year, idEmpresa);
      response = data as BillingData;
    } else {
      const data = await getSemanalData(year, idEmpresa);
      response = data as BillingData;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error en /api/facturacion:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
