# Cálculos Técnicos — Gráficas del Dashboard Financiero GCX

**Fecha:** 2026-03-09  
**Proyecto:** Dashboard Financiero GCX  
**Propósito:** Explicar cómo se obtienen y calculan los datos de cada gráfica del dashboard.

---

## 1. Tendencia de Cobrado (US-001)

**Tipo de gráfica:** Línea dual (año actual vs año anterior)  
**Periodicidad:** Mensual  
**Endpoint:** `GET /api/tendencia-cobrado?year=2026&idEmpresa=1&month=3`

### Fuente de datos
- **TVF:** `dbo.fn_CGA_Cobrados(@FechaIni, @FechaFin, @IdEmpresa)`

### Query ejecutado (1 por mes)
```sql
SELECT
  SUM(GastosME_Cob + IngresosME_Cob) AS TotalCobrado,
  COUNT(*) AS CantidadFacturas
FROM dbo.fn_CGA_Cobrados('{startDate}', '{endDate}', {idEmpresa})
```

### Cálculo
| Métrica | Fórmula |
|---------|---------|
| **Total Cobrado mensual** | `SUM(GastosME_Cob + IngresosME_Cob)` por mes |
| **Serie año actual** | Meses 1 a N del año seleccionado (N = mes actual si es año en curso) |
| **Serie año anterior** | Mismos meses del año anterior para comparar |

### Parámetros por mes
- `startDate` = primer día del mes (ej: `2026-01-01`)
- `endDate` = último día del mes (ej: `2026-01-31`)

### Estrategia de rendimiento
- Se ejecutan queries individuales por mes (no los 12 juntos)
- Se procesan en **batches de 3 meses** en paralelo
- Si es año en curso, solo se consultan meses hasta el mes actual (evita $0 en meses futuros)

---

## 2. Antigüedad de Cartera (US-002)

**Tipo de gráfica:** Pastel (pie chart) + tabla resumen por rangos  
**Periodicidad:** Snapshot a fecha de corte  
**Endpoint:** `GET /api/antiguedad-cartera?fechaCorte=2026-03-09&idEmpresa=1`

### Fuente de datos
- **Tablas base directas** (no usa `fn_CuentasPorCobrar_Excel` por timeout >30s)

### Query ejecutado
```sql
SELECT
  ISNULL(s.Saldo, 0) AS Total,
  DATEDIFF(DAY,
    DATEADD(DAY,
      CASE WHEN ISNULL(c.nDiasCred, 0) > 0 THEN c.nDiasCred ELSE 0 END,
      cg.Fecha
    ),
    '{fechaCorte}'
  ) AS DiasTranscurridos
FROM admin.ADMIN_VT_CGastosCabecera cg
LEFT JOIN admin.ADMIN_VT_SaldoCGA s ON cg.IdCuentaGastos = s.nIdCtaGastos15
INNER JOIN Admin.ADMINC_07_CLIENTES c ON c.nIdClie07 = ISNULL(cg.FacturarAidCliente, cg.IdCliente)
WHERE cg.idEmpresa = {idEmpresa}
  AND cg.Estatus <> 1
  AND ABS(ISNULL(s.Saldo, 0)) > 1
  AND cg.Fecha < DATEADD(DD, 1, '{fechaCorte}')
```

### Cálculo de DiasTranscurridos (días vencidos)
```
DiasTranscurridos = FechaCorte - (FechaDocumento + DíasCrédito)
```
- Si `DiasTranscurridos > 0` → **Vencido**
- Si `DiasTranscurridos <= 0` → **Vigente**

### Rangos de antigüedad (calculados en JavaScript)
| Rango | Días | Color | Riesgo |
|-------|------|-------|--------|
| 1-30 | 1 a 30 | Verde | Bajo |
| 31-60 | 31 a 60 | Amarillo | Atención |
| 61-90 | 61 a 90 | Naranja | Alerta |
| 91-120 | 91 a 120 | Rojo | Riesgo |
| 121+ | 121 a 5000 | Rojo oscuro | Crítico |

### Métricas mostradas
| Métrica | Fórmula |
|---------|---------|
| **Monto por rango** | `SUM(Saldo)` donde `DiasTranscurridos` cae en el rango |
| **Porcentaje** | `(Monto del rango / Total general) × 100` |
| **Total general** | `SUM(Saldo)` de todos los registros |
| **Promedio días** | `AVG(DiasTranscurridos)` |

