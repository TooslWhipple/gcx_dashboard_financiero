-- Test Query para Tendencia de Cobrado (US-001)
-- Reemplaza los valores de las variables según necesites

DECLARE @Year INT = 2026;
DECLARE @IdEmpresa INT = 1;

WITH CTE_Meses AS (
  SELECT 1 AS NumeroMes,
    DATEFROMPARTS(@Year, 1, 1) AS FechaInicioMes,
    EOMONTH(DATEFROMPARTS(@Year, 1, 1)) AS FechaFinMes
  UNION ALL
  SELECT NumeroMes + 1,
    DATEFROMPARTS(@Year, NumeroMes + 1, 1),
    EOMONTH(DATEFROMPARTS(@Year, NumeroMes + 1, 1))
  FROM CTE_Meses WHERE NumeroMes < 12
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

-- Notas para prueba:
-- 1. Asegúrate que la función dbo.fn_CGA_Cobrados exista en tu BD
-- 2. Puedes cambiar @Year y @IdEmpresa para probar con diferentes valores
-- 3. La query devuelve 12 filas (una por mes) con: Mes, TotalCobrado, CantidadFacturas
