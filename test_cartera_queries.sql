-- Consultas de Cartera - Antigüedad y Tendencia
-- Usando los stored procedures originales y versiones SELECT

-- ========================================
-- 1. ANTIGÜEDAD DE CARTERA (US-002)
-- ========================================

-- Versión con Stored Procedure
/*
EXEC dbo.sp_Antiguedad_cartera 
    @FechaCorte = '2026-02-15',
    @IdEmpresa = 1;
*/

-- Versión SELECT (convertida del SP)
DECLARE @FechaCorte DATE = '2026-02-15';
DECLARE @IdEmpresa INT = 1;

WITH Base AS (
    SELECT *
    FROM dbo.fn_CuentasPorCobrar_Excel(@FechaCorte, @IdEmpresa)
    WHERE TipoCliente = 'Externo'
)
SELECT
     Nombre        AS Cliente
    ,RFC           AS RFC
    ,SUM(CASE WHEN DiasTranscurridos < 1 THEN Saldo ELSE 0 END) AS [Vigente]
    ,SUM(CASE WHEN DiasTranscurridos BETWEEN 01 AND 30 THEN Saldo ELSE 0 END) AS [01-30]
    ,SUM(CASE WHEN DiasTranscurridos BETWEEN 31 AND 60 THEN Saldo ELSE 0 END) AS [31-60]
    ,SUM(CASE WHEN DiasTranscurridos BETWEEN 61 AND 90 THEN Saldo ELSE 0 END) AS [61-90]
    ,SUM(CASE WHEN DiasTranscurridos BETWEEN 91 AND 120 THEN Saldo ELSE 0 END) AS [91-120]
    ,SUM(CASE WHEN DiasTranscurridos >= 121 THEN Saldo ELSE 0 END) AS [121-500 Dias]
    ,SUM(Saldo) AS Total
    ,NombreSucursal AS Sucursal
FROM Base
GROUP BY
    RFC,
    Nombre,
    NombreSucursal
ORDER BY Nombre;

-- ========================================
-- 2. TENDENCIA CARTERA CxC (US-003)
-- ========================================

-- Versión con Stored Procedure
/*
EXEC dbo.sp_Tendencia_cartera_CxC 
    @Year = 2026,
    @IdEmpresa = 1;
*/

-- Versión SELECT (convertida del SP)
DECLARE @Year INT = 2026;
DECLARE @IdEmpresa INT = 1;

WITH CTE_Meses AS (
    SELECT  
        1 AS NumeroMes,
        EOMONTH(DATEFROMPARTS(@Year, 1, 1)) AS FechaFinMes
    UNION ALL
    SELECT  
        NumeroMes + 1,
        EOMONTH(DATEFROMPARTS(@Year, NumeroMes + 1, 1))
    FROM CTE_Meses
    WHERE NumeroMes < 12
),
Base AS (
    SELECT 
        f.Nombre,
        f.RFC,
        SUM(CASE WHEN f.DiasTranscurridos < 1 THEN f.Saldo ELSE 0 END) AS Vigente,
        SUM(CASE WHEN f.DiasTranscurridos >= 1 THEN f.Saldo ELSE 0 END) AS Vencido,
        SUM(f.Saldo) AS Saldo,
        f.NombreSucursal AS Sucursal,
        m.NumeroMes AS Mes
    FROM CTE_Meses m
    CROSS APPLY dbo.fn_CuentasPorCobrar_Excel(m.FechaFinMes, @IdEmpresa) f
    WHERE f.TipoCliente = 'Externo'
    GROUP BY f.Nombre, f.RFC, f.NombreSucursal, m.NumeroMes
)
SELECT 
    Nombre,
    RFC,
    Vigente,
    Vencido,
    Saldo,
    Sucursal,
    Mes
FROM Base
ORDER BY Mes, Nombre
OPTION (MAXRECURSION 12);

-- ========================================
-- 3. VERSIÓN SIMPLIFICADA (solo datos agregados por mes)
-- ========================================

-- Antigüedad de Cartera - Vista simplificada
DECLARE @FechaCorteSimple DATE = '2026-02-15';
DECLARE @IdEmpresaSimple INT = 1;

SELECT
    Nombre AS Cliente,
    RFC,
    Saldo AS Total,
    DiasTranscurridos AS Dias,
    NombreSucursal AS Sucursal
FROM dbo.fn_CuentasPorCobrar_Excel(@FechaCorteSimple, @IdEmpresaSimple)
WHERE TipoCliente = 'Externo'
ORDER BY DiasTranscurridos DESC;

-- Tendencia Cartera - Agregada por mes
DECLARE @YearTendencia INT = 2026;
DECLARE @IdEmpresaTendencia INT = 1;

WITH CTE_Meses AS (
    SELECT 1 AS NumeroMes, EOMONTH(DATEFROMPARTS(@YearTendencia, 1, 1)) AS FechaFinMes
    UNION ALL
    SELECT NumeroMes + 1, EOMONTH(DATEFROMPARTS(@YearTendencia, NumeroMes + 1, 1))
    FROM CTE_Meses WHERE NumeroMes < 12
)
SELECT
    m.NumeroMes AS Mes,
    SUM(CASE WHEN f.DiasTranscurridos < 1 THEN f.Saldo ELSE 0 END) AS Vigente,
    SUM(CASE WHEN f.DiasTranscurridos >= 1 THEN f.Saldo ELSE 0 END) AS Vencido,
    SUM(f.Saldo) AS Total
FROM CTE_Meses m
CROSS APPLY dbo.fn_CuentasPorCobrar_Excel(m.FechaFinMes, @IdEmpresaTendencia) f
WHERE f.TipoCliente = 'Externo'
GROUP BY m.NumeroMes
ORDER BY m.NumeroMes
OPTION (MAXRECURSION 12);

-- Notas:
-- 1. Antigüedad de Cartera: Muestra saldos por rangos de días (Vigente, 1-30, 31-60, etc.)
-- 2. Tendencia Cartera: Muestra evolución mensual de saldos vigentes vs vencidos
-- 3. Todas las consultas filtran solo clientes externos (TipoCliente = 'Externo')
-- 4. Las funciones fn_CuentasPorCobrar_Excel deben existir en la BD
