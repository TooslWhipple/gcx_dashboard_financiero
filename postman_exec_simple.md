# Postman - EXEC XNET.sp_Tendencia_Cobrado (formato simple)

## 📋 Configuración Postman

### **URL y Método**
- **Método**: `POST`
- **URL**: `http://rws.grucas.com:19287/api/reco/encoded`

### **Headers**
| Key | Value |
|-----|-------|
| Content-Type | `application/json` |
| Authorization | `Bearer [TU_TOKEN_BASE64]` |

---

## 🎯 EXEC con formato simple (sin dbo)

```json
{
  "query": "RVhFQyBYTkVULnNwX1RlbmRlbmNpYV9Db2JyYWRvIDIwMjYsIDE7"
}
```

**Query decodificada:**
```sql
EXEC XNET.sp_Tendencia_Cobrado 2026, 1;
```

---

## 🎯 EXEC con parámetros nombrados (sin dbo)

```json
{
  "query": "RVhFQyBYTkVULnNwX1RlbmRlbmNpYV9Db2JyYWRvIEBZZWFyID0gMjAyNiwgQElkRW1wcmVzYSA9IDE7"
}
```

**Query decodificada:**
```sql
EXEC XNET.sp_Tendencia_Cobrado @Year = 2026, @IdEmpresa = 1;
```

---

## 🎯 Cartera - formato simple (sin dbo)

```json
{
  "query": "RVhFQyBYTkVULnNwX0FudGlndWVkYWRfY2FydGVyYSAnMjAyNi0wMi0xNScsIDE7"
}
```

**Query decodificada:**
```sql
EXEC XNET.sp_Antiguedad_cartera '2026-02-15', 1;
```

---

## 🎯 Tendencia Cartera - formato simple (sin dbo)

```json
{
  "query": "RVhFQyBYTkVULnNwX1RlbmRlbmNpYV9jYXJ0ZXJhX0N4QyAyMDI2LCAxOw=="
}
```

**Query decodificada:**
```sql
EXEC XNET.sp_Tendencia_cartera_CxC 2026, 1;
```

---

## 🔧 Para generar tu propio Base64

```powershell
# EXEC simple sin dbo
$query = "EXEC XNET.sp_Tendencia_Cobrado 2026, 1;"
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($query))

# EXEC con parámetros nombrados
$query = "EXEC XNET.sp_Tendencia_Cobrado @Year = 2026, @IdEmpresa = 1;"
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($query))

# Cartera
$query = "EXEC XNET.sp_Antiguedad_cartera '2026-02-15', 1;"
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($query))
```

---

## 📝 Formatos disponibles

| Procedimiento | Formato EXEC |
|---------------|-------------|
| Tendencia Cobrado | `EXEC XNET.sp_Tendencia_Cobrado 2026, 1;` |
| Antigüedad Cartera | `EXEC XNET.sp_Antiguedad_cartera '2026-02-15', 1;` |
| Tendencia Cartera CxC | `EXEC XNET.sp_Tendencia_cartera_CxC 2026, 1;` |
| Estatus Garantías | `EXEC XNET.sp_Estatus_Garantia 2026, 1;` |
| Financiamiento | `EXEC XNET.sp_Tendencia_Financiamiento 2026, 1;` |

---

## 🚀 Para cambiar valores

**Cambiar año:**
- Reemplaza `2026` → `2025`, `2024`, etc.

**Cambiar empresa:**
- Reemplaza `1` → `2`, `3`, etc.

**Cambiar fecha:**
- Reemplaza `'2026-02-15'` → `'2026-03-15'`, etc.

---

## ✅ Ventajas de este formato

1. **Sin dbo** - Más simple y directo
2. **Schema XNET** - Cumple con los requisitos
3. **Valores directos** - Sin variables DECLARE
4. **EXEC permitido** - Según la documentación

Usa el primer JSON para probar la tendencia de cobrado.
