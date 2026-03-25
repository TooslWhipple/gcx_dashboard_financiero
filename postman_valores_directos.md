# Postman - Query con valores directos (sin @variables)

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

## 🎯 Opción 1: EXEC con valores directos

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

## 🎯 Opción 2: SELECT con valores directos

```json
{
  "query": "V0lUSCBDVEVfTWVzZXMgQVMgKFNFTEVDVCAxIEFTIE51bWVyb01lcywgREFURUZST21QQVJUcygyMDI2LCAxLCAxKSBBUyBGZWNoYUluaWNpbywgRU9NT05USChEQVRFRk9NUEFSVHMoMjAyNiwgMSwgMSkpIEFTIEZlY2hhRmluKSBVTklPTiBBTEwgU0VMRUNUIE51bWVyb01lcyArIDEsIERBVEVGUk9NUEFSVHMoMjAyNiwgTnVtZXJvTWVzICsgMSwgMSksIEVPTU9OVEgoREFURUZST1JNUEFSVFMoMjAyNiwgTnVtZXJvTWVzICsgMSwgMSkpIEZST00gQ1RFX01lc2VzIFdIRVJFIE51bWVyb01lcyA8IDEyKQpTRUxFQ1QKICAgIG0uTnVtZXJvTWVzIEFTIE1lcywKICAgIFNVTShjLkdhc3Rvc01FX0NvYiArIGMuSW5ncmVzb3NNRV9Db2IpIEFRIFRvdGFsQ29icmFkbywKICAgIENPVU5UKCopIEFRIENhbnRpZGFkRmFjdHVyYXMKRlJPTSBDVEVfTWVzZXMgbQpDUlNTIEFQUExZIGRiby5mbl9DR0FfQ29icmFkb3MobS5GZWNoYUluaWNpbywgbS5GZWNoYUZpbiwgMSkgYwpHUk9VUCBCWSBtLk51bWVyb01lcwpPUkRFUiBCWSBtLk51bWVyb01lcwpPUFRJT04gKE1BWFJFQ1VSU0lPTiAxMik7"
}
```

**Query decodificada:**
```sql
WITH CTE_Meses AS (
    SELECT 1 AS NumeroMes, 
           DATEFROMPARTS(2026, 1, 1) AS FechaInicio, 
           EOMONTH(DATEFROMPARTS(2026, 1, 1)) AS FechaFin
    UNION ALL
    SELECT NumeroMes + 1, 
           DATEFROMPARTS(2026, NumeroMes + 1, 1), 
           EOMONTH(DATEFROMPARTS(2026, NumeroMes + 1, 1))
    FROM CTE_Meses 
    WHERE NumeroMes < 12
)
SELECT
    m.NumeroMes AS Mes,
    SUM(c.GastosME_Cob + c.IngresosME_Cob) AS TotalCobrado,
    COUNT(*) AS CantidadFacturas
FROM CTE_Meses m
CROSS APPLY dbo.fn_CGA_Cobrados(m.FechaInicio, m.FechaFin, 1) c
GROUP BY m.NumeroMes
ORDER BY m.NumeroMes
OPTION (MAXRECURSION 12);
```

---

## 🎯 Opción 3: SELECT simple (solo función)

```json
{
  "query": "U0VMRUNUICogRlJPTSBkYm8uZm5fQ0dBX0NvYnJhZG9zKCcyMDI2LTAxLTAxJywgJzIwMjYtMDEtMzEnLCAxKTs="
}
```

**Query decodificada:**
```sql
SELECT * FROM dbo.fn_CGA_Cobrados('2026-01-01', '2026-01-31', 1);
```

---

## 🎯 Opción 4: Prueba con diferentes fechas

```json
{
  "query": "U0VMRUNUICogRlJPTSBkYm8uZm5fQ0dBX0NvYnJhZG9zKCcyMDI1LTEyLTAxJywgJzIwMjUtMTItMzEnLCAxKTs="
}
```

**Query decodificada:**
```sql
SELECT * FROM dbo.fn_CGA_Cobrados('2025-12-01', '2025-12-31', 1);
```

---

## 🔧 Para cambiar valores manualmente

**Para cambiar el año:**
- Reemplaza `2026` con el año deseado
- Ejemplo: `2025`, `2024`, etc.

**Para cambiar la empresa:**
- Reemplaza `1` con el ID de empresa deseado
- Ejemplo: `2`, `3`, etc.

**Para cambiar fechas:**
- Formato: `'YYYY-MM-DD'`
- Ejemplo: `'2026-02-01'`, `'2026-02-28'`

---

## 📊 Para generar tu propio Base64

```powershell
# EXEC con valores directos
$query = "EXEC dbo.sp_Tendencia_Cobrado 2026, 1;"
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($query))

# SELECT con valores directos
$query = "SELECT * FROM dbo.fn_CGA_Cobrados('2026-01-01', '2026-01-31', 1);"
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($query))
```

---

## 🚀 Recomendación

1. **Prueba primero la Opción 1 (EXEC)** - Es la más simple
2. **Si falla, prueba la Opción 3 (SELECT simple)** - Solo la función
3. **Si funciona, prueba la Opción 2 (SELECT completo)** - Con todos los meses

Todas usan valores directos sin variables DECLARE.
