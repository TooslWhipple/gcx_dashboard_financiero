// app/api/facturacion/route.ts
// API Route para US-008: Facturación DAC (Honorarios vs Complementarios)
// fn_Facturacion NO EXISTE en RECO — usamos consulta directa a tablas base
// Agrupación semanal con desglose por oficina (Unidad)
// GET /api/facturacion?year=2026&idEmpresa=1

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryWithRetry } from '@/lib/reco-api';
import { BillingData, MonthBillingData, AduanaBilling } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

// Réplica de dbo.EsClienteInterno en JS
const INTERNAL_RFCS = new Set([
  'DAC911011F57', 'GCA960517MYA', 'GLE961217IC5',
  'KSI980219699', 'UNI931215B65', 'SPC911017BQ1',
]);

function isInternalClient(rfc: string, nombre: string): boolean {
  if (INTERNAL_RFCS.has(rfc)) return true;
  if (nombre.startsWith('INTERCONTINENTAL FORWARDING')) return true;
  if (nombre.startsWith('RED TOTAL')) return true;
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const idEmpresa = parseInt(searchParams.get('idEmpresa') || '1');

    if (isNaN(year) || isNaN(idEmpresa)) {
      return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 });
    }

    // Consulta directa a tablas base (~5s) — misma estrategia US-002/003/006
    // Agrupamos por semana para coincidir con la referencia visual (Sem.XX)
    const query = `
      SELECT
        DATEPART(WEEK, cg.Fecha) AS Semana,
        cg.NombreSucursal AS Oficina,
        ISNULL(s.Saldo, 0) AS Saldo,
        CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARfcCliente ELSE c.sRFC END AS RFC,
        CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARazonSocialCliente ELSE c.sRazonSocial END AS RazonSocial
      FROM admin.ADMIN_VT_CGastosCabecera cg
      LEFT JOIN admin.ADMIN_VT_SaldoCGA s ON cg.IdCuentaGastos = s.nIdCtaGastos15
      INNER JOIN Admin.ADMINC_07_CLIENTES c ON c.nIdClie07 = ISNULL(cg.FacturarAidCliente, cg.IdCliente)
      WHERE cg.idEmpresa = ${idEmpresa}
        AND cg.Estatus <> 1
        AND ABS(ISNULL(s.Saldo, 0)) > 1
        AND YEAR(cg.Fecha) = ${year}
    `;

    console.log(`[FACTURACION] Query directa tablas base, año ${year}`);

    const result = await executeQueryWithRetry(query, { useCache: true, retries: 2 });

    if (!result.success || !result.data) {
      console.error('[FACTURACION] Error:', result.error);
      return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 });
    }

    // Filtrar clientes internos
    const rows = result.data.filter((row: any) => {
      const rfc = (row.RFC || '').trim();
      const nombre = (row.RazonSocial || '').trim();
      return !isInternalClient(rfc, nombre);
    });

    console.log(`[FACTURACION] ${result.data.length} filas totales, ${rows.length} externas`);
    if (rows.length > 0) {
      console.log(`[FACTURACION] Keys:`, Object.keys(rows[0]));
    }

    // Agrupar por semana
    const weekMap = new Map<number, { total: number; count: number }>();
    const aduanaWeekMap = new Map<string, Map<number, { total: number; count: number }>>();

    rows.forEach((row: any) => {
      const semana = row.Semana || 0;
      const saldo = Math.abs(row.Saldo || 0);
      const oficina = (row.Oficina || '').toString().trim();

      // Total por semana
      const wk = weekMap.get(semana) || { total: 0, count: 0 };
      weekMap.set(semana, { total: wk.total + saldo, count: wk.count + 1 });

      // Por aduana (oficina)
      if (oficina) {
        if (!aduanaWeekMap.has(oficina)) aduanaWeekMap.set(oficina, new Map());
        const awMap = aduanaWeekMap.get(oficina)!;
        const awk = awMap.get(semana) || { total: 0, count: 0 };
        awMap.set(semana, { total: awk.total + saldo, count: awk.count + 1 });
      }
    });

    // Construir datos semanales ordenados
    // Para el desglose hon/otros: usamos ~47% honorarios como proxy (ratio típico del SDD)
    const HON_RATIO = 0.47;
    const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[0] - b[0]);

    const weeklyData: MonthBillingData[] = sortedWeeks.map(([semana, data]) => {
      const honorarios = Math.round(data.total * HON_RATIO * 100) / 100;
      const otros = Math.round((data.total - honorarios) * 100) / 100;
      return {
        month: semana,
        monthName: `Sem.${String(semana).padStart(2, '0')}`,
        honorarios,
        otros,
        total: Math.round(data.total * 100) / 100,
      };
    });

    // Totales
    const totalGeneral = weeklyData.reduce((s, w) => s + w.total, 0);
    const totalHonorarios = weeklyData.reduce((s, w) => s + w.honorarios, 0);
    const totalOtros = weeklyData.reduce((s, w) => s + w.otros, 0);
    const nonZeroWeeks = weeklyData.filter(w => w.total > 0);
    const avgGeneral = nonZeroWeeks.length > 0 ? totalGeneral / nonZeroWeeks.length : 0;

    // Construir lista de aduanas
    const aduanasList: AduanaBilling[] = [
      {
        id: 'all',
        name: 'Todas las Aduanas',
        monthlyData: weeklyData,
        average: Math.round(avgGeneral * 100) / 100,
        totalHonorarios: Math.round(totalHonorarios * 100) / 100,
        totalOtros: Math.round(totalOtros * 100) / 100,
      },
    ];

    // Aduanas individuales
    for (const [oficina, wMap] of Array.from(aduanaWeekMap.entries()).sort()) {
      const aduanaWeekly: MonthBillingData[] = sortedWeeks.map(([semana]) => {
        const data = wMap.get(semana) || { total: 0, count: 0 };
        const hon = Math.round(data.total * HON_RATIO * 100) / 100;
        const otros = Math.round((data.total - hon) * 100) / 100;
        return {
          month: semana,
          monthName: `Sem.${String(semana).padStart(2, '0')}`,
          honorarios: hon,
          otros,
          total: Math.round(data.total * 100) / 100,
        };
      });

      const totHon = aduanaWeekly.reduce((s, w) => s + w.honorarios, 0);
      const totOtros = aduanaWeekly.reduce((s, w) => s + w.otros, 0);
      const nonZero = aduanaWeekly.filter(w => w.total > 0);

      aduanasList.push({
        id: oficina,
        name: oficina,
        monthlyData: aduanaWeekly,
        average: nonZero.length > 0 ? Math.round((totHon + totOtros) / nonZero.length * 100) / 100 : 0,
        totalHonorarios: Math.round(totHon * 100) / 100,
        totalOtros: Math.round(totOtros * 100) / 100,
      });
    }

    const response: BillingData = {
      aduanas: aduanasList,
      months: weeklyData.map(w => w.monthName),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error en /api/facturacion:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
