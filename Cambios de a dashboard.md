**Tendencia por Cartera US-002**

* **Cambio de orden y cálculo del Total:** Se solicitó ordenar los rubros comenzando por "Corriente", seguido de "Vencido" y al final un "Total" conservar los colores de corriente azul y vencido amarillo.  
  * *Cálculo / Origen de datos:* El "Total" no debe ser solo la suma matemática en el sistema, sino que tiene que cuadrar para ser exactamente igual al saldo total de la cartera.  
    en la tabla de Tendencia de la Cartera CXC cambiar el color rojo a vencido y azul a en tiempo (Corriente).  
* **Renombrar y clasificar categorías:** Pidieron modificar la etiqueta de "1 a 30 días" (o "En tiempo") para que se llame "Corriente".  
  * *Cálculo / Origen de datos:* Lo "Corriente" es el crédito otorgado dentro del plazo. Las facturas que tengan de 31 días en adelante se deben empezar a computar y clasificar dentro del rango de "Vencido".  
  * demás, para esta visualización acordaron el siguiente orden:  
1. **En tiempo** (el cual pidieron renombrar como **"Corriente"**, correspondiente a los créditos de 1 a 30 días).  
2. **Vencido** (todo el resto de los días).  
3. **Total** (que debe cuadrar con el total de la cartera)  
* **Eliminar campos innecesarios:** En el apartado de detalle por cliente, se solicitó omitir el campo de "Sucursal" (que representaba puertos) ya que no aplica para este análisis en ambas tablas   
  * 

  **Financiamiento US-004**.

* **Agregar pagos hechos:** se hace falta incluir los "pagos hechos" para poder ver el financiamiento real que ya está en cartera, solo agregar campo en la tabla Tendencia Financiamiento en CxC DAC antes del total .  
  * *Cálculo / Origen de datos:* Para extraer correctamente esta métrica, se acordó que Rosalinda enviará las observaciones y los títulos exactos de las celdas de su archivo Excel para mapear de dónde obtiene esos importes

**Garantías US-005/ US-006**

* **Agregar estatus "Recuperadas":** El dashboard solo mostraba garantías "programadas" y "en proceso", por lo que solicitaron agregar la categoría de garantías "recuperadas".  
  * *Cálculo / Origen de datos:* Se define conceptualmente como "lo que hemos recuperado o cobrado de las garantías" esto es la tabla, no se modificara esta sección más que la nueva tabla.  
* **Nueva tabla de tendencia:** Se pidió crear una tabla de tendencia de lo recuperado en garantías, idéntica a la tabla que ya existe para la tendencia de la cartera cobrada, idéntica a la tabla que ya existe para mostrar la tendencia de "lo cobrado en la cartera.  
* **Cálculo del Total de garantías:**  
  * *Cálculo / Origen de datos:* Se especificó que la suma total de lo que se trae en garantías (por recuperar) debe ser el resultado exacto de sumar lo que está "en proceso" (pendiente de recuperar) más lo "programado" (lo que ya tiene fecha de recuperación)

**Facturación US-008**

* **Corte mensual en formato de tabla:** Observaron que la facturación se estaba mostrando por semanas (ej. semana cuatro), por lo que solicitaron agregar un corte o total mensual, nueva tabla de corte mensual, no sustituir la tabla ya existente por semanas.  
  * *Cálculo / Origen de datos:* Agrupar la información semanal para obtener cuánto fue el total acumulado por cada mes (enero, febrero, marzo, etc.).