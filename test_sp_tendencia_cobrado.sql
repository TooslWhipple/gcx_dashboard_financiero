-- Test Query usando el Stored Procedure original sp_Tendencia_Cobrado
-- Esta consulta usa el SP original de la base de datos

-- Ejecutar el Stored Procedure directamente
EXEC dbo.sp_Tendencia_Cobrado 
    @Year = 2026,
    @IdEmpresa = 1;

-- Si quieres agrupar los resultados por mes (similar a la versión con CTE):
-- Puedes envolver el SP en una tabla temporal o CTE

-- Opción 1: Usando tabla temporal
/*
-- Primero ejecutar el SP y guardar resultados en tabla temporal
DECLARE @Resultados TABLE (
    nIdCtaGastos15 INT,
    nIdEmp11 INT,
    nIdSuc12 INT,
    Sucursal VARCHAR(100),
    Factura VARCHAR(100),
    FechaFactura DATE,
    ClaveCliente VARCHAR(50),
    RFCCliente VARCHAR(50),
    Cliente VARCHAR(200),
    ClaveClienteFacturarA VARCHAR(50),
    RFCClienteFacturarA VARCHAR(50),
    ClienteFacturarA VARCHAR(200),
    FechaPago DATE,
    GastosME_Cob DECIMAL(24,2),
    IngresosME_Cob DECIMAL(24,2),
    TotalCobrado DECIMAL(24,2)
);

INSERT INTO @Resultados
EXEC dbo.sp_Tendencia_Cobrado @Year = 2026, @IdEmpresa = 1;

-- Luego agrupar por mes
SELECT 
    MONTH(FechaPago) AS Mes,
    SUM(TotalCobrado) AS TotalCobrado,
    COUNT(*) AS CantidadFacturas
FROM @Resultados
GROUP BY MONTH(FechaPago)
ORDER BY MONTH(FechaPago);
*/

-- Notas para prueba:
-- 1. El SP devuelve detalles completos de cada factura cobrada
-- 2. Incluye información de cliente, sucursal, fechas y montos
-- 3. Para obtener datos agrupados por mes, usa la opción con tabla temporal
-- 4. Puedes cambiar @Year y @IdEmpresa para probar con diferentes valores
