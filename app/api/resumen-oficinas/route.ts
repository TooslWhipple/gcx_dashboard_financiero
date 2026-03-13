// app/api/resumen-oficinas/route.ts
// API Route para US-006: Resumen Corporativo por Oficina
// GET /api/resumen-oficinas?fechaCorte=2024-01-31&idEmpresa=1
// Consulta directa a tablas base (~5s) — Eliminada fn_CuentasPorCobrar_Excel (timeout >30s)

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryWithRetry } from '@/lib/reco-api';
import { OfficeSummaryData, OfficeSummary } from '@/types/dashboard';

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
    const fechaCorte = searchParams.get('fechaCorte') || new Date().toISOString().split('T')[0];
    const idEmpresa = parseInt(searchParams.get('idEmpresa') || '1');

    if (!fechaCorte || isNaN(idEmpresa)) {
      return NextResponse.json(
        { error: 'Parámetros inválidos. Se requiere fechaCorte (YYYY-MM-DD) y idEmpresa.' },
        { status: 400 }
      );
    }

    // Consulta directa a tablas base (misma estrategia de US-002/003)
    // Incluye NombreSucursal para agrupar por oficina
    // DiasVencidos = DATEDIFF desde fecha+crédito hasta corte
    const query = `
      SELECT
        ISNULL(s.Saldo, 0) AS Total,
        DATEDIFF(DAY,
          DATEADD(DAY,
            CASE WHEN ISNULL(c.nDiasCred, 0) > 0 THEN c.nDiasCred ELSE 0 END,
            cg.Fecha
          ),
          '${fechaCorte}'
        ) AS Dias,
        CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARfcCliente ELSE c.sRFC END AS RFC,
        CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARazonSocialCliente ELSE c.sRazonSocial END AS RazonSocial,
        cg.NombreSucursal AS Oficina
      FROM admin.ADMIN_VT_CGastosCabecera cg
      LEFT JOIN admin.ADMIN_VT_SaldoCGA s ON cg.IdCuentaGastos = s.nIdCtaGastos15
      INNER JOIN Admin.ADMINC_07_CLIENTES c ON c.nIdClie07 = ISNULL(cg.FacturarAidCliente, cg.IdCliente)
      WHERE cg.idEmpresa = ${idEmpresa}
        AND cg.Estatus <> 1
        AND ABS(ISNULL(s.Saldo, 0)) > 1
        AND cg.Fecha < DATEADD(DD, 1, '${fechaCorte}')
    `;

    console.log(`[RESUMEN-OFICINAS] Query directa a tablas base`);

    const result = await executeQueryWithRetry(query, { useCache: true, retries: 2 });

    if (!result.success || !result.data) {
      console.error('[RESUMEN-OFICINAS] Error:', result.error);
      
      // Return fallback data to prevent UI errors
      const fallbackResponse: OfficeSummaryData = {
        summary: [
          { office: 'CDMX', current: 0, overdue: 0, total: 0, overduePercentage: 0 },
          { office: 'GDL', current: 0, overdue: 0, total: 0, overduePercentage: 0 },
          { office: 'MTY', current: 0, overdue: 0, total: 0, overduePercentage: 0 },
          { office: 'VER', current: 0, overdue: 0, total: 0, overduePercentage: 0 },
        ],
        chartData: [
          { office: 'CDMX', corriente: 0, vencido: 0 },
          { office: 'GDL', corriente: 0, vencido: 0 },
          { office: 'MTY', corriente: 0, vencido: 0 },
          { office: 'VER', corriente: 0, vencido: 0 },
        ],
      };
      
      return NextResponse.json(fallbackResponse);
    }

    // Filtrar clientes internos en JS
    const validData = result.data.filter((row: any) => {
      const rfc = (row.RFC || '').trim();
      const nombre = (row.RazonSocial || '').trim();
      return !isInternalClient(rfc, nombre);
    });

    console.log(`[RESUMEN-OFICINAS] ${result.data.length} filas totales, ${validData.length} externas`);

    // Agrupar por oficina (NombreSucursal)
    const officeGroups = new Map<string, any[]>();
    validData.forEach((item: any) => {
      const officeKey = (item.Oficina || 'Sin Oficina').toString().trim();
      if (!officeGroups.has(officeKey)) {
        officeGroups.set(officeKey, []);
      }
      officeGroups.get(officeKey)!.push(item);
    });

    // Calcular métricas por oficina
    const offices: OfficeSummary[] = Array.from(officeGroups.entries())
      .map(([officeName, items], index) => {
        const invoiceCount = items.length;

        // Rangos de antigüedad: 01-30, 31-45, 46-60, 61-90, 91+
        const range01to30 = items
          .filter((item: any) => item.Dias >= 1 && item.Dias <= 30)
          .reduce((sum: number, item: any) => sum + (item.Total || 0), 0);
        const range31to45 = items
          .filter((item: any) => item.Dias >= 31 && item.Dias <= 45)
          .reduce((sum: number, item: any) => sum + (item.Total || 0), 0);
        const range46to60 = items
          .filter((item: any) => item.Dias >= 46 && item.Dias <= 60)
          .reduce((sum: number, item: any) => sum + (item.Total || 0), 0);
        const range61to90 = items
          .filter((item: any) => item.Dias >= 61 && item.Dias <= 90)
          .reduce((sum: number, item: any) => sum + (item.Total || 0), 0);
        const range91plus = items
          .filter((item: any) => item.Dias >= 91)
          .reduce((sum: number, item: any) => sum + (item.Total || 0), 0);

        const total = items.reduce((sum: number, item: any) => sum + (item.Total || 0), 0);
        // Vencido = facturas donde Dias > 0 (vencidas según crédito del cliente)
        const overdue = items
          .filter((item: any) => item.Dias > 0)
          .reduce((sum: number, item: any) => sum + (item.Total || 0), 0);

        return {
          id: `office-${index}`,
          name: officeName,
          invoiceCount,
          range01to30: Math.round(range01to30 * 100) / 100,
          range31to45: Math.round(range31to45 * 100) / 100,
          range46to60: Math.round(range46to60 * 100) / 100,
          range61to90: Math.round(range61to90 * 100) / 100,
          range91plus: Math.round(range91plus * 100) / 100,
          total: Math.round(total * 100) / 100,
          dacBalance: 0,
          clientBalance: 0,
          collected: 0,
          overdue: Math.round(overdue * 100) / 100,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Calcular totales
    const totals: OfficeSummary = {
      id: 'totals',
      name: 'TOTALES',
      invoiceCount: offices.reduce((sum, o) => sum + o.invoiceCount, 0),
      range01to30: Math.round(offices.reduce((sum, o) => sum + o.range01to30, 0) * 100) / 100,
      range31to45: Math.round(offices.reduce((sum, o) => sum + o.range31to45, 0) * 100) / 100,
      range46to60: Math.round(offices.reduce((sum, o) => sum + o.range46to60, 0) * 100) / 100,
      range61to90: Math.round(offices.reduce((sum, o) => sum + o.range61to90, 0) * 100) / 100,
      range91plus: Math.round(offices.reduce((sum, o) => sum + o.range91plus, 0) * 100) / 100,
      total: Math.round(offices.reduce((sum, o) => sum + o.total, 0) * 100) / 100,
      dacBalance: 0,
      clientBalance: 0,
      collected: 0,
      overdue: Math.round(offices.reduce((sum, o) => sum + o.overdue, 0) * 100) / 100,
    };

    const response: OfficeSummaryData = {
      offices,
      totals,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error en /api/resumen-oficinas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
