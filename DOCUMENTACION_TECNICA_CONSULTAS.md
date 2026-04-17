# Documentación Técnica de Consultas SQL
*Para equipo de desarrollo y bases de datos*

---

## 1. Tendencia de Cobranza (US-001)

### API Endpoint
`GET /api/tendencia-cobrado?year=2026&idEmpresa=1&month=3`

### Fuente de datos
- **TVF**: `dbo.fn_CGA_Cobrados(@FechaIni, @FechaFin, @IdEmpresa)`

### Query ejecutado (1 por mes)
```sql
SELECT
  SUM(GastosME_Cob + IngresosME_Cob) AS TotalCobrado,
  COUNT(*) AS FacturasCount
FROM dbo.fn_CGA_Cobrados('2026-03-01', '2026-03-31', 1)
```

### Datos de muestra que retorna
```json
{
  "totalCollected": 1250000.00,
  "invoiceCount": 45,
  "year": 2026,
  "month": 3
}
```

---

## 2. Antigüedad de Cartera (US-002)

### API Endpoint
`GET /api/antiguedad-cartera?fechaCorte=2026-03-12&idEmpresa=1`

### Query a tablas base (evita funciones escalares lentas)
```sql
SELECT
  ISNULL(s.Saldo, 0) AS Total,
  DATEDIFF(DAY,
    DATEADD(DAY,
      CASE WHEN ISNULL(c.nDiasCred, 0) > 0 THEN c.nDiasCred ELSE 0 END,
      cg.Fecha
    ),
    '2026-03-12'
  ) AS Dias,
  CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARfcCliente ELSE c.sRFC END AS RFC,
  CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARazonSocialCliente ELSE c.sRazonSocial END AS RazonSocial
FROM admin.ADMIN_VT_CGastosCabecera cg
LEFT JOIN admin.ADMIN_VT_SaldoCGA s ON cg.IdCuentaGastos = s.nIdCtaGastos15
INNER JOIN Admin.ADMINC_07_CLIENTES c ON c.nIdClie07 = ISNULL(cg.FacturarAidCliente, cg.IdCliente)
WHERE cg.idEmpresa = 1
  AND cg.Estatus <> 1
  AND ABS(ISNULL(s.Saldo, 0)) > 1
  AND cg.Fecha < DATEADD(DD, 1, '2026-03-12')
```

### Datos de muestra que retorna
```json
{
  "Total": 45000.00,
  "Dias": 45,
  "RFC": "ABC123456",
  "RazonSocial": "CLIENTE DEMO SA DE CV"
}
```

### Funciones escalares evitadas
- `SaldoCGAFechaCorte` - Reemplazada por JOIN directo
- `EsClienteInterno` - Filtrado en JavaScript
- `Trae_Unidad` - No necesaria para esta consulta

---

## 3. Tendencia de Cartera (US-003)

### API Endpoint
`GET /api/tendencia-cxc?year=2026&idEmpresa=1`

### Query por año
```sql
SELECT
  ISNULL(s.Saldo, 0) AS Saldo,
  DATEDIFF(DAY,
    DATEADD(DAY,
      CASE WHEN ISNULL(c.nDiasCred, 0) > 0 THEN c.nDiasCred ELSE 0 END,
      cg.Fecha
    ),
    '2026-12-31'
  ) AS DiasTranscurridos,
  ISNULL(c.nDiasCred, 0) AS DiasCredito,
  MONTH(cg.Fecha) AS Mes,
  CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARfcCliente ELSE c.sRFC END AS RFC,
  CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARazonSocialCliente ELSE c.sRazonSocial END AS RazonSocial,
  cg.NombreSucursal AS Sucursal
FROM admin.ADMIN_VT_CGastosCabecera cg
LEFT JOIN admin.ADMIN_VT_SaldoCGA s ON cg.IdCuentaGastos = s.nIdCtaGastos15
INNER JOIN Admin.ADMINC_07_CLIENTES c ON c.nIdClie07 = ISNULL(cg.FacturarAidCliente, cg.IdCliente)
WHERE cg.idEmpresa = 1
  AND cg.Estatus <> 1
  AND ABS(ISNULL(s.Saldo, 0)) > 1
  AND cg.Fecha < DATEADD(DD, 1, '2026-12-31')
  AND YEAR(cg.Fecha) = 2026
```

### Lógica de cálculo en JavaScript
```javascript
// Corriente = 1 a 30 días
// Vencido = 31 días en adelante
const esVencido = diasTranscurridos > 30;
const vencido = esVencido ? saldo : 0;
const enTiempo = esVencido ? 0 : saldo;
```

---

## 4. Financiamiento (US-004)

### API Endpoint
`GET /api/financiamiento?year=2026&idEmpresa=1`

