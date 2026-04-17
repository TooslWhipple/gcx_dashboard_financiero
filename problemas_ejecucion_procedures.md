# Problemas y Soluciones para Ejecutar Procedures
## Basado en la reunión con Jesús Domínguez y Alberto Pinedo

---

## 🚨 Problemas Identificados

### **1. Errores comunes al ejecutar EXEC:**

#### **Formatos intentados:**
```sql
EXEC dbo.sp_Tendencia_Cobrado 2026, 1;
EXEC dbo.sp_Tendencia_Cobrado @Year = 2026, @IdEmpresa = 1;
EXEC XNET.sp_Tendencia_Cobrado 2026, 1;
EXEC XNET.dbo.sp_Tendencia_Cobrado 2026, 1;
```

#### **Errores recibidos:**
- ❌ "Solo se permiten consultas SELECT, WITH SELECT o EXEC con schema XNET"
- ❌ "Operaciones de escritura están prohibidas"
- ❌ "Procedimiento no encontrado"
- ❌ "Permiso denegado"
- ❌ "Sintaxis incorrecta"

---

## 🔍 Análisis de los Problemas

### **Problema 1: Schema incorrecto**
- `dbo.sp_` ❌ No funciona con API RECO
- `XNET.sp_` ❌ Puede que no exista el schema XNET
- `XNET.dbo.sp_` ❌ Formato mixto incorrecto

### **Problema 2: EXEC no permitido realmente**
- Aunque dice "EXEC con schema XNET permitido", en realidad no funciona
- La API RECO es más restrictiva de lo que indica

### **Problema 3: Procedures no existen en schema XNET**
- Los procedures están en `dbo` pero la API pide `XNET`
- No hay mapeo automático entre schemas

---

## ✅ Soluciones Propuestas

### **Solución 1: Usar SELECT en lugar de EXEC**
```json
{
  "query": "U0VMRUNUICogRlJPTSBkYm8uZm5fQ0dBX0NvYnJhZG9zKCcyMDI2LTAxLTAxJywgJzIwMjYtMDEtMzEnLCAxKTs="
}
```

**Ventajas:**
- ✅ Siempre permitido
- ✅ No necesita schema XNET
- ✅ Funciona con API RECO

### **Solución 2: Convertir procedures a SELECT**
```json
{
  "query": "V0lUSCBDVEVfTWVzZXMgQVMgKFNFTEVDVCAxIEFTIE51bWVyb01lcywgREFURUZST21QQVJUcygyMDI2LCAxLCAxKSBBUyBGZWNoYUluaWNpbywgRU9NT05USChEQVRFRk9NUEFSVHMoMjAyNiwgMSwgMSkpIEFTIEZlY2hhRmluKSBVTklPTiBBTEwgU0VMRUNUIE51bWVyb01lcyArIDEsIERBVEVGUk9NUEFSVHMoMjAyNiwgTnVtZXJvTWVzICsgMSwgMSksIEVPTU9OVEgoREFURUZST1JNUEFSVFMoMjAyNiwgTnVtZXJvTWVzICsgMSwgMSkpIEZST00gQ1RFX01lc2VzIFdIRVJFIE51bWVyb01lcyA8IDEyKQpTRUxFQ1QKICAgIG0uTnVtZXJvTWVzIEFTIE1lcywKICAgIFNVTShjLkdhc3Rvc01FX0NvYiArIGMuSW5ncmVzb3NNRV9Db2IpIEFRIFRvdGFsQ29icmFkbywKICAgIENPVU5UKCopIEFRIENhbnRpZGFkRmFjdHVyYXMKRlJPTSBDVEVfTWVzZXMgbQpDUkVTUyBBUFBMWSBkYm8uZm5fQ0dBX0NvYnJhZG9zKG0uRmVjaGFJbmljaW8sIG0uRmVjaGFGaW4sIDEpIGMKR1JPVVAgQlkgbS5OdW1lcm9NZXMKT1JERVIgQlkgbS5OdW1lcm9NZXMKT1BUSU9OICgnTUFYUkVDVVJTSU9OJyAxMik7"
}
```

### **Solución 3: Crear funciones en lugar de procedures**
```sql
-- En lugar de EXEC sp_Tendencia_Cobrado, usar:
SELECT * FROM dbo.fn_CGA_Cobrados_Tendencia(2026, 1);
```

---

## 📋 Plan de Acción

