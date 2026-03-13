// app/api/tendencia-cxc/route.ts
// API Route para US-003: Tendencia Cartera CXC (Vencido vs En tiempo)
// GET /api/tendencia-cxc?year=2026&idEmpresa=1
// Consulta directa a tablas base (~5s) — reemplaza 6 llamadas a fn_CuentasPorCobrar_Excel

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryWithRetry } from '@/lib/reco-api';
import { PortfolioTrendData, MonthPortfolioData, PortfolioDetail } from '@/types/dashboard';
import { formatMonthName } from '@/lib/utils/formatters';

export const dynamic = 'force-dynamic';

// Réplica exacta de dbo.EsClienteInterno
const INTERNAL_RFCS = new Set([
  'DAC911011F57', 'GCA960517MYA', 'GLE961217IC5',
  'KSI980219699', 'UNI931215B65', 'SPC911017BQ1',
]);
function isExternalClient(rfc: string, nombre: string): boolean {
  if (INTERNAL_RFCS.has(rfc)) return false;
  if (nombre.startsWith('INTERCONTINENTAL FORWARDING')) return false;
  if (nombre.startsWith('RED TOTAL')) return false;
  return true;
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

    // Fecha de corte: hoy o fin de año si es año pasado
    const today = new Date();
    const fechaCorte = year < today.getFullYear()
      ? `${year}-12-31`
      : `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Query directa a tablas base (~5s vs ~30s+ por mes con fn_CuentasPorCobrar_Excel)
    const query = `
      SELECT
        ISNULL(s.Saldo, 0) AS Saldo,
        DATEDIFF(DAY,
          DATEADD(DAY,
            CASE WHEN ISNULL(c.nDiasCred, 0) > 0 THEN c.nDiasCred ELSE 0 END,
            cg.Fecha
          ),
          '${fechaCorte}'
        ) AS DiasTranscurridos,
        ISNULL(c.nDiasCred, 0) AS DiasCredito,
        MONTH(cg.Fecha) AS Mes,
        CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARfcCliente ELSE c.sRFC END AS RFC,
        CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARazonSocialCliente ELSE c.sRazonSocial END AS RazonSocial,
        cg.NombreSucursal AS Sucursal
      FROM admin.ADMIN_VT_CGastosCabecera cg
      LEFT JOIN admin.ADMIN_VT_SaldoCGA s ON cg.IdCuentaGastos = s.nIdCtaGastos15
      INNER JOIN Admin.ADMINC_07_CLIENTES c ON c.nIdClie07 = ISNULL(cg.FacturarAidCliente, cg.IdCliente)
      WHERE cg.idEmpresa = ${idEmpresa}
        AND cg.Estatus <> 1
        AND ABS(ISNULL(s.Saldo, 0)) > 1
        AND cg.Fecha < DATEADD(DD, 1, '${fechaCorte}')
        AND YEAR(cg.Fecha) = ${year}
    `;

    console.log(`[TENDENCIA-CXC] Query directa a tablas base, año ${year}`);

    const result = await executeQueryWithRetry(query, { useCache: false, retries: 2 });

    if (!result.success || !result.data) {
      console.error('Error fetching CXC data:', result.error);
      return NextResponse.json(
        { error: 'Error al obtener datos de la base de datos' },
        { status: 500 }
      );
    }

    // Filtrar clientes externos y calcular Vencido/EnTiempo en JS
    const rows = result.data.filter((row: any) =>
      isExternalClient((row.RFC || '').trim(), (row.RazonSocial || '').trim())
    );

    console.log(`[TENDENCIA-CXC] ${result.data.length} filas totales, ${rows.length} externas`);

    // Agrupar por mes
    const monthMap = new Map<number, { overdue: number; onTime: number; total: number; details: Map<string, any> }>();

    // Determinar meses disponibles
    const currentMonth = year < today.getFullYear() ? 12 : today.getMonth() + 1;
    for (let m = 1; m <= currentMonth; m++) {
      monthMap.set(m, { overdue: 0, onTime: 0, total: 0, details: new Map() });
    }

    for (const row of rows) {
      const mes = row.Mes as number;
      const saldo = row.Saldo || 0;
      const diasTranscurridos = row.DiasTranscurridos || 0;
      const diasCredito = row.DiasCredito || 0;
      const rfc = (row.RFC || '').trim();
      const nombre = (row.RazonSocial || '').trim();

      // Según los nuevos requerimientos (Cambios de a dashboard.md):
      // Corriente = 1 a 30 días (DiasTranscurridos <= 30)
      // Vencido = 31 días en adelante (DiasTranscurridos > 30)
      // Ya no depende de DiasCredito
      const esVencido = diasTranscurridos > 30;
      const vencido = esVencido ? saldo : 0;
      const enTiempo = esVencido ? 0 : saldo;

      const bucket = monthMap.get(mes);
      if (!bucket) continue;

      bucket.overdue += vencido;
      bucket.onTime += enTiempo;
      bucket.total += saldo;

      // Acumular detalle por cliente (RFC como key)
      const key = `${rfc}_${mes}`;
      const existing = bucket.details.get(key);
      if (existing) {
        existing.onTime += enTiempo;
        existing.overdue += vencido;
        existing.total += saldo;
      } else {
        bucket.details.set(key, {
          clientName: nombre || 'Sin Nombre',
          rfc: rfc || 'Sin RFC',
          onTime: enTiempo,
          overdue: vencido,
          total: saldo,
          month: mes,
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
        month: m,
        monthName: formatMonthName(m),
        overdue: Math.round(bucket.overdue * 100) / 100,
        onTime: Math.round(bucket.onTime * 100) / 100,
        total: Math.round(bucket.total * 100) / 100,
        overduePercentage: Math.round(overduePercentage * 100) / 100,
      });

      // Agregar detalles de clientes
      for (const detail of bucket.details.values()) {
        tableDetails.push({
          clientName: detail.clientName,
          rfc: detail.rfc,
          onTime: Math.round(detail.onTime * 100) / 100,
          overdue: Math.round(detail.overdue * 100) / 100,
          total: Math.round(detail.total * 100) / 100,
          month: detail.month,
        });
      }
    }

    const response: PortfolioTrendData = {
      months,
      tableData: tableDetails,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error en /api/tendencia-cxc:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
