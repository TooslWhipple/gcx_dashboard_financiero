// app/api/tendencia-cxc/route.ts
// API Route para US-003: Tendencia Cartera CXC (Vencido vs En tiempo)
// GET /api/tendencia-cxc?year=2026&idEmpresa=1
// Fuente: EXEC dbo.[sp_Tendencia_cartera_CxC] @Year, @IdEmpresa
// SP devuelve (por cliente × mes): Nombre, RFC, Vigente, Vencido, Saldo, Sucursal, Numero(=Mes)
// Nota: Vigente = DiasTranscurridos < 1  (el SP no aplica días de crédito por cliente)

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryWithRetry } from '@/lib/reco-api';
import { PortfolioTrendData, MonthPortfolioData, PortfolioDetail } from '@/types/dashboard';
import { formatMonthName } from '@/lib/utils/formatters';
import { buildTendenciaCxcQuery } from '@/lib/queries/tendencia-cxc';

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

    console.log(`[TENDENCIA-CXC] Executing direct query for year ${year}, empresa ${idEmpresa}`);

    const query = buildTendenciaCxcQuery(year, idEmpresa);
    const result = await executeQueryWithRetry(
      query,
      { useCache: true, retries: 2 }
    );

    if (!result.success || !result.data) {
      console.error('[TENDENCIA-CXC] Error de la query directa:', result.error);
      return NextResponse.json(
        { error: 'Error al obtener datos de la base de datos' },
        { status: 500 }
      );
    }

    const rows: any[] = result.data;
    console.log(`[TENDENCIA-CXC] ${rows.length} filas recibidas de la query directa`);

    // Determinar meses disponibles
    const today = new Date();
    const currentMonth = year < today.getFullYear() ? 12 : today.getMonth() + 1;

    // Inicializar meses
    const monthMap = new Map<number, {
      overdue: number;
      onTime: number;
      total: number;
      details: Map<string, any>;
    }>();
    for (let m = 1; m <= currentMonth; m++) {
      monthMap.set(m, { overdue: 0, onTime: 0, total: 0, details: new Map() });
    }

    // Acumular datos del SP por mes
    for (const row of rows) {
      const mes: number = row.Numero ?? row.numero ?? row.Mes ?? row.mes ?? 0;
      if (mes < 1 || mes > currentMonth) continue;

      const vigente: number = row.Vigente ?? row.vigente ?? 0;
      const vencido: number = row.Vencido ?? row.vencido ?? 0;
      const saldo:   number = row.Saldo   ?? row.saldo   ?? 0;
      const rfc:    string  = (row.RFC    ?? row.rfc     ?? '').toString().trim();
      const nombre: string  = (row.Nombre ?? row.nombre  ?? '').toString().trim();

      const bucket = monthMap.get(mes);
      if (!bucket) continue;

      bucket.onTime  += vigente;
      bucket.overdue += vencido;
      bucket.total   += saldo;

      // Detalle acumulado por RFC × mes
      const key = `${rfc}_${mes}`;
      const existing = bucket.details.get(key);
      if (existing) {
        existing.onTime  += vigente;
        existing.overdue += vencido;
        existing.total   += saldo;
      } else {
        bucket.details.set(key, {
          clientName: nombre || 'Sin Nombre',
          rfc: rfc || 'Sin RFC',
          onTime:  vigente,
          overdue: vencido,
          total:   saldo,
          month:   mes,
        });
      }
    }

    // Construir respuesta
    const months: MonthPortfolioData[] = [];
    const tableDetails: PortfolioDetail[] = [];

    for (let m = 1; m <= currentMonth; m++) {
      const bucket = monthMap.get(m)!;
      const overduePercentage = bucket.total > 0 ? (bucket.overdue / bucket.total) * 100 : 0;

      months.push({
        month:    m,
        monthName: formatMonthName(m),
        overdue:  Math.round(bucket.overdue * 100) / 100,
        onTime:   Math.round(bucket.onTime  * 100) / 100,
        total:    Math.round(bucket.total   * 100) / 100,
        overduePercentage: Math.round(overduePercentage * 100) / 100,
      });

      for (const detail of bucket.details.values()) {
        tableDetails.push({
          clientName: detail.clientName,
          rfc:        detail.rfc,
          onTime:     Math.round(detail.onTime  * 100) / 100,
          overdue:    Math.round(detail.overdue * 100) / 100,
          total:      Math.round(detail.total   * 100) / 100,
          month:      detail.month,
        });
      }
    }

    const response: PortfolioTrendData = { months, tableData: tableDetails };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error en /api/tendencia-cxc:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
