// app/api/garantias/antiguedad/route.ts
// API Route para Antigüedad de Cartera Garantías
// GET /api/garantias/antiguedad?fechaCorte=2026-05-31&idEmpresa=1
// Fuente: EXEC dbo.[sp_Antiguedad_cartera_garantias] @dFechaCorte, @IdEmpresa
// SP devuelve por Sucursal+Proveedor: [01-30], [31-60], [61-90], [91-120], [121-500 Dias], Saldo

import { NextRequest, NextResponse } from 'next/server';
import { executeSP } from '@/lib/reco-api';
import { getMexicoDateString } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

const AGING_COLORS: Record<string, string> = {
  '1-30':     '#FFEB3B', // amarillo
  '31-60':    '#4CAF50', // verde
  '61-90':    '#2196F3', // azul
  '91-120':   '#F44336', // rojo
  '121-5000': '#B71C1C', // rojo oscuro
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idEmpresa = parseInt(searchParams.get('idEmpresa') || '1');
    const fechaCorte = searchParams.get('fechaCorte') || getMexicoDateString();

    console.log(`[GARANTIAS-ANTIGUEDAD] EXEC sp_Antiguedad_cartera_garantias @dFechaCorte='${fechaCorte}', @IdEmpresa=${idEmpresa}`);

    const result = await executeSP(
      'sp_Antiguedad_cartera_garantias',
      { dFechaCorte: fechaCorte, IdEmpresa: idEmpresa },
      { useCache: false, retries: 2 }
    );

    if (!result.success || !result.data) {
      console.error('[GARANTIAS-ANTIGUEDAD] Error del SP:', result.error);
      return NextResponse.json({ error: 'Error al consultar antigüedad de garantías' }, { status: 500 });
    }

    const rows: any[] = result.data;
    console.log(`[GARANTIAS-ANTIGUEDAD] ${rows.length} filas del SP`);

    // Sumar rangos de todas las filas (Sucursal+Proveedor) para obtener totales globales
    const buckets: Record<string, { amount: number; count: number }> = {
      '1-30':     { amount: 0, count: 0 },
      '31-60':    { amount: 0, count: 0 },
      '61-90':    { amount: 0, count: 0 },
      '91-120':   { amount: 0, count: 0 },
      '121-5000': { amount: 0, count: 0 },
    };

    // Total = SUM(Saldo) del SP (idéntico a Postman/Excel).
    // Incluye filas con DiasTranscurridos < 1 y notas de crédito negativas
    // que los buckets NO cuentan. Por eso totalAmount != suma de buckets.
    let totalAmount = 0;

    rows.forEach((row) => {
      const r0130   = row['01-30']        ?? row['0130']        ?? 0;
      const r3160   = row['31-60']        ?? row['3160']        ?? 0;
      const r6190   = row['61-90']        ?? row['6190']        ?? 0;
      const r91120  = row['91-120']       ?? row['91120']       ?? 0;
      const r121    = row['121-500 Dias'] ?? row['121500Dias']  ?? row['121-5000'] ?? 0;
      const saldo   = row['Saldo']        ?? row['saldo']       ?? 0;

      totalAmount += saldo;

      buckets['1-30'].amount     += r0130;
      if (r0130 > 0)              buckets['1-30'].count++;

      buckets['31-60'].amount    += r3160;
      if (r3160 > 0)            buckets['31-60'].count++;

      buckets['61-90'].amount    += r6190;
      if (r6190 > 0)            buckets['61-90'].count++;

      buckets['91-120'].amount   += r91120;
      if (r91120 > 0)           buckets['91-120'].count++;

      buckets['121-5000'].amount += r121;
      if (r121 > 0)             buckets['121-5000'].count++;
    });

    const bucketsSum = Object.values(buckets).reduce((s, b) => s + b.amount, 0);

    // % sobre bucketsSum para que sumen 100% (totalAmount = SUM(Saldo) puede diferir)
    const chartData = Object.entries(buckets).map(([range, b]) => ({
      range,
      amount: Math.round(b.amount * 100) / 100,
      count: b.count,
      percentage: bucketsSum > 0 ? Math.round((b.amount / bucketsSum) * 10000) / 100 : 0,
      color: AGING_COLORS[range],
    }));

    return NextResponse.json({
      chartData,
      totalAmount: Math.round(totalAmount * 100) / 100,
      fechaCorte,
    });
  } catch (error) {
    console.error('Error en /api/garantias/antiguedad:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
