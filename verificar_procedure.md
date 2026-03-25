# Verificación y Ejecución de sp_Tendencia_Cobrado

## 🔍 Verificación si el procedure existe

### **Query para verificar existencia:**
```json
{
  "query": "U0VMRUNUIG5hbWUsIGNyZWF0ZV9kYXRlLCBtb2RpZnlfZGF0ZSBGUk9NIHN5cy5wcm9jZWR1cmVzIFdIRVJFIG5hbWUgTElLRSAnJVRlbmRlbmNpYV9Db2JyYWRvJSc7"
}
```

**Query decodificada:**
```sql
SELECT name, create_date, modify_date FROM sys.procedures WHERE name LIKE '%Tendencia_Cobrado%';
```

---

## 🎯 Intentar ejecutar el procedure con diferentes formatos

### **Formato 1: EXEC básico**
```json
{
  "query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX0NvYnJhZG8gMjAyNiwgMTs="
}
```

### **Formato 2: EXEC con parámetros nombrados**
```json
{
  "query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX0NvYnJhZG8gQFllYXIgPSAyMDI2LCBASWRFbXByZXNhID0gMTs="
}
```

### **Formato 3: EXEC con schema XNET**
```json
{
  "query": "RVhFQyBYTkVULmRiby5zcF9UZW5kZW5jaWFfQ29icmFkbyAyMDI2LCAxOw=="
}
```

### **Formato 4: EXEC sin dbo**
```json
{
  "query": "RVhFQyBYTkVULnNwX1RlbmRlbmNpYV9Db2JyYWRvIDIwMjYsIDE7"
}
```

---

## 🔧 Si EXEC no funciona, usar esta alternativa

### **Alternativa 1: SELECT directo a la función base**
```json
{
  "query": "U0VMRUNUICogRlJPTSBkYm8uZm5fQ0dBX0NvYnJhZG9zKCcyMDI2LTAxLTAxJywgJzIwMjYtMDEtMzEnLCAxKTs="
}
```

### **Alternativa 2: WITH SELECT completo (replicando el SP)**
```json
{
  "query": "V0lUSCBDVEVfTWVzZXMgQVMgKFNFTEVDVCAxIEFTIE51bWVyb01lcywgREFURUZST21QQVJUcygyMDI2LCAxLCAxKSBBUyBGZWNoYUluaWNpbywgREFURk5BTUUoTU9OVEgsIERBVEVGUk9NUEFSVFMoMjAyNiwgMSwgMSkpIEFTIE5vbWJyZU1lcywgREFURUZST21QQVJUcygyMDI2LCAxLCAxKSBBUyBGZWNoYUluaWNpbywgRU9NT05USChEQVRFRk9NUEFSVFMoMjAyNiwgMSwgMSkpIEFTIEZlY2hhRmluKSBVTklPTiBBTEwgU0VMRUNUIE51bWVyb01lcyArIDEsIERBVEVGUk9NUEFSVHMoMjAyNiwgTnVtZXJvTWVzICsgMSwgMSksREFURU5BTUUoTU9OVEgsIERBVEVGUk9NUEFSVFMoMjAyNiwgTnVtZXJvTWVzICsgMSwgMSkpLEVPTU9OVEgoREFURUZST1JNUEFSVFMoMjAyNiwgTnVtZXJvTWVzICsgMSwgMSkpIEZST00gQ1RFX01lc2VzIFdIRVJFIE51bWVyb01lcyA8IDEyKQpTRUxFQ1QKICAgIG0uTnVtZXJvTWVzIEFTIE1lcywKICAgIFNVTShjLkdhc3Rvc01FX0NvYiArIGMuSW5ncmVzb3NNRV9Db2IpIEFRIFRvdGFsQ29icmFkbywKICAgIENPVU5UKCopIEFRIENhbnRpZGFkRmFjdHVyYXMKRlJPTSBDVEVfTWVzZXMgbQpDUkVTUyBBUFBMWSBkYm8uZm5fQ0dBX0NvYnJhZG9zKG0uRmVjaGFJbmljaW8sIG0uRmVjaGFGaW4sIDEpIGMKR1JPVVAgQlkgbS5OdW1lcm9NZXMKT1JERVIgQlkgbS5OdW1lcm9NZXMKT1BUSU9OICgnTUFYUkVDVVJTSU9OJyAxMik7"
}
```

---

## 📋 Análisis del procedure original

### **El sp_Tendencia_Cobrado hace:**
1. **Crea tabla temporal** `@Table_Cobrado`
2. **Genera CTE con 12 meses** del año
3. **Usa WHILE loop** para procesar cada mes
4. **Llama a fn_CGA_Cobrados** por cada mes
5. **Hace JOINs** con tablas de admin
6. **Devuelve detalles** de cada factura

### **Problemas para API RECO:**
- ❌ Usa DECLARE variables
- ❌ Usa WHILE loop
- ❌ Usa tablas temporales
- ❌ Usa múltiples JOINs complejos

---

## ✅ Solución recomendada

### **Paso 1: Probar si existe el procedure**
```json
{"query": "U0VMRUNUIG5hbWUgRlJPTSBzeXMucHJvY2VkdXJlcyBXSEVSRSBuYW1lID0gJ3NwX1RlbmRlbmNpYV9Db2JyYWRvJzs="}
```

### **Paso 2: Si existe, probar EXEC**
```json
{"query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX0NvYnJhZG8gMjAyNiwgMTs="}
```

### **Paso 3: Si EXEC falla, usar SELECT**
```json
{"query": "U0VMRUNUICogRlJPTSBkYm8uZm5fQ0dBX0NvYnJhZG9zKCcyMDI2LTAxLTAxJywgJzIwMjYtMDEtMzEnLCAxKTs="}
```

---

## 🎯 Plan de ejecución

### **Orden de prueba:**
1. **Verificar existencia** del procedure
2. **Probar EXEC dbo.sp_**
3. **Probar EXEC XNET.sp_**
4. **Si todo falla, usar SELECT fn_**
5. **Construir query completa** si SELECT funciona

### **Si nada funciona:**
- El problema es la API RECO
- Necesitamos crear una versión simplificada
- Procesar lógica en el frontend

---

## 📊 Resultados esperados

### **Si EXEC funciona:**
- Devuelve JSON con todos los detalles
- Incluye cliente, sucursal, fechas, montos

### **Si SELECT funciona:**
- Devuelve JSON con datos de la función
- Podemos construir la lógica en frontend

### **Si nada funciona:**
- La API RECO está bloqueando todo
- Necesitamos contactar a soporte técnico