### Filtro de clientes internos (aplicado en JavaScript)
Se excluyen clientes internos por RFC o nombre:
- RFCs: `DAC911011F57`, `GCA960517MYA`, `GLE961217IC5`, `KSI980219699`, `UNI931215B65`, `SPC911017BQ1`
- Nombres que inician con: `INTERCONTINENTAL FORWARDING`, `RED TOTAL`

---

## 3. Tendencia Cartera CXC — Vencido vs Corriente (US-003)

**Tipo de gráfica:** Barras apiladas mensuales  
**Periodicidad:** Mensual  
**Endpoint:** `GET /api/tendencia-cxc?year=2026&idEmpresa=1`

### Fuente de datos
- **Tablas base directas** (misma estrategia que US-002)

### Query ejecutado
```sql
SELECT
  ISNULL(s.Saldo, 0) AS Saldo,
  DATEDIFF(DAY,
    DATEADD(DAY,
      CASE WHEN ISNULL(c.nDiasCred, 0) > 0 THEN c.nDiasCred ELSE 0 END,
      cg.Fecha
    ),
    '{fechaCorte}'
  ) AS DiasTranscurridos,
  ISNULL(c.nDiasCred, 0) AS DiasCredito,
  MONTH(cg.Fecha) AS Mes,
  cg.NombreSucursal AS Sucursal
FROM admin.ADMIN_VT_CGastosCabecera cg
LEFT JOIN admin.ADMIN_VT_SaldoCGA s ON cg.IdCuentaGastos = s.nIdCtaGastos15
INNER JOIN Admin.ADMINC_07_CLIENTES c ON c.nIdClie07 = ISNULL(cg.FacturarAidCliente, cg.IdCliente)
WHERE cg.idEmpresa = {idEmpresa}
  AND cg.Estatus <> 1
  AND ABS(ISNULL(s.Saldo, 0)) > 1
  AND cg.Fecha < DATEADD(DD, 1, '{fechaCorte}')
  AND YEAR(cg.Fecha) = {year}
```

### Cálculo Vencido vs Corriente (en JavaScript)
*(Actualizado según nuevos requerimientos)*
```
Si DiasTranscurridos > DiasCredito (facturas con 31+ días de antigüedad) → VENCIDO
Si DiasTranscurridos <= DiasCredito (facturas de 1 a 30 días) → CORRIENTE (antes llamado En Tiempo)
```

### Métricas por mes
| Métrica | Fórmula |
|---------|---------|
| **Corriente** | `SUM(Saldo)` donde `DiasTranscurridos <= DiasCredito` |
| **Vencido** | `SUM(Saldo)` donde `DiasTranscurridos > DiasCredito` |
| **Total** | `Corriente + Vencido` (Debe cuadrar con el total de cartera) |
| **% Vencido** | `(Vencido / Total) × 100` |

---

## 4. Tendencia Financiamiento CxC DAC (US-004)

**Tipo de gráfica:** Barras apiladas — Por Facturar + Facturado  
**Periodicidad:** Mensual (6 meses)  
**Endpoint:** `GET /api/financiamiento?year=2026&idEmpresa=1`

### Fuente de datos
- **TVF:** `dbo.fn_Tendencia_Financiamiento(@FechaIni, @FechaFin, @IdEmpresa)`

### Query ejecutado (1 por mes)
```sql
SELECT
  Unidad,
  Oficina,
  AVG(PagosFinanciadosPendiente) AS PagosFinanciadosPendiente,
  AVG(PagosFinanciadosFacturado) AS PagosFinanciadosFacturado
FROM dbo.fn_Tendencia_Financiamiento('{startDate}', '{endDate}', {idEmpresa})
GROUP BY Unidad, Oficina
```

### Cálculo
| Métrica | Fórmula |
|---------|---------|
| **Por Facturar** | `SUM(ABS(PagosFinanciadosPendiente))` por mes |
| **Facturado** | `SUM(ABS(PagosFinanciadosFacturado))` por mes |
| **Pagos Hechos** | *(Pendiente de mapear desde RECO)* |
| **Total** | `Por Facturar + Facturado` |
| **Promedio mensual** | `Total General / Meses con datos` |

