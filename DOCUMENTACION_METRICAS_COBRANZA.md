# Documentación de Métricas del Dashboard Financiero
*Para equipo de cobranza y áreas de negocio*

---

## 1. Tendencia de Cobranza (US-001)

### ¿Qué muestra?
El dinero que se ha cobrado mes a mes, comparando el año actual con el año anterior.

### ¿De dónde sale la información?
- **Fuente**: Sistema de facturación y pagos
- **Datos que se usan**: 
  - Fecha del pago
  - Monto cobrado (facturas + notas de crédito)
  - Número de facturas pagadas

### ¿Cómo se calcula?
- Se suman todos los pagos recibidos en cada mes
- Se separan por año actual y año anterior
- Se calcula el porcentaje de crecimiento o disminución

### Ejemplo de datos:
```
Enero 2026: $1,250,000 (45 facturas)
Enero 2025: $980,000 (38 facturas)
Crecimiento: +27.6%
```

---

## 2. Antigüedad de la Cartera (US-002)

### ¿Qué muestra?
Cuánto tiempo tienen las facturas por cobrar, agrupadas en rangos de días.

### ¿De dónde sale la información?
- **Fuente**: Cartera de clientes por cobrar
- **Datos que se usan**:
  - Fecha de vencimiento de la factura
  - Saldo pendiente de cada factura
  - RFC y nombre del cliente
  - Fecha de emisión de la factura

### ¿Cómo se calcula?
- Se cuentan los días desde la fecha de vencimiento hasta hoy
- Se agrupan las facturas en rangos:
  - 1-30 días (corriente)
  - 31-60 días (ligero vencido)
  - 61-90 días (moderado vencido)
  - 91-120 días (crítico vencido)
  - 121+ días (muy crítico)

### Ejemplo de datos:
```
Cliente: ABC Logistics
RFC: ABC123456
- 1-30 días: $45,000
- 31-60 días: $12,000
- 61-90 días: $0
- Total: $57,000
```

---

## 3. Tendencia de la Cartera (US-003)

### ¿Qué muestra?
La evolución mensual de la cartera, separando lo que está al corriente de lo vencido.

### ¿De dónde sale la información?
- **Fuente**: Cartera de clientes por cobrar
- **Datos que se usan**:
  - Mes de emisión de la factura
  - Saldo total de cada factura
  - Días transcurridos desde el vencimiento

### ¿Cómo se calcula?
- **Corriente**: Facturas con 1-30 días de vencido
- **Vencido**: Facturas con 31+ días de vencido
- Se agrupa por mes de emisión, no por mes de cobro

### Ejemplo de datos:
```
Marzo 2026:
- Corriente: $850,000
- Vencido: $125,000
- Total: $975,000
- % Vencido: 12.8%
```

---

## 4. Financiamiento (US-004)

### ¿Qué muestra?
El dinero que los clientes nos deben pero que ya fue financiado por terceros.

### ¿De dónde sale la información?
- **Fuente**: Sistema de financiamiento y factoraje
- **Datos que se usan**:
  - Monto total financiado a cada cliente
  - Monto que ya se facturó/recuperó
  - Nombre de la unidad y oficina

### ¿Cómo se calcula?
- **Por Facturar**: Montos pendientes de documentar
- **Facturado**: Montos ya documentados y cobrados

### Ejemplo de datos:
```
Unidad: AEROMAR
Oficina: CDMX
- Por Facturar: $1,143,737
- Facturado: $5,810,145
```

---

## 5. Estatus de Garantías (US-005)

### ¿Qué muestra?
El estado actual de todas las garantías que los clientes han otorgado.

### ¿De dónde sale la información?
- **Fuente**: Sistema de control de garantías
- **Datos que se usan**:
  - Estatus actual de cada garantía
  - Monto de cada garantía
  - Fecha del último cambio

### ¿Cómo se calcula?
Se cuentan las garantías por estatus:
- **Programadas**: Garantías registradas pero no ejecutadas
- **Naviera**: Garantías en poder de la naviera
- **Operación**: Garantías en proceso operativo
- **Recuperadas**: Garantías que ya se recuperaron

