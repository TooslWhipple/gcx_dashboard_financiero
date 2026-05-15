// app/api/garantias/tendencia/route.ts
// API Route para US-008: Tendencia Cartera de Garantías
// GET /api/garantias/tendencia?year=2026&idEmpresa=1
// Fuente: EXEC dbo.[sp_Tendencia_cartera_Garantias] @Year, @IdEmpresa
// SP devuelve mensual: Sucursal, Proveedor, Vigente, Vencido, Saldo, Numero (mes)

import { NextRequest, NextResponse } from 'next/server';
import { executeSP } from '@/lib/reco-api';

export const dynamic = 'force-dynamic';

const OVERDUE_THRESHOLD = 45; // días para considerar vencido

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

    console.log(`[GARANTIAS-TENDENCIA] EXEC sp_Tendencia_cartera_Garantias ${year}, ${idEmpresa}`);

    const result = await executeSP(
      'sp_Tendencia_cartera_Garantias',
      { Year: year, IdEmpresa: idEmpresa },
      { useCache: false, retries: 2 }
    );

    if (!result.success || !result.data) {
      console.error('[GARANTIAS-TENDENCIA] Error del SP:', result.error);
      return NextResponse.json(
        { error: 'Error al consultar tendencia de garantías' },
        { status: 500 }
      );
    }

    const rows: any[] = result.data;
    console.log(`[GARANTIAS-TENDENCIA] ${rows.length} filas del SP`);

    // DEBUG: log primeras 5 filas raw para diagnosticar estructura y valores
    if (rows.length > 0) {
      console.log('[GARANTIAS-TENDENCIA] Muestra filas raw:', rows.slice(0, 5).map((r) => ({
        mes: r.Numero ?? r.numero ?? r.MES ?? r.Mes,
        vigente: r.Vigente ?? r.vigente,
        vencido: r.Vencido ?? r.vencido,
        saldo: r.Saldo ?? r.saldo,
        sucursal: r.Sucursal ?? r.sucursal ?? r.sNombreSucursal,
        proveedor: r.Proveedor ?? r.proveedor ?? r.sProveedor,
      })));
    }

    // Validar que Vigente + Vencido ~= Saldo en cada fila
    let mismatchCount = 0;
    rows.forEach((row) => {
      const vigente = row.Vigente ?? row.vigente ?? 0;
      const vencido = row.Vencido ?? row.vencido ?? 0;
      const saldo   = row.Saldo   ?? row.saldo   ?? 0;
      const suma = Math.round((vigente + vencido) * 100) / 100;
      const saldoRounded = Math.round(saldo * 100) / 100;
      if (Math.abs(suma - saldoRounded) > 0.01) {
        mismatchCount++;
      }
    });
    if (mismatchCount > 0) {
      console.warn(`[GARANTIAS-TENDENCIA] ${mismatchCount} de ${rows.length} filas tienen Vigente+Vencido != Saldo`);
    }

    // Agrupar por mes (Numero)
    const today = new Date();
    const maxMonth = year < today.getFullYear() ? 12 : today.getMonth() + 1;

    const monthMap = new Map<number, {
      vigente: number;
      vencido: number;
      saldo: number;
      details: any[];
    }>();

    for (let m = 1; m <= maxMonth; m++) {
      monthMap.set(m, { vigente: 0, vencido: 0, saldo: 0, details: [] });
    }

    rows.forEach((row) => {
      const mes = row.Numero ?? row.numero ?? row.MES ?? row.Mes ?? 0;
      if (mes < 1 || mes > maxMonth) return;

      const vigente   = row.Vigente   ?? row.vigente   ?? 0;
      const vencido   = row.Vencido   ?? row.vencido   ?? 0;
      const saldo     = row.Saldo     ?? row.saldo     ?? 0;
      const sucursal  = (row.Sucursal  ?? row.sucursal  ?? row.sNombreSucursal ?? '').toString().trim();
      const proveedor = (row.Proveedor ?? row.proveedor ?? row.sProveedor     ?? '').toString().trim();

      const entry = monthMap.get(mes)!;
      entry.vigente += vigente;
      entry.vencido += vencido;
      entry.saldo   += saldo;
      entry.details.push({
        providerName: proveedor || 'Sin Proveedor',
        onTime:       Math.round(vigente * 100) / 100,
        overdue:      Math.round(vencido * 100) / 100,
        total:        Math.round(saldo   * 100) / 100,
        branch:       sucursal  || 'Sin Sucursal',
        weekLabel:    new Date(year, mes - 1).toLocaleString('es-MX', { month: 'short' }),
      });
    });

    const weeks: any[] = [];
    const tableDetails: any[] = [];

    for (let m = 1; m <= maxMonth; m++) {
      const entry = monthMap.get(m)!;
      const totalPortfolio    = entry.saldo;
      const totalOverdue      = entry.vencido;
      const totalOnTime       = entry.vigente;
      const overduePercentage = totalPortfolio > 0 ? (totalOverdue / totalPortfolio) * 100 : 0;
      const monthName         = new Date(year, m - 1).toLocaleString('es-MX', { month: 'short' });

      weeks.push({
        weekNumber:         m,
        weekLabel:          monthName,
        date:               `${year}-${String(m).padStart(2, '0')}-01`,
        garantiasEnProceso: Math.round(totalOnTime       * 100) / 100,
        programado:         Math.round(totalPortfolio    * 100) / 100,
        overdue:            Math.round(totalOverdue      * 100) / 100,
        total:              Math.round(totalPortfolio    * 100) / 100,
        overduePercentage:  Math.round(overduePercentage * 100) / 100,
      });

      tableDetails.push(...entry.details);
    }

    return NextResponse.json({ weeks, tableData: tableDetails, overdueThreshold: OVERDUE_THRESHOLD });
  } catch (error) {
    console.error('Error en /api/garantias/tendencia:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
