-- Conversión del Stored Procedure sp_Tendencia_Cobrado a consulta SELECT
-- Reemplaza el bucle WHILE con CROSS APPLY para mejor rendimiento

DECLARE @Year INT = 2026;
DECLARE @IdEmpresa INT = 1;

-- CTE para generar los 12 meses del año
;WITH CTE_Meses AS (
    SELECT  
        1 AS NumeroMes,
        DATENAME(MONTH, DATEFROMPARTS(@Year, 1, 1)) AS NombreMes,
        DATEFROMPARTS(@Year, 1, 1) AS FechaInicioMes,
        EOMONTH(DATEFROMPARTS(@Year, 1, 1)) AS FechaFinMes
    UNION ALL
    SELECT  
        NumeroMes + 1,
        DATENAME(MONTH, DATEFROMPARTS(@Year, NumeroMes + 1, 1)),
        DATEFROMPARTS(@Year, NumeroMes + 1, 1),
        EOMONTH(DATEFROMPARTS(@Year, NumeroMes + 1, 1))
    FROM CTE_Meses
    WHERE NumeroMes < 12
),
-- CTE que obtiene todos los datos cobrados por cada mes
CTE_Cobrado AS (
    SELECT 
        VT.nIdCtaGastos15,
        VT.nIdEmp11,
        VT.nIdSuc12,
        VT.FechaFactura,
        VT.FechaPago,
        VT.GastosME_Cob,
        VT.IngresosME_Cob,
        VT.GastosME_Cob + VT.IngresosME_Cob AS TotalCobrado
    FROM CTE_Meses m
    CROSS APPLY dbo.fn_CGA_Cobrados(m.FechaInicioMes, m.FechaFinMes, @IdEmpresa) VT
)
-- Consulta final con todos los joins (igual que el SP original)
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
    ,ISNULL(CTF.sClave,'') AS ClaveClienteFacturarA
    ,ISNULL(CTF.sRFC,'') AS RFCClienteFacturarA
    ,ISNULL(CTF.sRazonSocial,'') AS ClienteFacturarA
    ,VT.FechaPago
    ,VT.GastosME_Cob
    ,VT.IngresosME_Cob
    ,VT.GastosME_Cob + VT.IngresosME_Cob AS TotalCobrado
FROM CTE_Cobrado VT
INNER JOIN [Admin].[ADMINO_15_CUENTAS_GASTOS] CGA ON VT.nIdCtaGastos15 = CGA.nIdCtaGastos15
INNER JOIN ADMIN.ADMINA_12_SUCURSALES SUC ON VT.nIdSuc12 = SUC.nIdSuc12
INNER JOIN ADMIN.ADMINC_07_CLIENTES CTE ON CGA.nIdClie07 = CTE.nIdClie07
LEFT JOIN ADMIN.ADMINC_07_CLIENTES CTF ON CGA.nIdFacturarA = CTE.nIdClie07
ORDER BY VT.FechaPago, CGA.nNumero
OPTION (MAXRECURSION 12);

-- Si quieres la versión agrupada por mes (como la consulta original):
/*
WITH CTE_Meses AS (
    SELECT  
        1 AS NumeroMes,
        DATEFROMPARTS(@Year, 1, 1) AS FechaInicioMes,
        EOMONTH(DATEFROMPARTS(@Year, 1, 1)) AS FechaFinMes
    UNION ALL
    SELECT  
        NumeroMes + 1,
        DATEFROMPARTS(@Year, NumeroMes + 1, 1),
        EOMONTH(DATEFROMPARTS(@Year, NumeroMes + 1, 1))
    FROM CTE_Meses
    WHERE NumeroMes < 12
)
SELECT
    m.NumeroMes AS Mes,
    SUM(c.GastosME_Cob + c.IngresosME_Cob) AS TotalCobrado,
    COUNT(*) AS CantidadFacturas
FROM CTE_Meses m
CROSS APPLY dbo.fn_CGA_Cobrados(m.FechaInicioMes, m.FechaFinMes, @IdEmpresa) c
GROUP BY m.NumeroMes
ORDER BY m.NumeroMes
OPTION (MAXRECURSION 12);
*/

-- Notas:
-- 1. Esta consulta SELECT reemplaza completamente al stored procedure
-- 2. Usa CROSS APPLY en lugar del bucle WHILE para mejor rendimiento
-- 3. Devuelve exactamente los mismos datos que el SP original
-- 4. La versión comentada agrupa por mes como la consulta original