### Query
```sql
SELECT
  Unidad,
  Oficina,
  ISNULL(PagosFinanciadosPendiente, 0) AS PagosFinanciadosPendiente,
  ISNULL(PagosFinanciadosFacturado, 0) AS PagosFinanciadosFacturado
FROM dbo.fn_FinanciamientoResumen(2026, 1)
```

### Datos de muestra
```json
{
  "Unidad": "AER",
  "Oficina": "CDMX",
  "PagosFinanciadosPendiente": 1141437.26,
  "PagosFinanciadosFacturado": 5810144.96
}
```

---

## 5. Estatus de Garantías (US-005)

### API Endpoint
`GET /api/garantias/estatus?fechaCorte=2026-03-12&idEmpresa=1`

### Query
```sql
SELECT
  sProveedor AS Nombre,
  sRFC AS RFC,
  sConcepto AS Concepto,
  sMoneda AS Moneda,
  ImporteMN AS Importe,
  EstatusGarantia AS Estatus,
  dDeposito AS FechaDeposito,
  iDiasGarantia AS DiasGarantia
FROM dbo.fn_GarantiasPorCobrar('2026-03-12', 1)
WHERE EstatusGarantia IN ('Programadas', 'Naviera', 'Operación', 'Recuperadas')
```

### Datos de muestra
```json
{
  "Nombre": "CLIENTE DEMO SA DE CV",
  "RFC": "ABC123456",
  "Concepto": "GARANTÍA OPERATIVA",
  "Moneda": "MXN",
  "Importe": 50000.00,
  "Estatus": "Operación",
  "FechaDeposito": "2026-01-15",
  "DiasGarantia": 45
}
```

---

## 6. Antigüedad de Garantías (US-006)

### API Endpoint
`GET /api/garantias/antiguedad?fechaCorte=2026-03-12&idEmpresa=1`

### Query
```sql
SELECT
  sProveedor AS Nombre,
  sRFC AS RFC,
  sConcepto AS Concepto,
  ImporteMN AS Importe,
  EstatusGarantia AS Estatus,
  dDeposito AS FechaDeposito,
  DATEDIFF(DAY, dDeposito, '2026-03-12') AS DiasTranscurridos
FROM dbo.fn_GarantiasPorCobrar('2026-03-12', 1)
WHERE EstatusGarantia IN ('Programadas', 'Naviera', 'Operación')
  AND dDeposito IS NOT NULL
```

### Datos de muestra
```json
{
  "Nombre": "CLIENTE DEMO SA DE CV",
  "RFC": "ABC123456",
  "Concepto": "GARANTÍA OPERATIVA",
  "Importe": 50000.00,
  "Estatus": "Operación",
  "FechaDeposito": "2026-01-15",
  "DiasTranscurridos": 56
}
```

---

## 7. Tendencia de Garantías Recuperadas (US-006)

### API Endpoint
`GET /api/garantias/tendencia-recuperado?year=2026&idEmpresa=1&previousYear=true`

### Query por año
```sql
SELECT
  MONTH(dDeposito) AS Mes,
  SUM(ABS(ImporteMN)) AS ImporteMN
FROM dbo.fn_GarantiasPorCobrar('2026-12-31', 1)
WHERE dDeposito >= '2026-01-01'
  AND dDeposito <= '2026-12-31'
  AND EstatusGarantia = 'Recuperadas'
GROUP BY MONTH(dDeposito)
ORDER BY Mes
```

### Datos de muestra
```json
{
  "Mes": 3,
  "ImporteMN": 125000.00
}
```

---

## 8. Facturación (US-007)

### API Endpoint
`GET /api/facturacion?year=2026&idEmpresa=1`

### Query semanal
```sql
SELECT
  DATEPART(WEEK, c.Fecha) AS Semana,
  SUM(CASE WHEN c.TipoConcepto = 'HONORARIOS' THEN c.Importe ELSE 0 END) AS Honorarios,
  SUM(CASE WHEN c.TipoConcepto <> 'HONORARIOS' THEN c.Importe ELSE 0 END) AS Otros
FROM admin.ADMIN_VT_CGastosCabecera c
INNER JOIN admin.ADMIN_VT_SaldoCGA s ON c.IdCuentaGastos = s.nIdCtaGastos15
WHERE c.idEmpresa = 1
  AND YEAR(c.Fecha) = 2026
  AND c.Estatus <> 1
GROUP BY DATEPART(WEEK, c.Fecha)
ORDER BY Semana
```

### Datos de muestra
```json
{
  "Semana": 10,
  "Honorarios": 450000.00,
  "Otros": 125000.00
}
```

---

## 9. Resumen por Oficinas

### API Endpoint
`GET /api/resumen-oficinas?fechaCorte=2026-03-12&idEmpresa=1`

