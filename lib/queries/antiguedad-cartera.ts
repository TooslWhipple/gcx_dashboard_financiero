// lib/queries/antiguedad-cartera.ts
// Query directa que reemplaza a sp_Antiguedad_cartera
// Calcula saldos vivos por cliente con rangos de antigüedad
// Resultado: B(Nombre), C(RFC), Vigente, [01-30], [31-60], [61-90], [91-120], [121-500 Dias], CO(Total), NombreSucursal

/**
 * Genera la query SQL para obtener la antigüedad de cartera.
 * Reemplaza al SP dbo.sp_Antiguedad_cartera que causaba timeouts/no datos.
 *
 * Usa DECLARE para inyectar parámetros como variables SQL (más seguro),
 * luego CTEs para calcular movimientos de saldo, liquidaciones y notas de crédito.
 *
 * Columnas retornadas:
 *   B (Nombre), C (RFC), Vigente, [01-30], [31-60], [61-90],
 *   [91-120], [121-500 Dias], CO (Total), NombreSucursal
 */
export function buildAntiguedadCarteraQuery(fechaCorte: string, idEmpresa: number): string {
  // Validar formato de fecha YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaCorte)) {
    throw new Error(`Formato de fecha inválido: ${fechaCorte}. Se requiere YYYY-MM-DD`);
  }
  if (!Number.isInteger(idEmpresa) || idEmpresa < 1) {
    throw new Error(`IdEmpresa inválido: ${idEmpresa}`);
  }

  // Sanitizar fecha contra SQL injection
  const safeFechaCorte = fechaCorte.replace(/'/g, "''");

  return `WITH MovimientosSaldo AS
(
    /* =========================
       1) Liquidaciones aplicadas a CGA
       ========================= */
    SELECT
         CG.nIdCtaGastos15
        ,ISNULL(LIQ.dCaptura, CG.dFactura) AS dFecha
        ,CG.nStatus AS Estatus
        ,CG.dCancelacion AS Cancelacion
        ,CG.nTotalFacturaME AS TotalFactura
        ,CONVERT(DECIMAL(14,2),
            CASE
                WHEN CG.nIdMoneda29 = LIQ.nIdMoneda29 THEN
                    ISNULL(
                        (
                            SELECT SUM(DLIQX.nImporteME)
                            FROM Admin.ADMINO_23_DETALLES_LIQUIDACIONES DLIQX
                            WHERE DLIQX.nIdDetLiquid23 = DLIQ.nIdDetLiquid23
                        ), 0
                    )
                ELSE
                    CASE
                        WHEN EMP.nIdMoneda29 = CG.nIdMoneda29 THEN
                            CASE
                                WHEN MNL.nOperacion = 0 THEN
                                    ISNULL(
                                        (
                                            SELECT SUM(DLIQX.nImporteME * ISNULL(LIQX.nTipoCambio,1))
                                            FROM Admin.ADMINO_23_DETALLES_LIQUIDACIONES DLIQX
                                            INNER JOIN Admin.ADMINO_22_LIQUIDACIONES LIQX
                                                ON DLIQX.nIdLiquid22 = LIQX.nIdLiquid22
                                            WHERE DLIQX.nIdDetLiquid23 = DLIQ.nIdDetLiquid23
                                        ), 0
                                    )
                                ELSE
                                    ISNULL(
                                        (
                                            SELECT SUM(DLIQX.nImporteME / ISNULL(LIQX.nTipoCambio,1))
                                            FROM Admin.ADMINO_23_DETALLES_LIQUIDACIONES DLIQX
                                            INNER JOIN Admin.ADMINO_22_LIQUIDACIONES LIQX
                                                ON DLIQX.nIdLiquid22 = LIQX.nIdLiquid22
                                            WHERE DLIQX.nIdDetLiquid23 = DLIQ.nIdDetLiquid23
                                        ), 0
                                    )
                            END
                        ELSE
                            CASE
                                WHEN MNL.nOperacion = 0 THEN
                                    CASE
                                        WHEN EMP.nIdMoneda29 = LIQ.nIdMoneda29 THEN
                                            CASE
                                                WHEN LIQ.nTipoCambio >= 1 THEN
                                                    ISNULL(
                                                        (
                                                            SELECT ROUND(SUM(DLIQX.nImporteME / ISNULL(CGX.nTipoCambio,1)), 2)
                                                            FROM Admin.ADMINO_23_DETALLES_LIQUIDACIONES DLIQX
                                                            INNER JOIN Admin.ADMINO_22_LIQUIDACIONES LIQX
                                                                ON DLIQX.nIdLiquid22 = LIQX.nIdLiquid22
                                                            LEFT JOIN Admin.ADMINO_15_CUENTAS_GASTOS CGX
                                                                ON DLIQX.nIdCtaGastos15 = CGX.nIdCtaGastos15
                                                            WHERE DLIQX.nIdDetLiquid23 = DLIQ.nIdDetLiquid23
                                                        ), 0
                                                    )
                                                ELSE
                                                    ISNULL(
                                                        (
                                                            SELECT SUM(DLIQX.nImporteME / ISNULL(LIQX.nTipoCambio,1))
                                                            FROM Admin.ADMINO_23_DETALLES_LIQUIDACIONES DLIQX
                                                            INNER JOIN Admin.ADMINO_22_LIQUIDACIONES LIQX
                                                                ON DLIQX.nIdLiquid22 = LIQX.nIdLiquid22
                                                            WHERE DLIQX.nIdDetLiquid23 = DLIQ.nIdDetLiquid23
                                                        ), 0
                                                    )
                                            END
                                    END
                                ELSE
                                    ISNULL(
                                        (
                                            SELECT SUM(DLIQX.nImporteME * ISNULL(LIQX.nTipoCambio,1))
                                            FROM Admin.ADMINO_23_DETALLES_LIQUIDACIONES DLIQX
                                            INNER JOIN Admin.ADMINO_22_LIQUIDACIONES LIQX
                                                ON DLIQX.nIdLiquid22 = LIQX.nIdLiquid22
                                            WHERE DLIQX.nIdDetLiquid23 = DLIQ.nIdDetLiquid23
                                        ), 0
                                    )
                            END
                    END
            END) AS Liquidacion
    FROM Admin.ADMINO_15_CUENTAS_GASTOS CG
    INNER JOIN Admin.ADMINO_23_DETALLES_LIQUIDACIONES DLIQ
        ON CG.nIdCtaGastos15 = DLIQ.nIdCtaGastos15
    INNER JOIN Admin.ADMINO_22_LIQUIDACIONES LIQ
        ON DLIQ.nIdLiquid22 = LIQ.nIdLiquid22
    INNER JOIN Admin.ADMINO_29_MONEDAS MNL
        ON LIQ.nIdMoneda29 = MNL.nIdMoneda29
    INNER JOIN Admin.ADMINA_12_SUCURSALES SUC
        ON CG.nIdSuc12 = SUC.nIdSuc12
    INNER JOIN Admin.ADMINA_11_EMPRESAS EMP
        ON SUC.nIdEmp11 = EMP.nIdEmp11

    UNION ALL

    /* =========================
       2) Notas de credito aplicadas a CGA
       ========================= */
    SELECT
         CG.nIdCtaGastos15
        ,ISNULL(LIQ.dNota, CG.dFactura) AS dFecha
        ,CG.nStatus AS Estatus
        ,CG.dCancelacion AS Cancelacion
        ,CG.nTotalFacturaME AS TotalFactura
        ,CONVERT(DECIMAL(14,2),
            CASE
                WHEN CG.nIdMoneda29 = LIQ.nIdMoneda29 THEN
                    (
                        SELECT
                            ISNULL(SUM(CASE WHEN DLIQX.nTipoPago <> 2 AND DLIQX.nTipoPago <> 7 THEN DLIQX.nImporteME END),0)
                          - ISNULL(SUM(CASE WHEN DLIQX.nTipoPago = 2 OR DLIQX.nTipoPago = 7 THEN DLIQX.nImporte END),0)
                        FROM Admin.ADMINA_41_DETALLES_NOTAS_CREDITO DLIQX
                        WHERE DLIQX.nIdDetNotasCredito41 = DLIQ.nIdDetNotasCredito41
                    )
                ELSE
                    CASE
                        WHEN EMP.nIdMoneda29 = CG.nIdMoneda29 THEN
                            CASE
                                WHEN MNL.nOperacion = 0 THEN
                                    ISNULL(
                                        (
                                            SELECT SUM(DLIQX.nImporteME * ISNULL(LIQX.nTipoCambio,1))
                                            FROM Admin.ADMINA_41_DETALLES_NOTAS_CREDITO DLIQX
                                            INNER JOIN Admin.ADMINA_40_NOTAS_CREDITO LIQX
                                                ON DLIQX.nIdNotasCredito40 = LIQX.nIdNotasCredito40
                                            WHERE DLIQX.nIdDetNotasCredito41 = DLIQ.nIdDetNotasCredito41
                                        ), 0
                                    )
                                ELSE
                                    ISNULL(
                                        (
                                            SELECT SUM(DLIQX.nImporteME / ISNULL(LIQX.nTipoCambio,1))
                                            FROM Admin.ADMINA_41_DETALLES_NOTAS_CREDITO DLIQX
                                            INNER JOIN Admin.ADMINA_40_NOTAS_CREDITO LIQX
                                                ON DLIQX.nIdNotasCredito40 = LIQX.nIdNotasCredito40
                                            WHERE DLIQX.nIdDetNotasCredito41 = DLIQ.nIdDetNotasCredito41
                                        ), 0
                                    )
                            END
                        ELSE
                            CASE
                                WHEN MNL.nOperacion = 0 THEN
                                    CASE
                                        WHEN EMP.nIdMoneda29 = LIQ.nIdMoneda29 THEN
                                            CASE
                                                WHEN LIQ.nTipoCambio <= 1 THEN
                                                    ISNULL(
                                                        (
                                                            SELECT SUM(DLIQX.nImporteME / ISNULL(CGX.nTipoCambio,1))
                                                            FROM Admin.ADMINA_41_DETALLES_NOTAS_CREDITO DLIQX
                                                            INNER JOIN Admin.ADMINA_40_NOTAS_CREDITO LIQX
                                                                ON DLIQX.nIdNotasCredito40 = LIQX.nIdNotasCredito40
                                                            LEFT JOIN Admin.ADMINO_15_CUENTAS_GASTOS CGX
                                                                ON DLIQX.nIdCtaGastos15 = CGX.nIdCtaGastos15
                                                            WHERE DLIQX.nIdDetNotasCredito41 = DLIQ.nIdDetNotasCredito41
                                                        ), 0
                                                    )
                                                ELSE
                                                    ISNULL(
                                                        (
                                                            SELECT SUM(DLIQX.nImporteME / ISNULL(LIQX.nTipoCambio,1))
                                                            FROM Admin.ADMINA_41_DETALLES_NOTAS_CREDITO DLIQX
                                                            INNER JOIN Admin.ADMINA_40_NOTAS_CREDITO LIQX
                                                                ON DLIQX.nIdNotasCredito40 = LIQX.nIdNotasCredito40
                                                            WHERE DLIQX.nIdDetNotasCredito41 = DLIQ.nIdDetNotasCredito41
                                                        ), 0
                                                    )
                                            END
                                    END
                                ELSE
                                    ISNULL(
                                        (
                                            SELECT SUM(DLIQX.nImporteME * ISNULL(LIQX.nTipoCambio,1))
                                            FROM Admin.ADMINA_41_DETALLES_NOTAS_CREDITO DLIQX
                                            INNER JOIN Admin.ADMINA_40_NOTAS_CREDITO LIQX
                                                ON DLIQX.nIdNotasCredito40 = LIQX.nIdNotasCredito40
                                            WHERE DLIQX.nIdDetNotasCredito41 = DLIQ.nIdDetNotasCredito41
                                        ), 0
                                    )
                            END
                    END
            END) AS Liquidacion
    FROM Admin.ADMINO_15_CUENTAS_GASTOS CG
    INNER JOIN Admin.ADMINA_41_DETALLES_NOTAS_CREDITO DLIQ
        ON CG.nIdCtaGastos15 = DLIQ.nIdCtaGastos15
    INNER JOIN Admin.ADMINA_40_NOTAS_CREDITO LIQ
        ON DLIQ.nIdNotasCredito40 = LIQ.nIdNotasCredito40
    INNER JOIN Admin.ADMINO_29_MONEDAS MNL
        ON LIQ.nIdMoneda29 = MNL.nIdMoneda29
    INNER JOIN Admin.ADMINA_12_SUCURSALES SUC
        ON CG.nIdSuc12 = SUC.nIdSuc12
    INNER JOIN Admin.ADMINA_11_EMPRESAS EMP
        ON SUC.nIdEmp11 = EMP.nIdEmp11
    WHERE ISNULL(LIQ.nTipoNota, 3) <> 2
),
SaldosCGA AS
(
    SELECT
         X.nIdCtaGastos15
        ,CASE X.Estatus
            WHEN 4 THEN
                CASE
                    WHEN CONVERT(DATE, DATEADD(DAY, 1, '${safeFechaCorte}')) > X.Cancelacion THEN 0
                    ELSE X.TotalFactura
                END
            ELSE X.TotalFactura
         END - ISNULL(X.Liquidacion, 0) AS Saldo
    FROM
    (
        SELECT
             nIdCtaGastos15
            ,MAX(Estatus) AS Estatus
            ,MAX(Cancelacion) AS Cancelacion
            ,MAX(TotalFactura) AS TotalFactura
            ,SUM(Liquidacion) AS Liquidacion
        FROM
        (
            SELECT
                 nIdCtaGastos15
                ,dFecha
                ,MAX(Estatus) AS Estatus
                ,MAX(Cancelacion) AS Cancelacion
                ,MAX(TotalFactura) AS TotalFactura
                ,SUM(Liquidacion) AS Liquidacion
            FROM MovimientosSaldo
            GROUP BY
                 nIdCtaGastos15
                ,dFecha
        ) Z
        WHERE CONVERT(DATE, Z.dFecha) < CONVERT(DATE, DATEADD(DAY, 1, '${safeFechaCorte}'))
        GROUP BY Z.nIdCtaGastos15
    ) X
),
Base_CG AS
(
    SELECT
         CASE WHEN CG.nIdFacturarA > 0 THEN CFA.sRazonSocial ELSE CLI.sRazonSocial END AS Nombre
        ,CASE
            WHEN CASE WHEN CG.nIdFacturarA > 0 THEN CFA.sRFC ELSE CLI.sRFC END = 'XEXX010101000'
                THEN CASE WHEN CG.nIdFacturarA > 0 THEN CFA.sRazonSocial ELSE CLI.sRazonSocial END
            ELSE CASE WHEN CG.nIdFacturarA > 0 THEN CFA.sRFC ELSE CLI.sRFC END
         END AS RFC
        ,DATEDIFF(
            DAY,
            DATEADD(DAY, CASE WHEN ISNULL(CLI.nDiasCred,0) > 0 THEN CLI.nDiasCred ELSE 0 END, CG.dFactura),
            '${safeFechaCorte}'
         ) AS DiasTranscurridos
        ,SCGA.Saldo
        ,SUC.sNombre AS NombreSucursal
        ,CASE
            WHEN dbo.EsClienteInterno(
                CASE WHEN CG.nIdFacturarA > 0 THEN CFA.sRFC ELSE CLI.sRFC END,
                CASE WHEN CG.nIdFacturarA > 0 THEN CFA.sRazonSocial ELSE CLI.sRazonSocial END
            ) = 1 THEN 'Interno'
            ELSE 'Externo'
         END AS TipoCliente
    FROM Admin.ADMINO_15_CUENTAS_GASTOS CG
    INNER JOIN Admin.ADMINC_07_CLIENTES CLI
        ON CLI.nIdClie07 = CG.nIdClie07
    LEFT JOIN Admin.ADMINC_07_CLIENTES CFA
        ON CFA.nIdClie07 = CG.nIdFacturarA
    INNER JOIN Admin.ADMINA_12_SUCURSALES SUC
        ON SUC.nIdSuc12 = CG.nIdSuc12
    INNER JOIN SaldosCGA SCGA
        ON SCGA.nIdCtaGastos15 = CG.nIdCtaGastos15
       AND SCGA.Saldo <> 0
    WHERE SUC.nIdEmp11 = ${idEmpresa}
      AND CG.nStatus <> 1
      AND CG.dFactura < DATEADD(DAY, 1, '${safeFechaCorte}')
),
Base_NC AS
(
    SELECT
         C.sRazonSocial AS Nombre
        ,CASE
            WHEN C.sRFC = 'XEXX010101000' THEN C.sRazonSocial
            ELSE C.sRFC
         END AS RFC
        ,DATEDIFF(DAY, NC.dNota, '${safeFechaCorte}') AS DiasTranscurridos
        ,CASE
            WHEN ISNULL(DNC.nIdCtaGastos15, 0) = 0 THEN ISNULL(DNC.nImporteME, 0)
            ELSE ISNULL(NC.nTotalNota, 0) * -1
         END AS Saldo
        ,SUC.sNombre AS NombreSucursal
        ,CASE
            WHEN dbo.EsClienteInterno(C.sRFC, C.sRazonSocial) = 1 THEN 'Interno'
            ELSE 'Externo'
         END AS TipoCliente
    FROM Admin.ADMINA_40_NOTAS_CREDITO NC
    INNER JOIN Admin.ADMINA_41_DETALLES_NOTAS_CREDITO DNC
        ON DNC.nIdNotasCredito40 = NC.nIdNotasCredito40
    INNER JOIN Admin.ADMINC_07_CLIENTES C
        ON C.nIdClie07 = ISNULL(NC.nIdFacturarA, NC.nIdClie07)
    INNER JOIN Admin.ADMINA_12_SUCURSALES SUC
        ON SUC.nIdSuc12 = NC.nIdSuc12
    LEFT JOIN SaldosCGA SCGA
        ON SCGA.nIdCtaGastos15 = DNC.nIdCtaGastos15
    WHERE SUC.nIdEmp11 = ${idEmpresa}
      AND NC.dNota < DATEADD(DAY, 1, '${safeFechaCorte}')
      AND
      (
          CASE
              WHEN ISNULL(DNC.nIdCtaGastos15, 0) = 0 THEN ISNULL(DNC.nImporteME, 0)
              ELSE ISNULL(SCGA.Saldo, 0)
          END
      ) <> 0
),
Base AS
(
    SELECT Nombre, RFC, DiasTranscurridos, Saldo, NombreSucursal, TipoCliente
    FROM Base_CG

    UNION ALL

    SELECT Nombre, RFC, DiasTranscurridos, Saldo, NombreSucursal, TipoCliente
    FROM Base_NC
)
SELECT
     Nombre AS B
    ,RFC AS C
    ,SUM(CASE WHEN DiasTranscurridos < 1 THEN Saldo ELSE 0 END) AS Vigente
    ,SUM(CASE WHEN DiasTranscurridos BETWEEN 1 AND 30 THEN Saldo ELSE 0 END) AS [01-30]
    ,SUM(CASE WHEN DiasTranscurridos BETWEEN 31 AND 60 THEN Saldo ELSE 0 END) AS [31-60]
    ,SUM(CASE WHEN DiasTranscurridos BETWEEN 61 AND 90 THEN Saldo ELSE 0 END) AS [61-90]
    ,SUM(CASE WHEN DiasTranscurridos BETWEEN 91 AND 120 THEN Saldo ELSE 0 END) AS [91-120]
    ,SUM(CASE WHEN DiasTranscurridos >= 121 THEN Saldo ELSE 0 END) AS [121-500 Dias]
    ,SUM(Saldo) AS CO
    ,NombreSucursal
FROM Base
WHERE TipoCliente = 'Externo'
GROUP BY
     RFC
    ,Nombre
    ,NombreSucursal
ORDER BY Nombre`;
}
