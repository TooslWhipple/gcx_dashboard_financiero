# Plan de Implementación: Cambios al Dashboard

**Basado en:** `Cambios de a dashboard.md`
**Estado:** PLANIFICACIÓN (Pendiente de aprobación)

---

## 1. Tendencia por Cartera (US-002 / US-003)

### Requerimientos:
1. **Renombrar y reordenar métricas:**
   - Nuevo orden para las vistas: Corriente, Vencido, Total.
2. **Colores de la tabla de Tendencia CXC:**
   - Corriente: **Azul**.
   - Vencido: **Rojo** (o Amarillo según una parte del texto, pero asumo Rojo para vencido por convención, aunque el doc menciona *conservar colores corriente azul y vencido amarillo*, luego dice *cambiar rojo a vencido y azul a en tiempo* - **ACLARAR** solo ).
3. **Cálculo del Vencido:**
   - Corriente = dentro del plazo de crédito (1-30 días).
   - Vencido = 31 días o más.
4. **Validación del Total:**
   - El "Total" debe cuadrar exactamente con el total de la cartera del sistema (suma exacta).
5. **Eliminar columnas:**
   - Omitir "Sucursal" en el detalle por cliente en ambas tablas.

---

## 2. Financiamiento (US-004)

### Requerimientos:
1. **Nueva métrica en la tabla:**
   - Agregar columna "Pagos Hechos".
   - Posición: Antes de la columna "Total".
2. **Origen de datos:**
   - *Pendiente:* Esperar a que Rosalinda envíe el mapeo del Excel para saber de qué columna de la base de datos extraer este valor default.

---

## 3. Garantías (US-005 / US-006)

### Requerimientos:
1. **Nuevo Estatus "Recuperadas":**
   - Concepto: Lo que se ha recuperado/cobrado de las garantías.
   - Acción: Agregar a la tabla existente.
2. **Nueva tabla de Tendencia de Recuperado:**
   - Crear una tabla idéntica a la de Tendencia de Cobrado (US-001) pero enfocada solo en Garantías Recuperadas.
3. **Cálculo de Total de Garantías (Por Recuperar):**
   - Nueva fórmula: `Total Por Recuperar = En Proceso + Programadas` (excluye las ya recuperadas del total adeudado).

---

## 4. Facturación (US-008)

### Requerimientos:
1. **Nueva vista Mensual:**
   - Actualmente se muestra por semanas.
   - Acción: Agregar una **nueva tabla** con el corte/acumulado mensual.
   - Restricción: **No sustituir** la tabla de semanas existente. Ambas deben convivir (ej. mediante pestañas "Por Semana" / "Por Mes").

---

## ❓ Preguntas / Aclaraciones Necesarias antes de implementar:

1. **Colores en US-002/003:** El documento menciona *"conservar los colores de corriente azul y vencido amarillo"* pero en la línea de abajo dice *"cambiar el color rojo a vencido y azul a en tiempo"*. ¿Usamos ROJO o AMARILLO para Vencido?
2. **Pagos Hechos en US-004:** Necesitaremos el query o el nombre de la columna para traer ese dato desde RECO. ¿Ya lo tienen o lo dejamos con datos mockeados temporalmente?
3. **Recuperadas en Garantías:** ¿Hay alguna bandera, estatus o fecha en la base de datos que indique que una garantía ya fue "Recuperada"?
