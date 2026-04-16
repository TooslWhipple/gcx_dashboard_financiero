// app/api/tendencia-cobrado/route.ts
// API Route para US-001: Tendencia Cobrado con comparativo año pasado
// GET /api/tendencia-cobrado?year=2026&idEmpresa=1
// Fuente: EXEC dbo.[sp_Tendencia_Cobrado] @Year, @IdEmpresa
// SP devuelve: nIdCtaGastos15, nIdEmp11, nIdSuc12, Sucursal, Factura,
//              FechaFactura, ClaveCliente, RFCCliente, Cliente,
//              ClaveClienteFacturarA, RFCClienteFacturarA, ClienteFacturarA,
//              FechaPago, GastosME_Cob, IngresosME_Cob, TotalCobrado

import { NextRequest, NextResponse } from 'next/server';
import { executeSP } from '@/lib/reco-api';
import { CollectionTrendData, MonthlyCollectionData } from '@/types/dashboard';
import { formatMonthName } from '@/lib/utils/formatters';

export const dynamic = 'force-dynamic';

/**
 * Agrega filas del SP por mes usando FechaPago.
 * Retorna array de 12 meses (o hasta el mes actual si es el año en curso).
 */
function buildMonthlyTrend(rows: any[], year: number): MonthlyCollectionData[] {
  const today = new Date();
  const isCurrentYear = year === today.getFullYear();
  const maxMonth = isCurrentYear ? today.getMonth() + 1 : 12;

  // Inicializar todos los meses en 0
  const monthMap = new Map<number, { totalCollected: number; invoiceCount: number }>();
  for (let m = 1; m <= maxMonth; m++) {
    monthMap.set(m, { totalCollected: 0, invoiceCount: 0 });
  }

  for (const row of rows) {
    const fechaPago: string = row.FechaPago || row.fechapago || '';
    if (!fechaPago) continue;
    const mes = new Date(fechaPago).getMonth() + 1; // 1-based
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

    console.log(`[TENDENCIA-COBRADO] EXEC sp_Tendencia_Cobrado ${year}, ${idEmpresa}`);
    console.log(`[TENDENCIA-COBRADO] EXEC sp_Tendencia_Cobrado ${year - 1}, ${idEmpresa}`);

    // Dos llamadas paralelas: año actual y año anterior
    const [currentResult, previousResult] = await Promise.all([
      executeSP('sp_Tendencia_Cobrado', { Year: year, IdEmpresa: idEmpresa }, { useCache: false, retries: 2 }),
      executeSP('sp_Tendencia_Cobrado', { Year: year - 1, IdEmpresa: idEmpresa }, { useCache: true, retries: 2 }),
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