### Ejemplo de datos:
```
Resumen Semanal:
- Programadas: $2,500,000
- Naviera: $1,800,000
- Operación: $950,000
- Recuperadas: $320,000
```

---

## 6. Antigüedad de Garantías (US-006)

### ¿Qué muestra?
Cuánto tiempo tienen las garantías en cada estatus.

### ¿De dónde sale la información?
- **Fuente**: Sistema de control de garantías
- **Datos que se usan**:
  - Fecha de entrada a cada estatus
  - Días transcurridos en cada estatus
  - Monto de la garantía

### ¿Cómo se calcula?
Se cuentan los días desde que la garantía entró al estatus actual hasta hoy.

### Ejemplo de datos:
```
Garantía ABC123:
- Estatus: Operación
- Días en estatus: 45
- Monto: $50,000
```

---

## 7. Tendencia de Garantías Recuperadas (US-006)

### ¿Qué muestra?
El dinero que se ha recuperado de garantías mes a mes, comparando años.

### ¿De dónde sale la información?
- **Fuente**: Sistema de control de garantías
- **Datos que se usan**:
  - Fecha de recuperación de la garantía
  - Monto recuperado
  - Mes y año de recuperación

### ¿Cómo se calcula?
- Se suman todos los montos recuperados en cada mes
- Se comparan con el año anterior
- Se muestra la tendencia de recuperación

### Ejemplo de datos:
```
Febrero 2026: $125,000 recuperados
Febrero 2025: $98,000 recuperados
Tendencia: +27.6%
```

---

## 8. Facturación (US-007)

### ¿Qué muestra?
El dinero que se ha facturado, separando honorarios de otros conceptos.

### ¿De dónde sale la información?
- **Fuente**: Sistema de facturación
- **Datos que se usan**:
  - Tipo de concepto facturado
  - Monto facturado
  - Semana del año

### ¿Cómo se calcula?
- **Honorarios**: Comisiones y fees por servicios
- **Otros**: Conceptos diferentes a honorarios
- Se agrupa por semana del año

### Ejemplo de datos:
```
Semana 10 (Marzo 2026):
- Honorarios: $450,000
- Otros: $125,000
- Total: $575,000
```

---

## 9. Resumen por Oficinas

### ¿Qué muestra?
Cómo se distribuye la cartera entre las diferentes oficinas.

### ¿De dónde sale la información?
- **Fuente**: Cartera de clientes por cobrar
- **Datos que se usan**:
  - Oficina asignada a cada cliente
  - Saldo corriente y vencido
  - Nombre de la oficina

### ¿Cómo se calcula?
- Se agrupa por oficina
- Se separa corriente vs vencido
- Se calcula porcentaje de vencido por oficina

### Ejemplo de datos:
```
Oficina CDMX:
- Corriente: $2,500,000
- Vencido: $350,000
- Total: $2,850,000
- % Vencido: 12.3%
```

---

## Notas Importantes

1. **Frecuencia de actualización**: Los datos se actualizan automáticamente cada vez que se abre el dashboard.

2. **Clientes excluidos**: Se filtran clientes internos y relacionados para mostrar solo la cartera real de clientes externos.

3. **Moneda**: Todos los montos se muestran en pesos mexicanos (MXN).

4. **Fecha de corte**: Las métricas usan la fecha actual como punto de corte para cálculos de antigüedad.

---

## Preguntas Frecuentes

**¿Por qué una factura aparece como vencida si acabo de pagarla?**
- Puede haber un retraso de hasta 24 horas en la actualización del sistema.

**¿Qué significa "corriente" vs "vencido"?**
- **Corriente**: Facturas con menos de 31 días de vencidas
- **Vencido**: Facturas con 31 días o más de vencidas

**¿Cómo se calcula el porcentaje de crecimiento?**
- (Año actual - Año anterior) ÷ Año anterior × 100

---

*Para cualquier duda sobre estos cálculos, contactar al equipo de sistemas.*