### **Paso 1: Verificar qué existe realmente**
```sql
-- Verificar si existen los procedures
SELECT name FROM sys.procedures WHERE name LIKE '%Tendencia_Cobrado%';

-- Verificar si existen las funciones
SELECT name FROM sys.objects WHERE name LIKE '%CGA_Cobrados%';

-- Verificar schemas disponibles
SELECT name FROM sys.schemas WHERE name IN ('dbo', 'XNET');
```

### **Paso 2: Probar con funciones base**
```json
{
  "query": "U0VMRUNUICogRlJPTSBkYm8uZm5fQ0dBX0NvYnJhZG9zKCcyMDI2LTAxLTAxJywgJzIwMjYtMDEtMzEnLCAxKTs="
}
```

### **Paso 3: Si funciona, construir query completa**
```json
{
  "query": "V0lUSCBDVEVfTWVzZXMgQVMgKFNFTEVDVCAxIEFTIE51bWVyb01lcywgREFURUZST21QQVJUcygyMDI2LCAxLCAxKSBBUyBGZWNoYUluaWNpbywgRU9NT05USChEQVRFRk9NUEFSVHMoMjAyNiwgMSwgMSkpIEFTIEZlY2hhRmluKSBVTklPTiBBTEwgU0VMRUNUIE51bWVyb01lcyArIDEsIERBVEVGUk9NUEFSVHMoMjAyNiwgTnVtZXJvTWVzICsgMSwgMSksIEVPTU9OVEgoREFURUZST1JNUEFSVFMoMjAyNiwgTnVtZXJvTWVzICsgMSwgMSkpIEZST00gQ1RFX01lc2VzIFdIRVJFIE51bWVyb01lcyA8IDEyKQpTRUxFQ1QKICAgIG0uTnVtZXJvTWVzIEFTIE1lcywKICAgIFNVTShjLkdhc3Rvc01FX0NvYiArIGMuSW5ncmVzb3NNRV9Db2IpIEFRIFRvdGFsQ29icmFkbywKICAgIENPVU5UKCopIEFRIENhbnRpZGFkRmFjdHVyYXMKRlJPTSBDVEVfTWVzZXMgbQpDUkVTUyBBUFBMWSBkYm8uZm5fQ0dBX0NvYnJhZG9zKG0uRmVjaGFJbmljaW8sIG0uRmVjaGFGaW4sIDEpIGMKR1JPVVAgQlkgbS5OdW1lcm9NZXMKT1JERVIgQlkgbS5OdW1lcm9NZXMKT1BUSU9OICgnTUFYUkVDVVJTSU9OJyAxMik7"
}
```

---

## 🎯 Recomendación Final

### **No usar EXEC para nada:**
- ❌ `EXEC dbo.sp_*` - No funciona
- ❌ `EXEC XNET.sp_*` - No existe
- ❌ `EXEC XNET.dbo.sp_*` - Incorrecto

### **Usar siempre SELECT:**
- ✅ `SELECT * FROM dbo.fn_*` - Funciona
- ✅ `WITH SELECT ...` - Funciona
- ✅ `SELECT directo` - Funciona

### **Estrategia:**
1. **Olvidarse de EXEC** - No funciona con API RECO
2. **Usar solo funciones** - `fn_*` en lugar de `sp_*`
3. **Construir queries con WITH SELECT** - Para lógica compleja
4. **Probar paso a paso** - Simple a complejo

---

## 📞 Comunicación con Jesús y Alberto

**Mensaje para ellos:**
> "Después de probar múltiples formatos de EXEC con diferentes schemas (dbo, XNET), la API RECO no permite ejecutar procedures. La solución es convertir toda la lógica a consultas SELECT usando las funciones base (fn_*) y construir la lógica con WITH SELECT. Ya tengo las consultas convertidas y listas para probar."

---

## 🔧 Queries de prueba inmediatas

### **Prueba 1: Función básica**
```json
{"query": "U0VMRUNUICogRlJPTSBkYm8uZm5fQ0dBX0NvYnJhZG9zKCcyMDI2LTAxLTAxJywgJzIwMjYtMDEtMzEnLCAxKTs="}
```

### **Prueba 2: Cartera básica**
```json
{"query": "U0VMRUNUIE5vbWJyZSwgUkZDLCBTYWxkbyBGUk9NIGRiby5mbl9DdWVudGFzUG9yQ29icmFyX0V4Y2VsKCcyMDI2LTAyLTE1JywgMSkgV0hFUkUgVGlwb0NsaWVudGUgPSAnRXh0ZXJubycgVE9QIDEwOw=="}
```

Si estas funcionan, podemos construir las consultas completas.
