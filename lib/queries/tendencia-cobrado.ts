// lib/queries/tendencia-cobrado.ts
// Query directa que reemplaza a sp_Tendencia_Cobrado
// Usa CROSS APPLY con fn_CGA_Cobrados en lugar del WHILE loop del SP
// Resultado: mismas columnas que el SP original

/**
 * Genera la query SQL para obtener la tendencia de cobrado por año.
 * Reemplaza al SP dbo.sp_Tendencia_Cobrado que causaba timeouts.
 *
 * Columnas retornadas:
 *   nIdCtaGastos15, nIdEmp11, nIdSuc12, Sucursal, Factura,
 *   FechaFactura, ClaveCliente, RFCCliente, Cliente,
 *   ClaveClienteFacturarA, RFCClienteFacturarA, ClienteFacturarA,
 *   FechaPago, GastosME_Cob, IngresosME_Cob, TotalCobrado
 */
export function buildTendenciaCobradoQuery(year: number, idEmpresa: number): string {
  // Validar entrada
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Año inválido: ${year}`);
  }
  if (!Number.isInteger(idEmpresa) || idEmpresa < 1) {
    throw new Error(`IdEmpresa inválido: ${idEmpresa}`);
  }

  return `
WITH CTE_Meses AS
(
    SELECT
        1 AS NumeroMes,
        DATENAME(MONTH, DATEFROMPARTS(${year}, 1, 1)) AS NombreMes,
        DATEFROMPARTS(${year}, 1, 1) AS FechaInicioMes,
        EOMONTH(DATEFROMPARTS(${year}, 1, 1)) AS FechaFinMes
    UNION ALL
    SELECT
        NumeroMes + 1,
        DATENAME(MONTH, DATEFROMPARTS(${year}, NumeroMes + 1, 1)),
        DATEFROMPARTS(${year}, NumeroMes + 1, 1),
        EOMONTH(DATEFROMPARTS(${year}, NumeroMes + 1, 1))
    FROM CTE_Meses
    WHERE NumeroMes < 12
),
Cobrado AS
(
    SELECT
         VT.nIdCtaGastos15
        ,VT.nIdEmp11
        ,VT.nIdSuc12
        ,VT.FechaFactura
        ,VT.FechaPago
        ,VT.GastosME_Cob
        ,VT.IngresosME_Cob
        ,VT.GastosME_Cob + VT.IngresosME_Cob AS TotalCobrado
    FROM CTE_Meses M
    CROSS APPLY dbo.fn_CGA_Cobrados(M.FechaInicioMes, M.FechaFinMes, ${idEmpresa}) VT
)
SELECT
     VT.nIdCtaGastos15
    ,VT.nIdEmp11
    ,VT.nIdSuc12
    ,SUC.sNombre AS Sucursal
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
    ,VT.TotalCobrado
FROM Cobrado VT
INNER JOIN Admin.ADMINO_15_CUENTAS_GASTOS CGA
    ON VT.nIdCtaGastos15 = CGA.nIdCtaGastos15
INNER JOIN Admin.ADMINA_12_SUCURSALES SUC
    ON VT.nIdSuc12 = SUC.nIdSuc12
INNER JOIN Admin.ADMINC_07_CLIENTES CTE
    ON CGA.nIdClie07 = CTE.nIdClie07
LEFT JOIN Admin.ADMINC_07_CLIENTES CTF
    ON CGA.nIdFacturarA = CTF.nIdClie07
OPTION (MAXRECURSION 12)`;
}
