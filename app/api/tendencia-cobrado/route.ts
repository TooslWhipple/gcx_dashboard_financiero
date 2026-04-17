// app/api/tendencia-cobrado/route.ts
// API Route para US-001: Tendencia Cobrado con comparativo año pasado
// GET /api/tendencia-cobrado?year=2026&idEmpresa=1
// Fuente: Query directa con CROSS APPLY a fn_CGA_Cobrados (reemplaza sp_Tendencia_Cobrado)
// Query devuelve: nIdCtaGastos15, nIdEmp11, nIdSuc12, Sucursal, Factura,
//                 FechaFactura, ClaveCliente, RFCCliente, Cliente,
//                 ClaveClienteFacturarA, RFCClienteFacturarA, ClienteFacturarA,
//                 FechaPago, GastosME_Cob, IngresosME_Cob, TotalCobrado

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryWithRetry } from '@/lib/reco-api';
import { CollectionTrendData, MonthlyCollectionData } from '@/types/dashboard';
import { formatMonthName } from '@/lib/utils/formatters';
import { buildTendenciaCobradoQuery } from '@/lib/queries/tendencia-cobrado';

export const dynamic = 'force-dynamic';

/**
 * Agrega filas de la query por mes usando FechaPago.
 */
function buildMonthlyTrend(rows: any[], year: number): MonthlyCollectionData[] {
  const maxMonth = 12; // Siempre devolvemos los 12 meses para que la gráfica pinte todo el eje X
  const today = new Date();
  const isCurrentYear = year === today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // Inicializar todos los meses en 0
  const monthMap = new Map<number, { totalCollected: number; invoiceCount: number }>();
  for (let m = 1; m <= maxMonth; m++) {
    monthMap.set(m, { totalCollected: 0, invoiceCount: 0 });
  }

  for (const row of rows) {
    const fechaPago: string = row.FechaPago || row.fechapago || '';
    if (!fechaPago) continue;
    const mes = new Date(fechaPago).getMonth() + 1; // 1-based
    
    // Ignorar datos futuros (ej. si hay errores en la BD con pagos en diciembre 2026 pero estamos en abril)
    if (isCurrentYear && mes > currentMonth) continue;
    
    if (mes < 1 || mes > maxMonth) continue;

    const total = (row.TotalCobrado ?? row.totalcobrado ?? 0) as number;
    const bucket = monthMap.get(mes)!;
    bucket.totalCollected += total;
    bucket.invoiceCount += 1;
  }

  const result: MonthlyCollectionData[] = [];
  for (let m = 1; m <= maxMonth; m++) {
    const b = monthMap.get(m)!;
    result.push({
      month: m,
      monthName: formatMonthName(m),
      totalCollected: Math.round(b.totalCollected * 100) / 100,
      invoiceCount: b.invoiceCount,
      year,
    });
  }
  return result;
}

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

    // Construir queries directas (reemplaza EXEC sp_Tendencia_Cobrado)
    const currentQuery = buildTendenciaCobradoQuery(year, idEmpresa);
    const previousQuery = buildTendenciaCobradoQuery(year - 1, idEmpresa);

    console.log(`[TENDENCIA-COBRADO] Query directa año ${year}, empresa ${idEmpresa}`);
    console.log(`[TENDENCIA-COBRADO] Query directa año ${year - 1}, empresa ${idEmpresa}`);

    // Dos llamadas paralelas: año actual y año anterior
    const [currentResult, previousResult] = await Promise.all([
      executeQueryWithRetry(currentQuery, { useCache: true, retries: 2 }),
      executeQueryWithRetry(previousQuery, { useCache: true, retries: 2 }),
    ]);

    const currentRows = currentResult.success ? (currentResult.data || []) : [];
    const previousRows = previousResult.success ? (previousResult.data || []) : [];

    console.log(`[TENDENCIA-COBRADO] Filas año ${year}: ${currentRows.length}, año ${year - 1}: ${previousRows.length}`);

    const currentYearData = buildMonthlyTrend(currentRows, year);
    const previousYearData = buildMonthlyTrend(previousRows, year - 1);

    const currentTotal = currentYearData.reduce((s, m) => s + m.totalCollected, 0);
    const previousTotal = previousYearData.reduce((s, m) => s + m.totalCollected, 0);
    console.log(`[TENDENCIA-COBRADO] Total año actual: $${currentTotal}, año anterior: $${previousTotal}`);

    const response: CollectionTrendData = {
      currentYear: currentYearData,
      previousYear: previousYearData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error en /api/tendencia-cobrado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
