// app/api/antiguedad-cartera/route.ts
// API Route para US-002: Antigüedad de Cartera con rangos exactos
// GET /api/antiguedad-cartera?fechaCorte=2024-01-31&idEmpresa=1

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryWithRetry } from '@/lib/reco-api';
import { AgingData, AgingBucket, AgingDetail, AgingRange } from '@/types/dashboard';
import { agingRiskColors } from '@/lib/utils/colors';

export const dynamic = 'force-dynamic';

const AGING_RANGES: { range: AgingRange; min: number; max: number }[] = [
  { range: '1-30', min: 1, max: 30 },
  { range: '31-60', min: 31, max: 60 },
  { range: '61-90', min: 61, max: 90 },
  { range: '91-120', min: 91, max: 120 },
  { range: '121-5000', min: 121, max: 5000 },
];

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

    // Query US-002: consulta directa a tablas base (~5s vs ~30s+ con fn_CuentasPorCobrar_Excel)
    // Evita funciones escalares lentas: SaldoCGAFechaCorte, EsClienteInterno, Trae_Unidad
    // Filtrado de clientes internos se hace en JavaScript usando RFC
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
        CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARazonSocialCliente ELSE c.sRazonSocial END AS RazonSocial
      FROM admin.ADMIN_VT_CGastosCabecera cg
      LEFT JOIN admin.ADMIN_VT_SaldoCGA s ON cg.IdCuentaGastos = s.nIdCtaGastos15
      INNER JOIN Admin.ADMINC_07_CLIENTES c ON c.nIdClie07 = ISNULL(cg.FacturarAidCliente, cg.IdCliente)
      WHERE cg.idEmpresa = ${idEmpresa}
        AND cg.Estatus <> 1
        AND ABS(ISNULL(s.Saldo, 0)) > 1
        AND cg.Fecha < DATEADD(DD, 1, '${fechaCorte}')
    `;

    console.log(`[ANTIGUEDAD-CARTERA] Query directa a tablas base`);

    const result = await executeQueryWithRetry(query, { useCache: true, retries: 2 });

    if (!result.success || !result.data) {
      console.error('Error fetching cobranza data:', result.error);
      
      // Return fallback data to prevent UI errors
      const fallbackResponse: AgingData = {
        chartData: [
          { range: '1-30', amount: 0, percentage: 0, color: '#2196F3', riskLevel: 'low' },
          { range: '31-60', amount: 0, percentage: 0, color: '#FFC107', riskLevel: 'medium' },
          { range: '61-90', amount: 0, percentage: 0, color: '#FF9800', riskLevel: 'high' },
          { range: '91-120', amount: 0, percentage: 0, color: '#F44336', riskLevel: 'critical' },
          { range: '121-5000', amount: 0, percentage: 0, color: '#D32F2F', riskLevel: 'critical' },
        ],
        tableData: [],
        summary: {
          totalAmount: 0,
          totalClients: 0,
          averageDays: 0,
        },
      };
      
      return NextResponse.json(fallbackResponse);
    }

    // Filtrar clientes internos en JS (réplica exacta de dbo.EsClienteInterno)
    const INTERNAL_RFCS = new Set([
      'DAC911011F57', 'GCA960517MYA', 'GLE961217IC5',
      'KSI980219699', 'UNI931215B65', 'SPC911017BQ1',
    ]);
    const cobranzaData = result.data.filter((row: any) => {
      const rfc = (row.RFC || '').trim();
      const nombre = (row.RazonSocial || '').trim();
      if (INTERNAL_RFCS.has(rfc)) return false;
      if (nombre.startsWith('INTERCONTINENTAL FORWARDING')) return false;
      if (nombre.startsWith('RED TOTAL')) return false;
      return true;
    });

    // Calcular distribución por rangos de antigüedad
    const chartData = calculateAgingBuckets(cobranzaData || []);
    const tableData = calculateClientDetails(cobranzaData || []);
    const summary = calculateSummary(cobranzaData || [], tableData.length);

    const response: AgingData = {
      chartData,
      tableData,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error en /api/antiguedad-cartera:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Calcula los buckets de antigüedad para la gráfica
 */
function calculateAgingBuckets(data: any[]): AgingBucket[] {
  const totalGeneral = data.reduce((sum, item) => sum + (item.Total || 0), 0);

  return AGING_RANGES.map(({ range, min, max }) => {
    const itemsInRange = data.filter((item) => {
      const dias = item.Dias || 0;
      return dias >= min && dias <= max;
    });

    const amount = itemsInRange.reduce((sum, item) => sum + (item.Total || 0), 0);
    const percentage = totalGeneral > 0 ? (amount / totalGeneral) * 100 : 0;
    const config = agingRiskColors[range];

    return {
      range,
      amount: Math.round(amount * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      color: config.fill,
      riskLevel: config.risk,
    };
  });
}

/**
 * Agrupa registros por RFC/cliente y distribuye saldo en rangos de antigüedad
 */
function calculateClientDetails(data: any[]): AgingDetail[] {
  const clientMap = new Map<string, AgingDetail>();

  for (const row of data) {
    const rfc = (row.RFC || '').trim() || 'SIN-RFC';
    const dias = row.Dias || 0;
    const saldo = row.Total || 0;

    let client = clientMap.get(rfc);
    if (!client) {
      client = {
        clientName: (row.RazonSocial || '').trim() || 'Sin Nombre',
        rfc,
        range1to30: 0,
        range31to60: 0,
        range61to90: 0,
        range91to120: 0,
        range121plus: 0,
        total: 0,
        branch: '',
      };
      clientMap.set(rfc, client);
    }

    client.total += saldo;
    if (dias >= 1 && dias <= 30) client.range1to30 += saldo;
    else if (dias >= 31 && dias <= 60) client.range31to60 += saldo;
    else if (dias >= 61 && dias <= 90) client.range61to90 += saldo;
    else if (dias >= 91 && dias <= 120) client.range91to120 += saldo;
    else client.range121plus += saldo;
  }

  // Redondear valores
  const details = Array.from(clientMap.values()).map(c => ({
    ...c,
    range1to30: Math.round(c.range1to30 * 100) / 100,
    range31to60: Math.round(c.range31to60 * 100) / 100,
    range61to90: Math.round(c.range61to90 * 100) / 100,
    range91to120: Math.round(c.range91to120 * 100) / 100,
    range121plus: Math.round(c.range121plus * 100) / 100,
    total: Math.round(c.total * 100) / 100,
  }));

  return details.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

/**
 * Calcula el resumen general a partir de los registros crudos
 */
function calculateSummary(data: any[], totalClients: number) {
  const totalAmount = data.reduce((sum, item) => sum + (item.Total || 0), 0);
  const avgDays = data.length > 0
    ? data.reduce((sum, item) => sum + (item.Dias || 0), 0) / data.length
    : 0;

  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalClients,
    averageDays: Math.round(avgDays * 100) / 100,
  };
}
