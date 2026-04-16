// lib/queries/facturacion.ts

export function buildFacturacionSemanalQuery(year: number, idEmpresa: number): string {
  return `
    SET NOCOUNT ON;

    DECLARE @Table_Facturacion AS TABLE (
        Unidad VARCHAR(100), 
        Oficina VARCHAR(100), 
        Honorarios DECIMAL(24, 2), 
        OtrosIngresos DECIMAL(24, 2), 
        Total DECIMAL(24, 2), 
        PagosHechos DECIMAL(24, 2), 
        Semana INT
    );

    DECLARE @Table_Meses AS TABLE (NumeroMes INT, FechaInicioMes DATE, FechaFinMes DATE);
    
    ;WITH CTE_Meses AS (
		SELECT  
			1 AS NumeroMes,
			DATEFROMPARTS(${year}, 1, 1) AS FechaInicioMes,
			EOMONTH(DATEFROMPARTS(${year}, 1, 1)) AS FechaFinMes
		UNION ALL
		SELECT  
			NumeroMes + 1,
			DATEFROMPARTS(${year}, NumeroMes + 1, 1),
			EOMONTH(DATEFROMPARTS(${year}, NumeroMes + 1, 1))
		FROM CTE_Meses
		WHERE NumeroMes < 12
    )
    INSERT INTO @Table_Meses
    SELECT NumeroMes, FechaInicioMes, FechaFinMes FROM CTE_Meses OPTION (MAXRECURSION 12);

    DECLARE @Cont INT = 1;
    DECLARE @FechaIni DATE;
    DECLARE @FechaFin DATE;

    WHILE @Cont < 13
    BEGIN
        SELECT @FechaIni = FechaInicioMes, @FechaFin = FechaFinMes
        FROM @Table_Meses 
        WHERE NumeroMes = @Cont;
        
        SET @Cont += 1;

        -- Extraer y agrupar por mes individual para evitar Timeouts
        INSERT INTO @Table_Facturacion (Unidad, Oficina, Honorarios, OtrosIngresos, Total, PagosHechos, Semana)
        SELECT
             Unidad
            ,Oficina
            ,SUM(Honorarios_ImpMB)
            ,SUM(Complementarios_ImpMB)
            ,SUM(TotalMB)
            ,SUM(PagosHechosMB)
            ,DATEPART(WEEK, Fecha)
        FROM [dbo].[fn_Facturacion](@FechaIni, @FechaFin, ${idEmpresa})
        GROUP BY 
             Unidad
            ,Oficina
            ,DATEPART(WEEK, Fecha);
    END;

    -- Consolidar la tabla temporal porque una semana puede abarcar dos meses (ej. fin de enero/inicio de feb)
    SELECT 
         Unidad
        ,Oficina
        ,SUM(Honorarios) AS Honorarios
        ,SUM(OtrosIngresos) AS OtrosIngresos
        ,SUM(Total) AS Total
        ,SUM(PagosHechos) AS PagosHechos
        ,Semana
    FROM @Table_Facturacion
    GROUP BY 
         Unidad
        ,Oficina
        ,Semana
    ORDER BY 
         Semana
        ,Oficina;
  `;
}