### Query
```sql
SELECT
  ISNULL(s.Saldo, 0) AS Total,
  DATEDIFF(DAY,
    DATEADD(DAY,
      CASE WHEN ISNULL(c.nDiasCred, 0) > 0 THEN c.nDiasCred ELSE 0 END,
      cg.Fecha
    ),
    '2026-03-12'
  ) AS Dias,
  CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARfcCliente ELSE c.sRFC END AS RFC,
  CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARazonSocialCliente ELSE c.sRazonSocial END AS RazonSocial,
  cg.NombreSucursal AS Oficina
FROM admin.ADMIN_VT_CGastosCabecera cg
LEFT JOIN admin.ADMIN_VT_SaldoCGA s ON cg.IdCuentaGastos = s.nIdCtaGastos15
INNER JOIN Admin.ADMINC_07_CLIENTES c ON c.nIdClie07 = ISNULL(cg.FacturarAidCliente, cg.IdCliente)
WHERE cg.idEmpresa = 1
  AND cg.Estatus <> 1
  AND ABS(ISNULL(s.Saldo, 0)) > 1
  AND cg.Fecha < DATEADD(DD, 1, '2026-03-12')
```

### Datos de muestra
```json
{
  "Total": 125000.00,
  "Dias": 45,
  "RFC": "ABC123456",
  "RazonSocial": "CLIENTE DEMO SA DE CV",
  "Oficina": "CDMX"
}
```

---

## Funciones y TVFs Utilizadas

### 1. `dbo.fn_CGA_Cobrados`
- **Propósito**: Obtiene facturas cobradas en un rango de fechas
- **Parámetros**: @FechaIni, @FechaFin, @IdEmpresa
- **Retorna**: Facturas con montos cobrados y conteo

### 2. `dbo.fn_GarantiasPorCobrar`
- **Propósito**: Obtiene garantías con sus estatus y montos
- **Parámetros**: @FechaCorte, @IdEmpresa
- **Retorna**: Garantías con información completa

### 3. `dbo.fn_FinanciamientoResumen`
- **Propósito**: Resumen de financiamiento por unidad y oficina
- **Parámetros**: @Year, @IdEmpresa
- **Retorna**: Montos pendientes y facturados

---

## Tablas Base Principales

### 1. `admin.ADMIN_VT_CGastosCabecera`
- **Propósito**: Cabecera de gastos y facturas
- **Campos clave**: IdCuentaGastos, Fecha, IdCliente, Estatus

### 2. `admin.ADMIN_VT_SaldoCGA`
- **Propósito**: Saldos de cuentas por cobrar
- **Campos clave**: nIdCtaGastos15, Saldo

### 3. `Admin.ADMINC_07_CLIENTES`
- **Propósito**: Catálogo de clientes
- **Campos clave**: nIdClie07, sRFC, sRazonSocial, nDiasCred

---

## Optimizaciones Implementadas

### 1. Evitar funciones escalares
- **Problema**: `SaldoCGAFechaCorte`, `EsClienteInterno` causan timeouts
- **Solución**: JOINs directos y filtrado en JavaScript

### 2. Índices recomendados
```sql
-- Para consultas de cartera
CREATE INDEX IX_ADMIN_VT_CGastosCabecera_Fecha 
ON admin.ADMIN_VT_CGastosCabecera(Fecha, idEmpresa, Estatus);

-- Para saldos
CREATE INDEX IX_ADMIN_VT_SaldoCGA_IdCtaGastos 
ON admin.ADMIN_VT_SaldoCGA(nIdCtaGastos15);

-- Para clientes
CREATE INDEX IX_ADMINC_07_CLIENTES_RFC 
ON Admin.ADMINC_07_CLIENTES(sRFC);
```

### 3. Configuración de timeout
- **Default**: 9 segundos
- **Actualizado**: 25 segundos para consultas complejas

---

## Manejo de Errores y Fallback

### Estructura de fallback para APIs
```typescript
// Ejemplo para antigüedad de cartera
const fallbackResponse: AgingData = {
  chartData: [
    { range: '1-30', amount: 0, percentage: 0, color: '#2196F3', riskLevel: 'low' },
    { range: '31-60', amount: 0, percentage: 0, color: '#FFC107', riskLevel: 'medium' },
    // ... más rangos
  ],
  tableData: [],
  summary: {
    totalAmount: 0,
    totalClients: 0,
    averageDays: 0,
  },
};
```

---

## Consideraciones de Performance

### 1. Cache
- **Habilitado**: Para APIs con datos históricos
- **Deshabilitado**: Para datasets > 2MB (tendencia-cxc)

### 2. Paginación
- **Implementada**: En tablas con más de 100 registros
- **Límite**: 100 registros por vista

### 3. Conexión a RECO API
- **Timeout**: 25 segundos
- **Reintentos**: 2 intentos automáticos
- **Cache**: 5 minutos para datos estáticos