### Notas técnicas
- **Valores negativos:** La función calcula `Pagos - Anticipos`, que puede ser negativo. Se aplica `Math.abs()` en JavaScript.
- **Duplicados:** La función usa `FULL OUTER JOIN ON Unidad` (sin Oficina), creando producto cartesiano. Se resuelve con `AVG + GROUP BY Unidad, Oficina` (~62 filas → ~11 por mes).

---

## 5. Estatus y Tendencia de Garantías (US-005 / US-006)

### A. Estatus de Garantías (Snapshot actual)
**Tipo de gráfica:** Pastel / Tabla resumen  
**Endpoint:** `GET /api/garantias/estatus?year=2026&idEmpresa=1`

*(Actualizado según nuevos requerimientos)*
Se manejarán 3 estatus principales:
1. **Programadas:** Con fecha de recuperación.
2. **En Proceso:** Pendientes de recuperación (incluye Naviera y Operación).
3. **Recuperadas:** Lo que ya se ha cobrado de las garantías.

**Fórmula del Total de Garantías (Por Recuperar):**
`Total Por Recuperar = En Proceso + Programadas`

### B. Tendencia de Garantías (Histórico)
**Tipo de gráfica:** Barras apiladas semanales  
**Endpoint:** `GET /api/garantias/estatus?year=2026&idEmpresa=1`

### C. Nueva Tabla: Tendencia de Recuperado
- Formato idéntico a la Tendencia de Cobrado (US-001).
- Muestra el monto histórico de las garantías marcadas como "Recuperadas".

---

## 6. Resumen Corporativo por Oficina (US-006)

**Tipo de gráfica:** Tabla sorteable  
**Periodicidad:** Snapshot a fecha de corte  
**Endpoint:** `GET /api/resumen-oficinas?fechaCorte=2026-03-09&idEmpresa=1`

### Fuente de datos
- **Tablas base directas** (misma consulta base que US-002, con `NombreSucursal`)

### Cálculo por oficina (en JavaScript)
Los datos se agrupan por `NombreSucursal` y se calculan:

| Métrica | Fórmula |
|---------|---------|
| **Facturas** | `COUNT` de registros por oficina |
| **01-30 días** | `SUM(Saldo)` donde `1 <= DiasTranscurridos <= 30` |
| **31-45 días** | `SUM(Saldo)` donde `31 <= DiasTranscurridos <= 45` |
| **46-60 días** | `SUM(Saldo)` donde `46 <= DiasTranscurridos <= 60` |
| **61-90 días** | `SUM(Saldo)` donde `61 <= DiasTranscurridos <= 90` |
| **91+ días** | `SUM(Saldo)` donde `DiasTranscurridos >= 91` |
| **Total** | `SUM(Saldo)` de todos los registros de la oficina |
| **Vencido** | `SUM(Saldo)` donde `DiasTranscurridos > DiasCredito` |

---

## 7. Facturación DAC (US-008)

*(Nota: En los nuevos requerimientos se le refiere como US-008, aunque en documentación anterior era US-007)*

**Tipo de gráfica:** Barras apiladas (Honorarios + Otros Ingresos)  
**Periodicidad:** Semanal  
**Endpoint:** `GET /api/facturacion?year=2026&idEmpresa=1`

### Fuente de datos
- **Tablas base directas** (consulta directa ~5s)
- ⚠️ `dbo.fn_Facturacion` **NO EXISTE** en RECO

### Query ejecutado
```sql
SELECT
  DATEPART(WEEK, cg.Fecha) AS Semana,
  cg.NombreSucursal AS Oficina,
  ISNULL(s.Saldo, 0) AS Saldo,
  CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARfcCliente ELSE c.sRFC END AS RFC,
  CASE WHEN cg.FacturarAidCliente > 0 THEN cg.FacturarARazonSocialCliente ELSE c.sRazonSocial END AS RazonSocial
FROM admin.ADMIN_VT_CGastosCabecera cg
LEFT JOIN admin.ADMIN_VT_SaldoCGA s ON cg.IdCuentaGastos = s.nIdCtaGastos15
INNER JOIN Admin.ADMINC_07_CLIENTES c ON c.nIdClie07 = ISNULL(cg.FacturarAidCliente, cg.IdCliente)
WHERE cg.idEmpresa = {idEmpresa}
  AND cg.Estatus <> 1
  AND ABS(ISNULL(s.Saldo, 0)) > 1
  AND YEAR(cg.Fecha) = {year}
```

