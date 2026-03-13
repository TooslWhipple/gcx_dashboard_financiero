// app/api/financiamiento/route.ts
// API Route para US-004: Tendencia Financiamiento CxC DAC
// GET /api/financiamiento?year=2026&idEmpresa=1

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryWithRetry } from '@/lib/reco-api';
import { FinancingTrendData, MonthFinancingData, FinancingDetail, Office, Unit } from '@/types/dashboard';
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

    // Consultas por mes para financiamiento - limitado a 6 meses
    const months: MonthFinancingData[] = [];
    const tableDetails: FinancingDetail[] = [];
    const MAX_MONTHS = 6;

    for (let month = 1; month <= MAX_MONTHS; month++) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

      // AVG + GROUP BY elimina duplicados del FULL OUTER JOIN en la función
      const query = `
        SELECT 
          Unidad,
          Oficina,
          AVG(PagosFinanciadosPendiente) AS PagosFinanciadosPendiente,
          AVG(PagosFinanciadosFacturado) AS PagosFinanciadosFacturado
        FROM dbo.fn_Tendencia_Financiamiento('${startDate}', '${endDate}', ${idEmpresa})
        GROUP BY Unidad, Oficina
      `;

      try {
        const result = await executeQueryWithRetry(query, { useCache: true, retries: 1 });
        const monthData = result.success ? (result.data || []) : [];

        // Debug: ver qué devuelve RECO
        if (month === 1 && monthData.length > 0) {
          console.log(`[FINANCIAMIENTO] Mes ${month}: ${monthData.length} filas`);
          console.log(`[FINANCIAMIENTO] Keys fila 0:`, Object.keys(monthData[0]));
          console.log(`[FINANCIAMIENTO] Fila 0:`, JSON.stringify(monthData[0]));
        }

        // Sumar por oficina - usar Math.abs() por cada fila individual
        let totalPending = 0;
        let totalInvoiced = 0;

        monthData.forEach((item: any) => {
          // Detectar nombre de columna (RECO puede devolver case diferente)
          const pte = item.PagosFinanciadosPendiente ?? item.pagosfinanciadospendiente ?? item.PAGOSFINANCIADOSPENDIENTE ?? 0;
          const fac = item.PagosFinanciadosFacturado ?? item.pagosfinanciadosfacturado ?? item.PAGOSFINANCIADOSFACTURADO ?? 0;
          
          totalPending += Math.abs(pte);
          totalInvoiced += Math.abs(fac);

          const unit = (item.Unidad || item.unidad || item.UNIDAD || 'General').toString().trim();
          const office = (item.Oficina || item.oficina || item.OFICINA || 'Sin Oficina').toString().trim();

          tableDetails.push({
            unit,
            office,
            pendingInvoice: Math.round(Math.abs(pte) * 100) / 100,
            invoiced: Math.round(Math.abs(fac) * 100) / 100,
            month,
          });
        });

        months.push({
          month,
          monthName: formatMonthName(month),
          pendingInvoice: Math.round(totalPending * 100) / 100,
          invoiced: Math.round(totalInvoiced * 100) / 100,
          paymentsMade: 0, // TODO: US-004 mapear este valor desde RECO
          total: Math.round((totalPending + totalInvoiced) * 100) / 100,
        });
      } catch (error) {
        console.error(`[FINANCIAMIENTO] Error mes ${month}:`, error);
        months.push({
          month,
          monthName: formatMonthName(month),
          pendingInvoice: 0,
          invoiced: 0,
          paymentsMade: 0,
          total: 0,
        });
      }

      // Pausa entre queries
      if (month < MAX_MONTHS) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Agrupar detalle por Unidad+Oficina (sumar todos los meses)
    const grouped = new Map<string, FinancingDetail>();
    tableDetails.forEach((d) => {
      const key = `${d.unit.trim()}|${d.office.trim()}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.pendingInvoice += d.pendingInvoice;
        existing.invoiced += d.invoiced;
      } else {
        grouped.set(key, { ...d });
      }
    });
    const aggregatedDetails = Array.from(grouped.values()).map(d => ({
      ...d,
      pendingInvoice: Math.round(d.pendingInvoice * 100) / 100,
      invoiced: Math.round(d.invoiced * 100) / 100,
      month: 0,
    }));

    const response: FinancingTrendData = {
      months,
      tableData: aggregatedDetails,
      filters: {
        offices: [],
        units: [],
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error en /api/financiamiento:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
