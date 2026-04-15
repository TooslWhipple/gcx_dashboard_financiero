// app/api/resumen-oficinas/route.ts
// API Route para US-006: Resumen Corporativo por Oficina
// GET /api/resumen-oficinas?fechaCorte=2024-01-31&idEmpresa=1
// Fuente: EXEC dbo.[sp_Resumen] @FechaCorte, @IdEmpresa
// SP devuelve por oficina: Unidad, Oficina, Fact(count), [01-30], [31-60],
//   [61-90], [91-120], [121-500 Dias], Total, [Saldo DAC], [Saldos Clientes],
//   Cobrado, Vencido

import { NextRequest, NextResponse } from 'next/server';
import { executeSP } from '@/lib/reco-api';
import { OfficeSummaryData, OfficeSummary } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaCorte = searchParams.get('fechaCorte') || new Date().toISOString().split('T')[0];
    const idEmpresa  = parseInt(searchParams.get('idEmpresa') || '1');

    if (!fechaCorte || isNaN(idEmpresa)) {
      return NextResponse.json(
        { error: 'Parámetros inválidos. Se requiere fechaCorte (YYYY-MM-DD) y idEmpresa.' },
        { status: 400 }
      );
    }

    console.log(`[RESUMEN-OFICINAS] EXEC sp_Resumen '${fechaCorte}', ${idEmpresa}`);

    const result = await executeSP(
      'sp_Resumen',
      [fechaCorte, idEmpresa],
      { useCache: true, retries: 2 }
    );

    if (!result.success || !result.data) {
      console.error('[RESUMEN-OFICINAS] Error del SP:', result.error);

      // Fallback vacío para no romper la UI
      const fallbackResponse: OfficeSummaryData = {
        offices: [],
        totals: {
          id: 'totals', name: 'TOTALES', invoiceCount: 0,
          range01to30: 0, range31to45: 0, range46to60: 0,
          range61to90: 0, range91plus: 0, total: 0,
          dacBalance: 0, clientBalance: 0, collected: 0, overdue: 0,
        },
      };
      return NextResponse.json(fallbackResponse);
    }

    const rows: any[] = result.data;
    console.log(`[RESUMEN-OFICINAS] ${rows.length} oficinas recibidas del SP`);

    // Mapear cada fila del SP a OfficeSummary
    const offices: OfficeSummary[] = rows
      .map((row: any, index: number): OfficeSummary => {
        // El SP devuelve columnas con nombres de alias exactos
        const r0130  = row['01-30']        ?? row['0130']        ?? 0;
        const r3160  = row['31-60']        ?? row['3160']        ?? 0;
        const r6190  = row['61-90']        ?? row['6190']        ?? 0;
        const r91120 = row['91-120']       ?? row['91120']       ?? 0;
        const r121p  = row['121-500 Dias'] ?? row['121500Dias']  ?? 0;
        const total  = row['Total']        ?? row['total']       ?? 0;
        const dac    = row['Saldo DAC']    ?? row['SaldoDAC']    ?? 0;
        const cli    = row['Saldos Clientes'] ?? row['SaldosClientes'] ?? 0;
        const cob    = row['Cobrado']      ?? row['cobrado']     ?? 0;
        const vec    = row['Vencido']      ?? row['vencido']     ?? 0;
        const fact   = row['Fact']         ?? row['fact']        ?? 0;

        const oficina = (row['Oficina'] ?? row['oficina'] ?? row['NombreSucursal'] ?? `Oficina ${index + 1}`).toString().trim();

        return {
          id:           `office-${index}`,
          name:         oficina,
          invoiceCount: typeof fact === 'number' ? fact : parseInt(String(fact)) || 0,
          range01to30:  Math.round(r0130  * 100) / 100,
          range31to45:  0, // SP no tiene este rango; se conserva para compatibilidad UI
          range46to60:  Math.round(r3160  * 100) / 100, // proxy 31-60 → 46-60
          range61to90:  Math.round(r6190  * 100) / 100,
          range91plus:  Math.round((r91120 + r121p) * 100) / 100,
          total:        Math.round(total  * 100) / 100,
          dacBalance:   Math.round(dac    * 100) / 100,
          clientBalance:Math.round(cli    * 100) / 100,
          collected:    Math.round(cob    * 100) / 100,
          overdue:      Math.round(vec    * 100) / 100,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Calcular totales
    const totals: OfficeSummary = {
      id:           'totals',
      name:         'TOTALES',
      invoiceCount:  offices.reduce((s, o) => s + o.invoiceCount,  0),
      range01to30:   Math.round(offices.reduce((s, o) => s + o.range01to30,  0) * 100) / 100,
      range31to45:   0,
      range46to60:   Math.round(offices.reduce((s, o) => s + o.range46to60,  0) * 100) / 100,
      range61to90:   Math.round(offices.reduce((s, o) => s + o.range61to90,  0) * 100) / 100,
      range91plus:   Math.round(offices.reduce((s, o) => s + o.range91plus,  0) * 100) / 100,
      total:         Math.round(offices.reduce((s, o) => s + o.total,         0) * 100) / 100,
      dacBalance:    Math.round(offices.reduce((s, o) => s + o.dacBalance,    0) * 100) / 100,
      clientBalance: Math.round(offices.reduce((s, o) => s + o.clientBalance, 0) * 100) / 100,
      collected:     Math.round(offices.reduce((s, o) => s + o.collected,     0) * 100) / 100,
      overdue:       Math.round(offices.reduce((s, o) => s + o.overdue,       0) * 100) / 100,
    };

    const response: OfficeSummaryData = { offices, totals };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error en /api/resumen-oficinas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