### Cálculo
| Métrica | Fórmula | Nota |
|---------|---------|------|
| **Total semanal** | `SUM(ABS(Saldo))` agrupado por `DATEPART(WEEK)` | |
| **Honorarios** | `Total × 47%` | ⚠️ ESTIMADO (ratio fijo) |
| **Otros Ingresos** | `Total × 53%` | ⚠️ ESTIMADO (ratio fijo) |
| **Promedio semanal** | `Total General / Semanas con datos > 0` | |
| **Por Aduana** | Mismos cálculos agrupados por `NombreSucursal` | |

### Limitación actual
> **Sin `fn_Facturacion`, no existen columnas reales de `Honorarios_ImpMB` ni `Complementarios_ImpMB`.** El desglose 47/53 es una aproximación. Para obtener el desglose real se necesita que RECO cree/habilite `dbo.fn_Facturacion(@FechaIni, @FechaFin, @IdEmpresa)`.

### Con fn_Facturacion (cálculo ideal)
```sql
SELECT
  Unidad, Oficina,
  SUM(Honorarios_ImpMB) AS Honorarios,         -- REAL
  SUM(Complementarios_ImpMB) AS OtrosIngresos,  -- REAL
  SUM(TotalMB) AS Total
FROM dbo.fn_Facturacion('{startDate}', '{endDate}', {idEmpresa})
GROUP BY Unidad, Oficina
```

---

## 8. Tendencia Cartera de Garantías (US-008)

**Tipo de gráfica:** Barras apiladas semanales (Vencido + En Proceso) + Pie chart antigüedad  
**Periodicidad:** Semanal (últimas 20 semanas)  
**Endpoints:**
- Tendencia: `GET /api/garantias/tendencia?year=2026&idEmpresa=1`
- Antigüedad: `GET /api/garantias/antiguedad?idEmpresa=1`

### Fuente de datos
- **TVF:** `dbo.fn_GarantiasPorCobrar(@FechaCorte, @IdEmpresa)`

### Query — Tendencia (1 por semana, viernes)
```sql
SELECT
  sProveedor AS Nombre,
  DiasTranscurridos,
  CASE WHEN DiasTranscurridos > 45 THEN Saldo ELSE 0 END AS Vencido,
  CASE WHEN DiasTranscurridos <= 31 THEN Saldo ELSE 0 END AS EnProceso,
  Saldo,
  sNombreSucursal AS Sucursal
FROM dbo.fn_GarantiasPorCobrar('{fechaCorteViernes}', {idEmpresa})
WHERE Saldo > 0
```

### Query — Antigüedad (snapshot)
```sql
SELECT
  DiasTranscurridos,
  Saldo,
  sProveedor AS Proveedor,
  sNombreSucursal AS Sucursal
FROM dbo.fn_GarantiasPorCobrar('{fechaCorteHoy}', {idEmpresa})
WHERE Saldo > 0
```

### Cálculo
| Métrica | Fórmula |
|---------|---------|
| **Vencido** | `SUM(Saldo)` donde `DiasTranscurridos > 45` |
| **En Proceso** | `SUM(Saldo)` donde `DiasTranscurridos <= 45` |
| **Umbral** | 45 días |

### Rangos de antigüedad (pie chart)
Mismos rangos que US-002: 1-30, 31-60, 61-90, 91-120, 121+

---

## Resumen de Fuentes de Datos

| Módulo | Fuente | Tiempo respuesta |
|--------|--------|-----------------|
| US-001 Tendencia Cobrado | `fn_CGA_Cobrados` (TVF) | ~2.7s por mes |
| US-002 Antigüedad Cartera | Tablas base directas | ~5s |
| US-003 Tendencia CXC | Tablas base directas | ~5s |
| US-004 Financiamiento | `fn_Tendencia_Financiamiento` (TVF) | ~2s por mes |
| US-005 Estatus Garantías | `fn_Garantias_Estatus` (TVF) | ~3s |
| US-006 Resumen Oficinas | Tablas base directas | ~5s |
| US-007 Facturación | Tablas base directas (sin fn_Facturacion) | ~5s |
| US-008 Cartera Garantías | `fn_GarantiasPorCobrar` (TVF) | ~2s |

---

*Documento generado el 2026-03-09 — Dashboard Financiero GCX*
