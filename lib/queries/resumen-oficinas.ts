// lib/queries/resumen-oficinas.ts
// US-006: Resumen Corporativo por Oficina
// Replaces sp_Resumen to support 31-45 and 46-60 splits natively via UDF

import { getMexicoDateString } from '../date-utils';

export function buildResumenOficinasQuery(fechaCorte: string, idEmpresa: number = 1): string {
  // Validate basic date format to prevent SQL injection or bad formatting
  const safeFechaCorte = /^\d{4}-\d{2}-\d{2}$/.test(fechaCorte)
    ? fechaCorte
    : getMexicoDateString();

  return `
    WITH Base AS (
        SELECT *
        FROM dbo.fn_CuentasPorCobrar_Excel('${safeFechaCorte}', ${idEmpresa})
        WHERE TipoCliente = 'Externo'
    )
    SELECT
         Unidad
        ,'DAC - ' + NombreSucursal AS [Oficina]
        ,COUNT(Unidad) AS [Fact]
        ,SUM(CASE WHEN DiasTranscurridos <=30 THEN Saldo ELSE 0 END)                AS [01-30]
        ,SUM(CASE WHEN DiasTranscurridos BETWEEN 31 AND 45 THEN Saldo ELSE 0 END)   AS [31-45]
        ,SUM(CASE WHEN DiasTranscurridos BETWEEN 46 AND 60 THEN Saldo ELSE 0 END)   AS [46-60]
        ,SUM(CASE WHEN DiasTranscurridos BETWEEN 61 AND 90 THEN Saldo ELSE 0 END)   AS [61-90]
        ,SUM(CASE WHEN DiasTranscurridos BETWEEN 91 AND 120 THEN Saldo ELSE 0 END)  AS [91-120]
        ,SUM(CASE WHEN DiasTranscurridos >= 121 THEN Saldo ELSE 0 END)              AS [121-500 Dias]
        ,SUM(Saldo) AS Total
        ,SUM(CASE WHEN Saldo >=0 THEN Saldo ELSE 0 END) AS [Saldo DAC]
        ,SUM(CASE WHEN Saldo <0 THEN Saldo ELSE 0 END) AS [Saldos Clientes]
        ,0 AS [Cobrado]
        ,SUM(Vencido) AS [Vencido]
    FROM Base
    GROUP BY
        Unidad,
        NombreSucursal
    ORDER BY
        NombreSucursal;
  `;
}
