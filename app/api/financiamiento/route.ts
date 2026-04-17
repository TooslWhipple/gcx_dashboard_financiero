// app/api/financiamiento/route.ts
// API Route para US-004: Tendencia Financiamiento CxC DAC
// GET /api/financiamiento?year=2026&idEmpresa=1
// Fuente: EXEC dbo.[sp_Tendencia_Financiamiento] @Year, @IdEmpresa
// SP devuelve: Unidad, Oficina, FinanciadoPTE, FinanciadoFAC, MES

import { NextRequest, NextResponse } from 'next/server';
import { executeSP } from '@/lib/reco-api';
import { FinancingTrendData, MonthFinancingData, FinancingDetail } from '@/types/dashboard';
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

    console.log(`[FINANCIAMIENTO] EXEC sp_Tendencia_Financiamiento ${year}, ${idEmpresa}`);

    const result = await executeSP(
      'sp_Tendencia_Financiamiento',
      { Year: year, IdEmpresa: idEmpresa },
      { useCache: true, retries: 2 }
    );

    const rows: any[] = result.success ? (result.data || []) : [];
    console.log(`[FINANCIAMIENTO] ${rows.length} filas recibidas del SP`);

    if (rows.length > 0) {
      console.log(`[FINANCIAMIENTO] Keys fila 0:`, Object.keys(rows[0]));
    }

    // Inicializar meses 1-12
    const today = new Date();
    const maxMonth = year < today.getFullYear() ? 12 : today.getMonth() + 1;
    const monthMap = new Map<number, { pending: number; invoiced: number }>();
    for (let m = 1; m <= maxMonth; m++) {
      monthMap.set(m, { pending: 0, invoiced: 0 });
    }

    // Tabla de detalle por Unidad+Oficina (agrupación cross-mes)
    const detailMap = new Map<string, FinancingDetail>();

    for (const row of rows) {
      const mes: number = row.MES ?? row.Mes ?? row.mes ?? 0;
      if (mes < 1 || mes > maxMonth) continue;

      const pte = Math.abs(row.FinanciadoPTE ?? row.financiadopte ?? row.FINANCIADOPTE ?? 0);
      const fac = Math.abs(row.FinanciadoFAC ?? row.financiadofac ?? row.FINANCIADOFAC ?? 0);
      const unit   = (row.Unidad ?? row.unidad ?? 'General').toString().trim();
      const office = (row.Oficina ?? row.oficina ?? 'Sin Oficina').toString().trim();

      // Acumular por mes
      const bucket = monthMap.get(mes)!;
      bucket.pending  += pte;
      bucket.invoiced += fac;

      // Acumular detalle por unidad+oficina
      const key = `${unit}|${office}`;
      const existing = detailMap.get(key);
      if (existing) {
        existing.pendingInvoice += pte;
        existing.invoiced       += fac;
      } else {
        detailMap.set(key, { unit, office, pendingInvoice: pte, invoiced: fac, month: 0 });
      }
    }

    // Construir array de meses
    const months: MonthFinancingData[] = [];
    for (let m = 1; m <= maxMonth; m++) {
      const b = monthMap.get(m)!;
      months.push({
        month:          m,
        monthName:      formatMonthName(m),
        pendingInvoice: Math.round(b.pending  * 100) / 100,
        invoiced:       Math.round(b.invoiced * 100) / 100,
        paymentsMade:   0,
        total:          Math.round((b.pending + b.invoiced) * 100) / 100,
      });
    }

    // Redondear detalle
    const tableData: FinancingDetail[] = Array.from(detailMap.values()).map(d => ({
      ...d,
      pendingInvoice: Math.round(d.pendingInvoice * 100) / 100,
      invoiced:       Math.round(d.invoiced       * 100) / 100,
    }));

    const response: FinancingTrendData = {
      months,
      tableData,
      filters: { offices: [], units: [] },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error en /api/financiamiento:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
