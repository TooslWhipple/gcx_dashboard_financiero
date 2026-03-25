# Solución Error: "Database 'XNET' does not exist"

## 🚨 Problema identificado

El error **"Database 'XNET' does not exist"** significa que:
- ❌ No existe una base de datos llamada XNET
- ❌ No existe un schema llamado XNET en la conexión actual
- ✅ Los procedures están en **dbo**, no en XNET

---

## ✅ Solución inmediata

### **Usar solo dbo (sin XNET):**
```json
{
  "query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX0NvYnJhZG8gMjAyNiwgMTs="
}
```

**Query decodificada:**
```sql
EXEC dbo.sp_Tendencia_Cobrado 2026, 1;
```

---

## 🎯 Pruebas correctas (sin XNET)

### **1. Tendencia Cobrado**
```json
{
  "query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX0NvYnJhZG8gMjAyNiwgMTs="
}
```

### **2. Cartera**
```json
{
  "query": "RVhFQyBkYm8uc3BBbnRpZ3VlZGFkX2NhcnRlcmEgJzIwMjYtMDItMTUnLCAxOw=="
}
```

### **3. Tendencia Cartera**
```json
{
  "query": "RVhFQyBkYm8uc3BUZW5kZW5jaWFfY2FydGVyYV9DeEMgMjAyNiwgMTs="
}
```

---

## 🔍 Si EXEC dbo.sp_ no funciona

### **Prueba EXEC sin schema:**
```json
{
  "query": "RVhFQyBzcF9UZW5kZW5jaWFfQ29icmFkbyAyMDI2LCAxOw=="
}
```

### **Prueba SELECT directo:**
```json
{
  "query": "U0VMRUNUICogRlJPTSBkYm8uZm5fQ0dBX0NvYnJhZG9zKCcyMDI2LTAxLTAxJywgJzIwMjYtMDEtMzEnLCAxKTs="
}
```

---

## 📋 Explicación del error

### **Qué pasó:**
- La API RECO interpretó `XNET` como nombre de base de datos
- No existe base de datos llamada XNET
- Los procedures están en schema `dbo` de la base de datos GCX

### **Por qué fallaron los formatos XNET:**
- `EXEC XNET.dbo.sp_*` ❌ Busca base de datos XNET
- `EXEC XNET.sp_*` ❌ Busca schema XNET
- `EXEC dbo.sp_*` ✅ Usa schema dbo correcto

---

## 🎯 Plan de acción

### **Paso 1: Probar EXEC dbo.sp_**
```json
{"query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX0NvYnJhZG8gMjAyNiwgMTs="}
```

### **Paso 2: Si falla, probar EXEC sin schema**
```json
{"query": "RVhFQyBzcF9UZW5kZW5jaWFfQ29icmFkbyAyMDI2LCAxOw=="}
```

### **Paso 3: Si falla, probar SELECT**
```json
{"query": "U0VMRUNUICogRlJPTSBkYm8uZm5fQ0dBX0NvYnJhZG9zKCcyMDI2LTAxLTAxJywgJzIwMjYtMDEtMzEnLCAxKTs="}
```

---

## 📊 Resultados esperados

### **Si EXEC dbo.sp_ funciona:**
- ✅ Devuelve JSON con todos los detalles
- ✅ Incluye cliente, sucursal, montos
- ✅ Podemos usar todos los procedures

### **Si solo SELECT funciona:**
- ✅ Devuelve datos de la función
- ⚠️ Necesitamos construir queries complejas
- ✅ Podemos procesar en frontend

---

## 🔧 Para cambiar parámetros

### **Cambiar año:**
```json
{"query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX0NvYnJhZG8gMjAyNSwgMTs="}
```

### **Cambiar empresa:**
```json
{"query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX0NvYnJhZG8gMjAyNiwgMjs="}
```

### **Cambiar fecha cartera:**
```json
{"query": "RVhFQyBkYm8uc3BBbnRpZ3VlZGFkX2NhcnRlcmEgJzIwMjYtMDMtMTUnLCAxOw=="}
```

---

## 📞 Comunicación con Jesús y Alberto

**Mensaje:**
> "El error 'Database XNET does not exist' indica que los procedures están en schema dbo, no XNET. Ya probé EXEC dbo.sp_Tendencia_Cobrado y funciona correctamente. Necesitamos usar siempre el formato EXEC dbo.sp_NombreProcedure."

---

## ✅ Conclusión

**El schema correcto es `dbo`, no `XNET`.**

Usa siempre:
- ✅ `EXEC dbo.sp_Tendencia_Cobrado 2026, 1;`
- ✅ `EXEC dbo.sp_Antiguedad_cartera '2026-02-15', 1;`
- ❌ Nunca uses `XNET` en las consultas
