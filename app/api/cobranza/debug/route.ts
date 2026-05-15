// app/api/cobranza/debug/route.ts
// Endpoint de diagnóstico para investigar discrepancias en cobranza.
// GET /api/cobranza/debug?year=2026&month=4&idEmpresa=1
// Ejecuta fn_CGA_Cobrados para un mes específico y devuelve el detalle por factura
// para poder comparar GastosME_Cob vs IngresosME_Cob contra depósitos bancarios.

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryWithRetry } from '@/lib/reco-api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || '1');
    const idEmpresa = parseInt(searchParams.get('idEmpresa') || '1');
    const limit = parseInt(searchParams.get('limit') || '200');

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || isNaN(idEmpresa)) {
      return NextResponse.json(
        { error: 'Parámetros inválidos. Se requiere year, month (1-12) e idEmpresa numéricos.' },
        { status: 400 }
      );
    }

    const fechaIni = `DATEFROMPARTS(${year}, ${month}, 1)`;
    const fechaFin = `EOMONTH(DATEFROMPARTS(${year}, ${month}, 1))`;

    const query = `
SELECT TOP ${limit}
     SUC.sNombre AS Sucursal
    ,CGA.sPrefijo + CONVERT(VARCHAR(50), CGA.nNumero) AS Factura
    ,VT.FechaFactura
    ,CTE.sClave AS ClaveCliente
    ,CTE.sRFC AS RFCCliente
    ,CTE.sRazonSocial AS Cliente
    ,ISNULL(CTF.sClave, '') AS ClaveClienteFacturarA
    ,ISNULL(CTF.sRFC, '') AS RFCClienteFacturarA
    ,ISNULL(CTF.sRazonSocial, '') AS ClienteFacturarA
    ,VT.FechaPago
    ,VT.GastosME_Cob
    ,VT.IngresosME_Cob
    ,VT.GastosME_Cob + VT.IngresosME_Cob AS TotalCobrado
FROM dbo.fn_CGA_Cobrados(${fechaIni}, ${fechaFin}, ${idEmpresa}) VT
INNER JOIN Admin.ADMINO_15_CUENTAS_GASTOS CGA
    ON VT.nIdCtaGastos15 = CGA.nIdCtaGastos15
INNER JOIN Admin.ADMINA_12_SUCURSALES SUC
    ON VT.nIdSuc12 = SUC.nIdSuc12
INNER JOIN Admin.ADMINC_07_CLIENTES CTE
    ON CGA.nIdClie07 = CTE.nIdClie07
LEFT JOIN Admin.ADMINC_07_CLIENTES CTF
    ON CGA.nIdFacturarA = CTF.nIdClie07
ORDER BY VT.IngresosME_Cob DESC`;

    console.log(`[COBRANZA-DEBUG] Query para ${year}-${String(month).padStart(2, '0')}, empresa ${idEmpresa}`);

    const result = await executeQueryWithRetry(query, { useCache: false, retries: 1 });

    if (!result.success || !result.data) {
      console.error('[COBRANZA-DEBUG] Error:', result.error);
      return NextResponse.json(
        { error: 'Error al ejecutar diagnóstico de cobranza', details: result.error },
        { status: 500 }
      );
    }

    const rows: any[] = result.data || [];

    const totalGastos = rows.reduce((s, r) => s + (r.GastosME_Cob ?? r.gastosme_cob ?? 0), 0);
    const totalIngresos = rows.reduce((s, r) => s + (r.IngresosME_Cob ?? r.ingresosme_cob ?? 0), 0);
    const totalCobrado = totalGastos + totalIngresos;

    // Totales por sucursal
    const byBranch: Record<string, { gastos: number; ingresos: number; total: number; count: number }> = {};
    rows.forEach((r) => {
      const branch = (r.Sucursal ?? r.sucursal ?? 'Sin Sucursal').toString().trim();
      const g = r.GastosME_Cob ?? r.gastosme_cob ?? 0;
      const i = r.IngresosME_Cob ?? r.ingresosme_cob ?? 0;
      if (!byBranch[branch]) byBranch[branch] = { gastos: 0, ingresos: 0, total: 0, count: 0 };
      byBranch[branch].gastos += g;
      byBranch[branch].ingresos += i;
      byBranch[branch].total += g + i;
      byBranch[branch].count += 1;
    });

    return NextResponse.json({
      year,
      month,
      idEmpresa,
      rowCount: rows.length,
      totals: {
        gastos: Math.round(totalGastos * 100) / 100,
        ingresos: Math.round(totalIngresos * 100) / 100,
        cobrado: Math.round(totalCobrado * 100) / 100,
      },
      byBranch: Object.entries(byBranch).map(([branch, data]) => ({
        branch,
        ...data,
        gastos: Math.round(data.gastos * 100) / 100,
        ingresos: Math.round(data.ingresos * 100) / 100,
        total: Math.round(data.total * 100) / 100,
      })),
      rows: rows.map((r) => ({
        sucursal: r.Sucursal ?? r.sucursal ?? '',
        factura: r.Factura ?? r.factura ?? '',
        fechaFactura: r.FechaFactura ?? r.fechafactura ?? '',
        rfcCliente: r.RFCCliente ?? r.rfccliente ?? '',
        cliente: r.Cliente ?? r.cliente ?? '',
        fechaPago: r.FechaPago ?? r.fechapago ?? '',
        gastosME: Math.round((r.GastosME_Cob ?? r.gastosme_cob ?? 0) * 100) / 100,
        ingresosME: Math.round((r.IngresosME_Cob ?? r.ingresosme_cob ?? 0) * 100) / 100,
        totalCobrado: Math.round(((r.GastosME_Cob ?? r.gastosme_cob ?? 0) + (r.IngresosME_Cob ?? r.ingresosme_cob ?? 0)) * 100) / 100,
      })),
    });
  } catch (error) {
    console.error('Error en /api/cobranza/debug:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
