# Documentación Técnica del Dashboard Financiero GCX

> Última actualización: 16 de abril de 2026

Este documento detalla el funcionamiento de cada módulo gráfico y tabular del dashboard, incluyendo: la fuente de datos (SP / función / query), los campos que consume, los cálculos que realiza el backend y el frontend, y el significado de negocio de cada métrica.

---

## Índice

1. [Cobranza — Tendencia de Cobrado](#1-cobranza--tendencia-de-cobrado)
2. [Cartera — Tendencia CxC (Vencido vs En Tiempo)](#2-cartera--tendencia-cxc-vencido-vs-en-tiempo)
3. [Cartera — Antigüedad de Cartera](#3-cartera--antigüedad-de-cartera)
4. [Financiamiento — Tendencia CxC DAC](#4-financiamiento--tendencia-cxc-dac)
5. [Oficinas — Resumen Corporativo por Oficina](#5-oficinas--resumen-corporativo-por-oficina)
6. [Garantías — Estatus de Garantías](#6-garantías--estatus-de-garantías)
7. [Garantías — Antigüedad de Cartera de Garantías](#7-garantías--antigüedad-de-cartera-de-garantías)
8. [Garantías — Tendencia Cartera de Garantías](#8-garantías--tendencia-cartera-de-garantías)
9. [Garantías — Tendencia de Recuperado](#9-garantías--tendencia-de-recuperado)
10. [Facturación — Facturación DAC (Honorarios vs Complementarios)](#10-facturación--facturación-dac-honorarios-vs-complementarios)

---

## 1. Cobranza — Tendencia de Cobrado

### Módulo / Página
**Dashboard Principal** → Sección "Tendencia de Cobrado"

### API Endpoint
```
GET /api/tendencia-cobrado?year=2026&idEmpresa=1
```

### Fuente de datos
- **Query directa** con `CROSS APPLY` a la función `dbo.fn_CGA_Cobrados(@FechaIni, @FechaFin, @IdEmpresa)`
- Archivo de query: `lib/queries/tendencia-cobrado.ts` → función `buildTendenciaCobradoQuery()`
- Genera un CTE con los 12 meses del año y hace `CROSS APPLY` mes a mes.

### Campos que consume de la BD
| Campo BD | Uso |
|---|---|
| `FechaPago` | Se extrae el mes con `new Date(FechaPago).getMonth() + 1` para agrupar por mes |
| `GastosME_Cob` | Componente de gastos del cobro en moneda empresa |
| `IngresosME_Cob` | Componente de ingresos del cobro en moneda empresa |
| `TotalCobrado` | = `GastosME_Cob + IngresosME_Cob` (calculado en la query) |

### Cálculos en el backend (`route.ts`)
| Cálculo | Fórmula |
|---|---|
| **totalCollected por mes** | `SUM(TotalCobrado)` de todas las filas cuyo `FechaPago` cae en ese mes |
| **invoiceCount por mes** | Número de filas (facturas) con `FechaPago` en ese mes |

### Cálculos en el frontend (`CollectionTrendChart.tsx`)
| Métrica | Fórmula | Significado |
|---|---|---|
| **Total Cobrado** | `SUM(totalCollected)` de todos los meses | Suma total de cobranza en el año |
| **Acumulado** | Suma progresiva mes a mes | Permite ver la curva de crecimiento de cobranza |
| **Promedio Mensual** | `Total Cobrado ÷ meses con datos > 0` | Ritmo promedio de cobranza por mes |
| **% Variación** | `((año actual - año anterior) ÷ año anterior) × 100` | Indicador de crecimiento/decrecimiento vs año pasado |

### Gráfica
- **Tipo:** Gráfica de barras con dos series (año actual vs año anterior)
- **Eje X:** Meses (ene, feb, mar, …, dic) — siempre muestra los 12 meses
- **Eje Y:** Monto cobrado en MXN
- **Color azul:** Año actual
- **Color gris:** Año anterior
- **Línea de referencia:** Promedio mensual (línea punteada)

### Significado de negocio
Muestra cuánto dinero se ha cobrado efectivamente cada mes. Compara el desempeño del año actual contra el anterior para detectar tendencias de mejora o deterioro en la cobranza.

---

## 2. Cartera — Tendencia CxC (Vencido vs En Tiempo)

### Módulo / Página
**Cartera** → Sección "Tendencia de Cartera CxC"

### API Endpoint
```
GET /api/tendencia-cxc?year=2026&idEmpresa=1
```

### Fuente de datos
- **Query directa** construida por `lib/queries/tendencia-cxc.ts` → función `buildTendenciaCxcQuery()`
- Basada en la lógica original del SP `sp_Tendencia_cartera_CxC`

### Campos que consume de la BD
| Campo BD | Uso |
|---|---|
| `Nombre` | Nombre del cliente |
| `RFC` | RFC del cliente |
| `Vigente` | Monto de facturas dentro de plazo de crédito (no vencidas) |
| `Vencido` | Monto de facturas fuera de plazo de crédito |
| `Saldo` | Saldo total del cliente = Vigente + Vencido |
| `Numero` / `Mes` | Número de mes (1-12) al que corresponde el registro |
| `Sucursal` | Sucursal/oficina del cliente |

### Cálculos en el backend (`route.ts`)
| Cálculo | Fórmula |
|---|---|
| **onTime por mes** | `SUM(Vigente)` de todas las filas del mes |
| **overdue por mes** | `SUM(Vencido)` de todas las filas del mes |
| **total por mes** | `SUM(Saldo)` = onTime + overdue |
| **overduePercentage** | `(overdue ÷ total) × 100` |

### Cálculos en el frontend (`PortfolioTrendChart.tsx`)
| Métrica | Fórmula | Significado |
|---|---|---|
| **Cartera Total** | `SUM(total)` del último mes con datos | Valor actual de la cartera |
| **% Vencido** | `(overdue ÷ total) × 100` del último mes | Qué tan saludable está la cartera |
| **Promedio Cartera** | `SUM(total de todos los meses) ÷ meses con datos` | Nivel promedio de cartera en el año |

### Gráfica
- **Tipo:** Gráfica de barras apiladas
- **Eje X:** Meses (ene–dic)
- **Eje Y:** Monto en MXN
- **Color verde claro:** En Tiempo (Vigente)
- **Color rojo:** Vencido
- **Tabla asociada:** Detalle por cliente con nombre, RFC, montos vigente/vencido/total

### Significado de negocio
Permite visualizar la evolución mensual de la cartera dividiéndola en "sano" (en tiempo) y "enfermo" (vencido). Un incremento sostenido del rojo indica un problema de cobranza que requiere atención.

---

## 3. Cartera — Antigüedad de Cartera

### Módulo / Página
**Cartera** → Sección "Antigüedad de Cartera"

### API Endpoint
```
GET /api/antiguedad-cartera?fechaCorte=2026-04-16&idEmpresa=1
```

### Fuente de datos
- **Query directa** construida por `lib/queries/antiguedad-cartera.ts` → función `buildAntiguedadCarteraQuery()`
- Usa CTEs sobre la tabla `MovimientosSaldo` y la función `fn_CuentasPorCobrar_Excel`

### Campos que consume de la BD
| Campo BD | Uso |
|---|---|
| `B` / `Nombre` | Nombre del cliente |
| `C` / `RFC` | RFC del cliente |
| `01-30` | Saldo con antigüedad de 1 a 30 días |
| `31-60` | Saldo con antigüedad de 31 a 60 días |
| `61-90` | Saldo con antigüedad de 61 a 90 días |
| `91-120` | Saldo con antigüedad de 91 a 120 días |
| `121-500 Dias` | Saldo con antigüedad mayor a 120 días |
| `CO` / `Total` | Saldo total del cliente |
| `NombreSucursal` | Sucursal de la factura |

### Cálculos en el backend (`route.ts`)
| Cálculo | Fórmula |
|---|---|
| **rangeTotals** | `SUM(valor)` de todas las filas por cada columna de rango |
| **grandTotal** | `SUM(CO)` de todas las filas |
| **percentage** | `(monto del rango ÷ grandTotal) × 100` |

### Cálculos en el frontend (`AgingChart.tsx`)
| Métrica | Fórmula | Significado |
|---|---|---|
| **Total Cartera** | Suma de todos los rangos | Monto total de cuentas por cobrar |
| **Total Clientes** | Cantidad de filas con saldo | Número de clientes con adeudo |
| **Riesgo por rango** | Clasificación: bajo (1-30), medio (31-60), alto (61-90), crítico (91+) | Nivel de riesgo de la deuda |

### Gráfica
- **Tipo:** Gráfica de barras horizontales (una barra por rango)
- **Colores por nivel de riesgo:**
  - 🟢 **1-30 días** → Verde (riesgo bajo)
  - 🟡 **31-60 días** → Amarillo (riesgo medio)
  - 🟠 **61-90 días** → Naranja (riesgo alto)
  - 🔴 **91-120 días** → Rojo (riesgo crítico)
  - ⚫ **121+ días** → Rojo oscuro (riesgo extremo)

### Significado de negocio
Clasifica la cartera por "edad" de la deuda. Las facturas más antiguas son más difíciles de cobrar y representan mayor riesgo. Ideal para priorizar la gestión de cobranza.

---

## 4. Financiamiento — Tendencia CxC DAC

### Módulo / Página
**Financiamiento** → Sección "Tendencia de Financiamiento"

### API Endpoint
```
GET /api/financiamiento?year=2026&idEmpresa=1
```

### Fuente de datos
- **Stored Procedure:** `EXEC dbo.sp_Tendencia_Financiamiento @Year, @IdEmpresa`

### Campos que consume de la BD
| Campo BD | Uso |
|---|---|
| `Unidad` | Unidad de negocio |
| `Oficina` | Oficina/sucursal |
| `FinanciadoPTE` | Montos financiados pendientes de facturar |
| `FinanciadoFAC` | Montos financiados ya facturados |
| `MES` | Número de mes (1-12) |

### Cálculos en el backend (`route.ts`)
| Cálculo | Fórmula |
|---|---|
| **pending por mes** | `SUM(ABS(FinanciadoPTE))` de todas las filas del mes |
| **invoiced por mes** | `SUM(ABS(FinanciadoFAC))` de todas las filas del mes |
| **total por mes** | `pending + invoiced` |

### Cálculos en el frontend (`FinancingTrendChart.tsx`)
| Métrica | Fórmula | Significado |
|---|---|---|
| **Total Financiado** | `SUM(total)` de todos los meses | Monto total financiado en el año |
| **Promedio Mensual** | `Total ÷ meses con datos > 0` | Ritmo promedio de financiamiento |
| **% Pendiente** | `(SUM(pending) ÷ Total) × 100` | Proporción aún no facturada |

### Gráfica
- **Tipo:** Gráfica de barras apiladas
- **Eje X:** Meses
- **Eje Y:** Monto en MXN
- **Color naranja:** Pendiente de facturar (PTE)
- **Color azul:** Ya facturado (FAC)

### Significado de negocio
Muestra la evolución del financiamiento otorgado a clientes. Compara lo que ya se facturó vs lo que está pendiente, para controlar el riesgo de crédito y fiado.

---

## 5. Oficinas — Resumen Corporativo por Oficina

### Módulo / Página
**Oficinas** → Tabla "Resumen Corporativo por Oficina"

### API Endpoint
```
GET /api/resumen-oficinas?fechaCorte=2026-04-16&idEmpresa=1
```

### Fuente de datos
- **Query directa** construida por `lib/queries/resumen-oficinas.ts` → función `buildResumenOficinasQuery()`
- Usa `SELECT` con `CROSS APPLY` a `dbo.fn_CuentasPorCobrar_Excel()` agrupado por oficina
- Clasifica los montos en rangos de antigüedad incluyendo **31-45** y **46-60** separados

### Campos que consume de la BD
| Campo BD | Uso |
|---|---|
| `Oficina` | Nombre de la oficina/sucursal |
| `Fact` | Cantidad de facturas activas |
| `01-30` | Saldo total de facturas con 1-30 días de antigüedad |
| `31-45` | Saldo total de facturas con 31-45 días de antigüedad |
| `46-60` | Saldo total de facturas con 46-60 días de antigüedad |
| `61-90` | Saldo con 61-90 días |
| `91-120` | Saldo con 91-120 días |
| `121-500 Dias` | Saldo con 121+ días |
| `Total` | Saldo total de la oficina |
| `Saldo DAC` | Saldo correspondiente a DAC |
| `Saldos Clientes` | Saldo de clientes |
| `Cobrado` | Monto cobrado |
| `Vencido` | Total de la cartera vencida |

### Cálculos en el backend (`route.ts`)
| Cálculo | Fórmula |
|---|---|
| **range91plus** | `(91-120) + (121-500 Dias)` — se unifica en una sola columna |
| **totals** | `SUM` de cada columna para todas las oficinas |

### Tabla
| Columna UI | Campo fuente |
|---|---|
| Oficina | `Oficina` |
| # Fact | `Fact` |
| 01-30 | `01-30` |
| 31-45 | `31-45` |
| 46-60 | `46-60` |
| 61-90 | `61-90` |
| 91+ | `91-120 + 121-500 Dias` |
| Total | `Total` |
| Saldo DAC | `Saldo DAC` |
| Saldos Clientes | `Saldos Clientes` |
| Cobrado | `Cobrado` |
| Vencido | `Vencido` |

### Significado de negocio
Visión panorámica de la salud financiera de cada oficina. Permite comparar qué oficinas tienen más cartera vencida, más facturas antiguas, y cuáles están cobrando mejor. Las columnas 31-45 y 46-60 permiten un análisis granular del rango "crítico" de 30-60 días donde se deben reforzar las gestiones.

---

## 6. Garantías — Estatus de Garantías

### Módulo / Página
**Garantías** → Sección "Estatus de Garantías"

### API Endpoint
```
GET /api/garantias/estatus?year=2026&idEmpresa=1
```

### Fuente de datos
- **Stored Procedure:** `EXEC dbo.sp_Estatus_Garantia @Year, @IdEmpresa`

### Campos que consume de la BD
| Campo BD | Uso |
|---|---|
| `Estatus` | Clasificación de la garantía: `Programadas`, `Naviera`, `Operación`, `Recuperadas` |
| `ImporteMN` | Monto de la garantía en moneda nacional |
| `MES` | Número de mes (1-12) |

### Cálculos en el backend (`route.ts`)
| Cálculo | Fórmula |
|---|---|
| **Total por estatus por mes** | `SUM(ImporteMN)` agrupado por `Estatus` y `MES` |
| **total por mes** | `scheduled + naviera + operation + recovered` |
| **grandTotal** | Suma de todos los estatus en todos los meses |
| **percentage por estatus** | `(monto estatus ÷ grandTotal) × 100` |

### Gráfica
- **Tipo:** Tabla mensual con 4 columnas de estatus + Gráfica de dona (pie chart)
- **Colores:**
  - 🟡 Programadas
  - 🔵 Naviera
  - 🟠 Operación
  - 🟢 Recuperadas

### Significado de negocio
- **Programadas:** Garantías que han sido programadas para devolución pero aún no se ejecutan
- **Naviera:** Garantías que están en proceso con la naviera (en tránsito)
- **Operación:** Garantías en proceso operativo
- **Recuperadas:** Garantías efectivamente recuperadas (el objetivo)

Un buen indicador es que el porcentaje de "Recuperadas" crezca mes a mes.

---

## 7. Garantías — Antigüedad de Cartera de Garantías

### Módulo / Página
**Garantías** → Sección "Antigüedad de Cartera de Garantías"

### API Endpoint
```
GET /api/garantias/antiguedad?idEmpresa=1
```

### Fuente de datos
- **Query directa** a la función `dbo.fn_GarantiasPorCobrar(@FechaCorte, @IdEmpresa)`

### Campos que consume de la BD
| Campo BD | Uso |
|---|---|
| `DiasTranscurridos` | Días desde la emisión de la garantía — se usa para clasificar en rango |
| `Saldo` | Monto pendiente de cobro de la garantía |
| `sProveedor` | Nombre del proveedor de la garantía |
| `sNombreSucursal` | Sucursal asociada |

### Cálculos en el backend (`route.ts`)
| Cálculo | Fórmula |
|---|---|
| **Clasificación en rangos** | Se usa `DiasTranscurridos` para clasificar: ≤30 → "1-30", ≤60 → "31-60", ≤90 → "61-90", ≤120 → "91-120", >120 → "121+" |
| **totalAmount** | `SUM(Saldo)` de todas las filas |
| **percentage** | `(monto del rango ÷ totalAmount) × 100` |

### Gráfica
- **Tipo:** Gráfica de barras horizontales por rango de antigüedad
- **Colores:** Misma gradación de riesgo que Antigüedad de Cartera CxC

### Significado de negocio
Idéntico concepto que la antigüedad de cartera regular, pero aplicado exclusivamente a las garantías. Permite identificar qué garantías llevan más tiempo sin recuperarse.

---

## 8. Garantías — Tendencia Cartera de Garantías

### Módulo / Página
**Garantías** → Sección "Tendencia de Cartera de Garantías"

### API Endpoint
```
GET /api/garantias/tendencia?year=2026&idEmpresa=1
```

### Fuente de datos
- **Query directa** a `dbo.fn_GarantiasPorCobrar(@FechaCorte, @IdEmpresa)` ejecutada N veces (una por cada viernes/semana del año)
- Se procesan en **lotes paralelos de 5** para optimizar rendimiento

### Umbral de vencimiento
```
OVERDUE_THRESHOLD = 45 días
```

### Campos que consume de la BD
| Campo BD | Uso |
|---|---|
| `sProveedor` | Nombre del proveedor |
| `DiasTranscurridos` | Días desde la emisión — se compara contra 45 para determinar vencido |
| `Saldo` | Monto de la garantía |
| `sNombreSucursal` | Sucursal asociada |

### Cálculos en el backend (`route.ts`)
| Cálculo | Fórmula |
|---|---|
| **Vencido** | `CASE WHEN DiasTranscurridos > 45 THEN Saldo ELSE 0 END` |
| **EnProceso** | `CASE WHEN DiasTranscurridos <= 45 THEN Saldo ELSE 0 END` |
| **totalPortfolio** | `SUM(Saldo)` de la semana |
| **overduePercentage** | `(totalOverdue ÷ totalPortfolio) × 100` |

### Gráfica
- **Tipo:** Gráfica de barras apiladas semanal (últimas 20 semanas)
- **Color verde:** En proceso (< 45 días)
- **Color rojo:** Vencido (> 45 días)

### Significado de negocio
Muestra la evolución semanal de las garantías, permitiendo ver si el monto "vencido" (> 45 días) crece o decrece. Un crecimiento sostenido del rojo indica que las garantías se están atorando en el proceso de recuperación.

---

## 9. Garantías — Tendencia de Recuperado

### Módulo / Página
**Garantías** → Sección "Tendencia de Garantías Recuperadas"

### API Endpoint
```
GET /api/garantias/tendencia-recuperado?year=2026&idEmpresa=1&previousYear=true
```

### Fuente de datos
- **Stored Procedure:** `EXEC dbo.sp_Estatus_Garantia @Year, @IdEmpresa`
- Se filtra solamente el estatus `'Recuperadas'`
- Ejecuta **dos llamadas paralelas**: año actual y año anterior

### Campos que consume de la BD
| Campo BD | Uso |
|---|---|
| `Estatus` | Se filtra por `= 'Recuperadas'` |
| `ImporteMN` | Monto recuperado en moneda nacional |
| `MES` | Número de mes (1-12) |

### Cálculos en el backend (`route.ts`)
| Cálculo | Fórmula |
|---|---|
| **amount por mes** | `SUM(ABS(ImporteMN))` de filas con Estatus = 'Recuperadas' en ese mes |

### Gráfica
- **Tipo:** Gráfica de barras con comparativo (año actual vs anterior)
- **Color azul:** Año actual
- **Color gris:** Año anterior

### Significado de negocio
Mide cuánto dinero en garantías se ha recuperado efectivamente cada mes. La comparación contra el año anterior permite evaluar si la gestión de recuperación está mejorando.

---

## 10. Facturación — Facturación DAC (Honorarios vs Complementarios)

### Módulo / Página
**Facturación** → Sección "Facturación DAC"

### API Endpoint
```
GET /api/facturacion?year=2026&idEmpresa=1&view=semanal|mensual
```

### Fuente de datos

#### Vista Mensual
- **Stored Procedure:** `EXEC dbo.sp_Facturacion @Year, @IdEmpresa`
- El SP internamente recorre los 12 meses y en cada uno ejecuta `dbo.fn_Facturacion(@FechaIni, @FechaFin, @IdEmpresa)`

#### Vista Semanal
- **Query directa fragmentada:** Se ejecutan 12 queries paralelos (uno por mes) a `dbo.fn_Facturacion()`, agrupando por `DATEPART(WEEK, Fecha)`
- Se fragmenta en 12 pedazos para evitar timeouts del servidor

### Campos que consume de la BD
| Campo BD | Uso |
|---|---|
| `Unidad` | Unidad de negocio (ej: "Nue", "Qro") |
| `Oficina` | Nombre de la aduana/oficina |
| `Honorarios_ImpMB` | Monto de honorarios con impuestos en moneda base |
| `Complementarios_ImpMB` | Monto de servicios complementarios con impuestos |
| `TotalMB` | Total en moneda base |
| `PagosHechosMB` | Pagos realizados en moneda base |
| `Fecha` | Fecha de la factura (para agrupar por semana con `DATEPART(WEEK, Fecha)`) |
| `MES` | Número de mes (solo en vista mensual vía SP) |

### Cálculos en el backend (`route.ts`)

#### Vista Mensual
| Cálculo | Fórmula |
|---|---|
| **honorarios por mes** | `SUM(ABS(Honorarios_ImpMB))` agrupado por `MES` |
| **otros por mes** | `SUM(ABS(OtrosIngresos))` agrupado por `MES` |
| **total por mes** | `SUM(ABS(Total))` agrupado por `MES` |

#### Vista Semanal
| Cálculo | Fórmula |
|---|---|
| **honorarios por semana** | `SUM(Honorarios_ImpMB)` agrupado por `DATEPART(WEEK, Fecha)` |
| **otros por semana** | `SUM(Complementarios_ImpMB)` agrupado por `DATEPART(WEEK, Fecha)` |
| **Consolidación** | Si una semana cruza dos meses (ej: sem 5 = fin enero / inicio feb), los resultados se combinan automáticamente en el frontend |

### Cálculos en el frontend (`BillingChart.tsx`)
| Métrica | Fórmula | Significado |
|---|---|---|
| **Total Facturado** | `SUM(honorarios) + SUM(otros)` | Ingreso total por facturación en el período |
| **Total Honorarios** | `SUM(honorarios)` de todas las semanas | Parte correspondiente a servicios de despacho |
| **Total Resto** | `SUM(otros)` de todas las semanas | Complementarios, reembolsos, etc. |
| **Promedio Semanal** | `Total Facturado ÷ semanas con datos > 0` | Ritmo semanal de facturación |
| **Promedio Mensual** | `Total Facturado ÷ meses con datos > 0` | Ritmo mensual de facturación |
| **Corte Mensual** | Se reagrupa las semanas en meses usando `Math.ceil(weekNum / 4.33)` | Vista consolidada mensual derivada de los datos semanales |

### Gráfica
- **Tipo:** Gráfica de barras apiladas
- **Eje X:** Semanas (Sem.01, Sem.02, …)
- **Eje Y:** Montos en MXN
- **Color azul (#3B82F6):** Honorarios (parte inferior de la barra)
- **Color naranja (#F97316):** Resto/Complementarios (parte superior)

### Filtro por Aduana
Permite filtrar por aduana individual o ver "Todas las Aduanas" consolidado.

### Tarjetas de resumen (abajo de la gráfica)
| Tarjeta | Color | Valor |
|---|---|---|
| Total Honorarios | Azul | Suma de honorarios de todo el periodo |
| Resto Facturación | Naranja | Suma de complementarios de todo el periodo |
| Promedio Semanal | Gris | Total ÷ semanas activas |
| Promedio Mensual | Verde | Total ÷ meses activos |

### Significado de negocio
- **Honorarios:** Ingresos propios del despacho aduanal — es el componente de mayor margen
- **Complementarios (Resto):** Servicios adicionales, reembolsos, gastos de operación — menor margen
- La separación permite evaluar qué proporción dele ingreso total es margen sano (honorarios) vs operativo (complementarios)

---

## Arquitectura de Conexión a Datos

### API RECO
Todas las consultas pasan por el middleware RECO:
```
POST http://rws.grucas.com:19287/api/reco/encoded
Headers: Authorization: Bearer <RECO_TOKEN>
Body: { query: "<base64-encoded SQL>", format: "json" }
```

### Funciones y SPs utilizados

| # | Función / SP | Módulo que lo consume |
|---|---|---|
| 1 | `fn_CGA_Cobrados` | Tendencia de Cobrado |
| 2 | `fn_CuentasPorCobrar_Excel` | Antigüedad de Cartera, Resumen por Oficinas, Tendencia CxC |
| 3 | `sp_Tendencia_Financiamiento` | Financiamiento |
| 4 | `sp_Estatus_Garantia` | Estatus de Garantías, Tendencia Recuperado |
| 5 | `fn_GarantiasPorCobrar` | Antigüedad Garantías, Tendencia Garantías |
| 6 | `sp_Facturacion` | Facturación (mensual) |
| 7 | `fn_Facturacion` | Facturación (semanal) |

### Semáforo de Concurrencia
El API RECO tiene limitación de conexiones simultáneas. El cliente (`lib/reco-api.ts`) implementa:
- **Máximo 2 conexiones paralelas**
- Cola de espera cuando el límite se alcanza
- Timeout de 60 segundos por consulta
- Reintentos con backoff exponencial (500ms, 1000ms, 2000ms)

---

## Parámetros Globales

| Parámetro | Descripción | Default |
|---|---|---|
| `year` | Año fiscal a consultar | Año actual |
| `idEmpresa` | ID de empresa en el ERP | `1` |
| `fechaCorte` | Fecha de corte para reportes de saldo | Fecha actual (`YYYY-MM-DD`) |

---

## Variables de Entorno

| Variable | Uso |
|---|---|
| `GCX_USER` | Usuario para el token RECO |
| `GCX_PASSWORD` | Contraseña para el token RECO |
| `RECO_TOKEN` | Token pre-calculado Base64 de `user:password` |
