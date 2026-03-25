# Pruebas de EXEC - Formatos para probar

## 🎯 Prueba estos formatos en orden

### **Formato 1: EXEC básico con dbo**
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

### **Formato 4: EXEC sin dbo (solo XNET)**
```json
{
  "query": "RVhFQyBYTkVULnNwX1RlbmRlbmNpYV9Db2JyYWRvIDIwMjYsIDE7"
}
```

### **Formato 5: EXEC con paréntesis**
```json
{
  "query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX0NvYnJhZG8gKDIwMjYsIDEpOw=="
}
```

### **Formato 6: EXEC con schema completo**
```json
{
  "query": "RVhFQyBYTkVULmRiby5zcF9UZW5kZW5jaWFfQ29icmFkbyAoMjAyNiwgMSk7"
}
```

---

## 🔍 Pruebas de Cartera también

### **Cartera - Formato 1**
```json
{
  "query": "RVhFQyBkYm8uc3BfQW50aWd1ZWRhZF9jYXJ0ZXJhICcyMDI2LTAyLTE1JywgMTs="
}
```

### **Cartera - Formato 2**
```json
{
  "query": "RVhFQyBYTkVULmRiby5zcF9BbnRpZ3VlZGFkX2NhcnRlcmEgJzIwMjYtMDItMTUnLCAxOw=="
}
```

### **Tendencia Cartera - Formato 1**
```json
{
  "query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX2NhcnRlcmFfQ3hDICcyMDI2JywgJzEnOw=="
}
```

---

## 📋 Configuración Postman (misma para todos)

### **Headers:**
| Key | Value |
|-----|-------|
| Content-Type | `application/json` |
| Authorization | `Bearer [TU_TOKEN_BASE64]` |

### **URL:**
`http://rws.grucas.com:19287/api/reco/encoded`

---

## 🔧 Si alguno funciona, prueba estos parámetros

### **Cambiar año:**
```json
{
  "query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX0NvYnJhZG8gMjAyNSwgMTs="
}
```

### **Cambiar empresa:**
```json
{
  "query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX0NvYnJhZG8gMjAyNiwgMjs="
}
```

### **Cambiar fecha de cartera:**
```json
{
  "query": "RVhFQyBkYm8uc3BfQW50aWd1ZWRhZF9jYXJ0ZXJhICcyMDI2LTAzLTE1JywgMTs="
}
```

---

## 🎯 Orden de prueba recomendado

1. **Formato 1** - EXEC dbo.sp_ (más común)
2. **Formato 3** - EXEC XNET.dbo.sp_ (si piden XNET)
3. **Formato 4** - EXEC XNET.sp_ (sin dbo)
4. **Formato 2** - Con parámetros nombrados
5. **Formato 5** - Con paréntesis
6. **Formato 6** - Schema completo con paréntesis

---

## 📊 Si funciona, anota:

- ✅ **Qué formato funcionó**
- ✅ **Qué parámetros acepta**
- ✅ **Qué devuelve (JSON structure)**
- ✅ **Si necesita schema XNET o dbo**

---

## 🚨 Errores comunes y soluciones

### **Error: "Procedure not found"**
- Prueba con diferentes schemas
- Verifica que el nombre esté exacto

### **Error: "Permission denied"**
- Prueba con schema XNET
- Revisa el token de autorización

### **Error: "Invalid parameters"**
- Prueba con y sin nombres de parámetros
- Prueba con y sin paréntesis

---

## 📞 Para reportar a Jesús y Alberto

**Si funciona:**
> "Formato que funciona: [formato exacto]. Ejemplo: EXEC XNET.dbo.sp_Tendencia_Cobrado 2026, 1;"

**Si no funciona:**
> "Probé todos los formatos de EXEC y ninguno funciona. La API RECO rechaza todos los procedures. Necesitamos usar SELECT."

---

## 🔥 Prueba inmediata

**Copia y pega este primero:**
```json
{
  "query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX0NvYnJhZG8gMjAyNiwgMTs="
}
```

Si este funciona, ya tenemos la solución. Si no, prueba los demás en orden.
