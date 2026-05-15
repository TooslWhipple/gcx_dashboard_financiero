// app/api/antiguedad-cartera/route.ts
// API Route para US-002: Antigüedad de Cartera con rangos exactos
// GET /api/antiguedad-cartera?fechaCorte=2024-01-31&idEmpresa=1
// Fuente: Query directa con CTEs de MovimientosSaldo (reemplaza sp_Antiguedad_cartera)
// Query devuelve (por cliente): B(Nombre), C(RFC), Vigente, [01-30], [31-60],
//   [61-90], [91-120], [121-500 Dias], CO(Total), NombreSucursal

import { NextRequest, NextResponse } from 'next/server';
import { executeSP, executeQueryWithRetry } from '@/lib/reco-api';
import { AgingData, AgingBucket, AgingDetail, AgingRange } from '@/types/dashboard';
import { agingRiskColors } from '@/lib/utils/colors';
import { getMexicoDateString } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

// Rangos que expone la query — coinciden con las columnas que devuelve
const AGING_RANGES: { range: AgingRange; col: string }[] = [
  { range: 'Vigente',  col: 'Vigente' },
  { range: '1-30',     col: '01-30' },
  { range: '31-60',    col: '31-60' },
  { range: '61-90',    col: '61-90' },
  { range: '91-120',   col: '91-120' },
  { range: '121-5000', col: '121-500 Dias' },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaCorte = searchParams.get('fechaCorte') || getMexicoDateString();
    const idEmpresa = parseInt(searchParams.get('idEmpresa') || '1');

    if (!fechaCorte || isNaN(idEmpresa)) {
      return NextResponse.json(
        { error: 'Parámetros inválidos. Se requiere fechaCorte (YYYY-MM-DD) y idEmpresa.' },
        { status: 400 }
      );
    }

    // Ejecutar SP original (igual que Postman) — sin caché para datos frescos
    // Usamos executeQueryWithRetry con un comentario que incluye timestamp
    // para invalidar la caché del API RECO (que cachea por string exacto de query).
    const now = new Date();
    const tsComment = `/*ts:${now.toISOString().slice(0,16)}*/`; // truncado a minutos
    const query = `${tsComment}EXEC dbo.sp_Antiguedad_cartera @FechaCorte='${fechaCorte}', @IdEmpresa=${idEmpresa}`;
    console.log(`[ANTIGUEDAD-CARTERA] ${query.substring(0, 150)}`);
    const result = await executeQueryWithRetry(query, { useCache: false, retries: 2 });

    if (!result.success || !result.data) {
      console.error('[ANTIGUEDAD-CARTERA] Error de la query:', result.error);

      // Fallback vacío para no romper la UI
      const fallbackResponse: AgingData = {
        chartData: AGING_RANGES.map(({ range }) => {
          const config = agingRiskColors[range];
          return { range, amount: 0, percentage: 0, color: config.fill, riskLevel: config.risk };
        }),
        tableData: [],
        summary: { totalAmount: 0, totalClients: 0, averageDays: 0 },
      };
      return NextResponse.json(fallbackResponse);
    }

    // Normalizar: si result.data es array de arrays (múltiples recordsets), aplanar
    let rows: any[] = result.data;
    if (Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0])) {
      rows = rows.flat();
    }

    console.log(`[ANTIGUEDAD-CARTERA] ${rows.length} clientes recibidos de la query`);

    // ─── Gráfica por rangos ─────────────────────────────────────────────────
    // Sumar todas las filas (clientes) por rango
    const rangeTotals: Record<string, number> = {
      'Vigente': 0, '01-30': 0, '31-60': 0, '61-90': 0, '91-120': 0, '121-500 Dias': 0,
    };
    let grandTotal = 0;

    rows.forEach((row: any) => {
      rangeTotals['Vigente']       += row['Vigente']       ?? row['vigente']       ?? 0;
      rangeTotals['01-30']         += row['01-30']         ?? row['0130']         ?? 0;
      rangeTotals['31-60']         += row['31-60']         ?? row['3160']         ?? 0;
      rangeTotals['61-90']         += row['61-90']         ?? row['6190']         ?? 0;
      rangeTotals['91-120']        += row['91-120']        ?? row['91120']        ?? 0;
      rangeTotals['121-500 Dias']  += row['121-500 Dias']  ?? row['121500Dias']   ?? 0;
      grandTotal                   += row['CO']            ?? row['co']           ?? 0;
    });

    // Logging detallado para diagnóstico de discrepancias
    const bucketSums = AGING_RANGES.map(({ col }) => rangeTotals[col] ?? 0);
    const sumOfBuckets = bucketSums.reduce((a, b) => a + b, 0);
    console.log('[ANTIGUEDAD-CARTERA] Suma buckets:', {
      Vigente: rangeTotals['Vigente'],
      '01-30': rangeTotals['01-30'],
      '31-60': rangeTotals['31-60'],
      '61-90': rangeTotals['61-90'],
      '91-120': rangeTotals['91-120'],
      '121-500 Dias': rangeTotals['121-500 Dias'],
      sumOfBuckets,
      grandTotal,
      diff: Math.abs(sumOfBuckets - grandTotal),
    });

    const chartData: AgingBucket[] = AGING_RANGES.map(({ range, col }) => {
      const amount = rangeTotals[col] ?? 0;
      const percentage = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
      const config = agingRiskColors[range];
      return {
        range,
        amount: Math.round(amount * 100) / 100,
        percentage: Math.round(percentage * 100) / 100,
        color: config.fill,
        riskLevel: config.risk,
      };
    });

    // ─── Tabla por cliente ──────────────────────────────────────────────────
    const tableData: AgingDetail[] = rows
      .map((row: any): AgingDetail => ({
        clientName: (row['B'] ?? row['Nombre'] ?? row['b'] ?? '').toString().trim() || 'Sin Nombre',
        rfc:        (row['C'] ?? row['RFC']    ?? row['c'] ?? '').toString().trim() || 'Sin RFC',
        vigente:     Math.round((row['Vigente']      ?? row['vigente'] ?? 0) * 100) / 100,
        range1to30:  Math.round((row['01-30']        ?? 0) * 100) / 100,
        range31to60: Math.round((row['31-60']        ?? 0) * 100) / 100,
        range61to90: Math.round((row['61-90']        ?? 0) * 100) / 100,
        range91to120:Math.round((row['91-120']       ?? 0) * 100) / 100,
        range121plus:Math.round((row['121-500 Dias'] ?? 0) * 100) / 100,
        total:       Math.round((row['CO']           ?? 0) * 100) / 100,
        branch:      (row['NombreSucursal'] ?? row['nombresucursal'] ?? '').toString().trim(),
      }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    // ─── Resumen ────────────────────────────────────────────────────────────
    const summary = {
      totalAmount:  Math.round(grandTotal * 100) / 100,
      totalClients: rows.length,
      averageDays:  0, // La query no devuelve días promedio directamente
    };

    const response: AgingData = { chartData, tableData, summary };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error en /api/antiguedad-cartera:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
