// lib/queries/tendencia-cxc.ts
// Query directa que reemplaza a sp_Tendencia_cartera_CxC
// Calcula la tendencia de cartera (Vigente vs Vencido) por mes
// Resultado: Nombre, RFC, Vigente, Vencido, Saldo, Sucursal, Numero

/**
 * Genera la query SQL para obtener la tendencia de cartera CxC.
 * Reemplaza al SP dbo.sp_Tendencia_cartera_CxC que causaba timeouts/no datos.
 *
 * Usa CTEs para calcular movimientos de saldo, liquidaciones y notas de crédito.
 * Evita el overhead del SP en SQL Server, devolviendo el mismo modelo de tabla.
 */
export function buildTendenciaCxcQuery(year: number, idEmpresa: number): string {
  // Validar entradas
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Año inválido: ${year}`);
  }
  if (!Number.isInteger(idEmpresa) || idEmpresa < 1) {
    throw new Error(`IdEmpresa inválido: ${idEmpresa}`);
  }

  // Inyectar variables directamente en el template para evitar el uso de DECLARE 
  // (ya que el servidor remoto RECO API bloquea variables y pide que inicie con WITH)
  return `WITH CTE_Meses AS
(
    SELECT
         1 AS NumeroMes
        ,DATEFROMPARTS(${year}, 1, 1) AS FechaInicioMes
        ,EOMONTH(DATEFROMPARTS(${year}, 1, 1)) AS FechaFinMes
 
    UNION ALL
 
    SELECT
         NumeroMes + 1
        ,DATEFROMPARTS(${year}, NumeroMes + 1, 1)
        ,EOMONTH(DATEFROMPARTS(${year}, NumeroMes + 1, 1))
    FROM CTE_Meses
    WHERE NumeroMes < 12
),
 
MovimientosSaldo AS
(
    /* =========================
       Liquidaciones de CGA
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
       Notas de crédito aplicadas a CGA
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
 
MovimientosSaldoAgrupados AS
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
),
 
SaldosPorMes AS
(
    SELECT
         M.NumeroMes
        ,M.FechaFinMes
        ,X.nIdCtaGastos15
        ,CASE X.Estatus
            WHEN 4 THEN
                CASE
                    WHEN CONVERT(DATE, DATEADD(DAY, 1, M.FechaFinMes)) > X.Cancelacion THEN 0
                    ELSE X.TotalFactura
                END
            ELSE X.TotalFactura
         END - ISNULL(X.Liquidacion, 0) AS Saldo
    FROM CTE_Meses M
    INNER JOIN
    (
        SELECT
             M2.NumeroMes
            ,M2.FechaFinMes
            ,MSA.nIdCtaGastos15
            ,MAX(MSA.Estatus) AS Estatus
            ,MAX(MSA.Cancelacion) AS Cancelacion
            ,MAX(MSA.TotalFactura) AS TotalFactura
            ,SUM(MSA.Liquidacion) AS Liquidacion
        FROM CTE_Meses M2
        INNER JOIN MovimientosSaldoAgrupados MSA
            ON CONVERT(DATE, MSA.dFecha) < CONVERT(DATE, DATEADD(DAY, 1, M2.FechaFinMes))
        GROUP BY
             M2.NumeroMes
            ,M2.FechaFinMes
            ,MSA.nIdCtaGastos15
    ) X
        ON M.NumeroMes = X.NumeroMes
),
 
Base_CG AS
(
    SELECT
         M.NumeroMes
        ,M.FechaFinMes
        ,CASE
            WHEN CGA.FacturarAidCliente > 0 THEN CGA.FacturarARazonSocialCliente
            ELSE CGA.RazonSocialCliente
         END AS Nombre
        ,CASE
            WHEN
                CASE
                    WHEN CGA.FacturarAidCliente > 0 THEN CGA.FacturarARfcCliente
                    ELSE CGA.RfcCliente
                END = 'XEXX010101000'
            THEN
                CASE
                    WHEN CGA.FacturarAidCliente > 0 THEN CGA.FacturarARazonSocialCliente
                    ELSE CGA.RazonSocialCliente
                END
            ELSE
                CASE
                    WHEN CGA.FacturarAidCliente > 0 THEN CGA.FacturarARfcCliente
                    ELSE CGA.RfcCliente
                END
         END AS RFC
        ,DATEDIFF
         (
            DAY,
            DATEADD(DAY, CASE WHEN CGA.DiasCreditoCliente > 0 THEN CGA.DiasCreditoCliente ELSE 0 END, CGA.Fecha),
            M.FechaFinMes
         ) AS DiasTranscurridos
        ,SPM.Saldo AS Saldo
        ,CASE
            WHEN dbo.EsClienteInterno
                 (
                    CASE WHEN CGA.FacturarAidCliente > 0 THEN CGA.FacturarARfcCliente ELSE C.sRFC END,
                    CASE WHEN CGA.FacturarAidCliente > 0 THEN CGA.FacturarARazonSocialCliente ELSE C.sRazonSocial END
                 ) = 1
            THEN 'Interno'
            ELSE 'Externo'
         END AS TipoCliente
        ,CGA.NombreSucursal
        ,CGA.IdCuentaGastos
    FROM CTE_Meses M
    INNER JOIN Admin.ADMIN_VT_CGastosCabecera CGA WITH (NOLOCK)
        ON CGA.idEmpresa = ${idEmpresa}
       AND CGA.Estatus <> 1
       AND CGA.Fecha < DATEADD(DAY, 1, M.FechaFinMes)
    INNER JOIN Admin.ADMINC_07_CLIENTES C WITH (NOLOCK)
        ON C.nIdClie07 = ISNULL(CGA.FacturarAidCliente, CGA.IdCliente)
    INNER JOIN SaldosPorMes SPM
        ON SPM.NumeroMes = M.NumeroMes
       AND SPM.nIdCtaGastos15 = CGA.IdCuentaGastos
       AND SPM.Saldo <> 0
),
 
Base_NC AS
(
    SELECT DISTINCT
         M.NumeroMes
        ,M.FechaFinMes
        ,C.sRazonSocial AS Nombre
        ,CASE
            WHEN C.sRFC = 'XEXX010101000' THEN C.sRazonSocial
            ELSE C.sRFC
         END AS RFC
        ,DATEDIFF(DAY, NC.dNota, M.FechaFinMes) AS DiasTranscurridos
        ,ISNULL(NC.nTotalNota, 0) * -1 AS Saldo
        ,CASE
            WHEN dbo.EsClienteInterno(C.sRFC, C.sRazonSocial) = 1 THEN 'Interno'
            ELSE 'Externo'
         END AS TipoCliente
        ,SUC.sNombre AS NombreSucursal
    FROM CTE_Meses M
    INNER JOIN Admin.ADMINA_40_NOTAS_CREDITO NC WITH (NOLOCK)
        ON NC.dNota < DATEADD(DAY, 1, M.FechaFinMes)
    INNER JOIN dbo.Admin_VT_Notas_Credito_Detalles VT WITH (NOLOCK)
        ON VT.nIdNotasCredito40 = NC.nIdNotasCredito40
    INNER JOIN Admin.ADMINC_07_CLIENTES C WITH (NOLOCK)
        ON C.nIdClie07 = ISNULL(NC.nIdFacturarA, NC.nIdClie07)
    INNER JOIN Admin.ADMINA_12_SUCURSALES SUC WITH (NOLOCK)
        ON NC.nIdSuc12 = SUC.nIdSuc12
       AND SUC.nIdEmp11 = ${idEmpresa}
    LEFT JOIN SaldosPorMes SPM
        ON SPM.NumeroMes = M.NumeroMes
       AND SPM.nIdCtaGastos15 = VT.nIdCtaGastos15
    WHERE
        CASE
            WHEN VT.EsCGA = 0 THEN VT.ImporteCG
            ELSE ISNULL(SPM.Saldo, 0)
        END <> 0
),
 
Base AS
(
    SELECT
         NumeroMes
        ,FechaFinMes
        ,Nombre
        ,RFC
        ,DiasTranscurridos
        ,Saldo
        ,TipoCliente
        ,NombreSucursal
    FROM Base_CG
 
    UNION ALL
 
    SELECT
         NumeroMes
        ,FechaFinMes
        ,Nombre
        ,RFC
        ,DiasTranscurridos
        ,Saldo
        ,TipoCliente
        ,NombreSucursal
    FROM Base_NC
),
 
Tendencia AS
(
    SELECT
         B.Nombre
        ,B.RFC
        ,SUM(CASE WHEN B.DiasTranscurridos < 1 THEN B.Saldo ELSE 0 END) AS Vigente
        ,SUM(CASE WHEN B.DiasTranscurridos >= 1 THEN B.Saldo ELSE 0 END) AS Vencido
        ,SUM(B.Saldo) AS Saldo
        ,B.NombreSucursal AS Sucursal
        ,B.NumeroMes AS Numero
    FROM Base B
    WHERE B.TipoCliente = 'Externo'
    GROUP BY
         B.RFC
        ,B.Nombre
        ,B.NombreSucursal
        ,B.NumeroMes
)
 
SELECT
     Nombre
    ,RFC
    ,Vigente
    ,Vencido
    ,Saldo
    ,Sucursal
    ,Numero
FROM Tendencia
ORDER BY Numero, Nombre
OPTION (MAXRECURSION 12)`;
}
