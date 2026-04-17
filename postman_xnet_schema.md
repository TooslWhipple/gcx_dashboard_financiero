# Postman - EXEC con schema XNET

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

## 🎯 Opción 1: EXEC con schema XNET (recomendado)

```json
{
  "query": "RVhFQyBYTkVULmRiby5zcF9UZW5kZW5jaWFfQ29icmFkbyAyMDI2LCAxOw=="
}
```

**Query decodificada:**
```sql
EXEC XNET.dbo.sp_Tendencia_Cobrado 2026, 1;
```

---

## 🎯 Opción 2: EXEC con schema XNET y parámetros nombrados

```json
{
  "query": "RVhFQyBYTkVULmRiby5zcF9UZW5kZW5jaWFfQ29icmFkbyBASWRFbXByZXNhID0gMSwgQFllYXIgPSAyMDI2Ow=="
}
```

**Query decodificada:**
```sql
EXEC XNET.dbo.sp_Tendencia_Cobrado @IdEmpresa = 1, @Year = 2026;
```

---

## 🎯 Opción 3: SELECT con schema XNET

```json
{
  "query": "U0VMRUNUICogRlJPTSBYTkVULmRiby5mbl9DR0FfQ29icmFkb3MoJzIwMjYtMDEtMDEnLCAnMjAyNi0wMS0zMScsIDEpOw=="
}
```

**Query decodificada:**
```sql
SELECT * FROM XNET.dbo.fn_CGA_Cobrados('2026-01-01', '2026-01-31', 1);
```

---

## 🎯 Opción 4: WITH SELECT con schema XNET

```json
{
  "query": "V0lUSCBDVEVfTWVzZXMgQVMgKFNFTEVDVCAxIEFTIE51bWVyb01lcywgREFURUZST21QQVJUcygyMDI2LCAxLCAxKSBBUyBGZWNoYUluaWNpbywgRU9NT05USChEQVRFRk9NUEFSVHMoMjAyNiwgMSwgMSkpIEFTIEZlY2hhRmluKSBVTklPTiBBTEwgU0VMRUNUIE51bWVyb01lcyArIDEsIERBVEVGUk9NUEFSVHMoMjAyNiwgTnVtZXJvTWVzICsgMSwgMSksIEVPTU9OVEgoREFURUZST1JNUEFSVFMoMjAyNiwgTnVtZXJvTWVzICsgMSwgMSkpIEZST00gQ1RFX01lc2VzIFdIRVJFIE51bWVyb01lcyA8IDEyKQpTRUxFQ1QKICAgIG0uTnVtZXJvTWVzIEFTIE1lcywKICAgIFNVTShjLkdhc3Rvc01FX0NvYiArIGMuSW5ncmVzb3NNRV9Db2IpIEFRIFRvdGFsQ29icmFkbywKICAgIENPVU5UKCopIEFRIENhbnRpZGFkRmFjdHVyYXMKRlJPTSBDVEVfTWVzZXMgbQpDUkVTUyBBUFBMWSBYTkVULmRiby5mbl9DR0FfQ29icmFkb3MobS5GZWNoYUluaWNpbywgbS5GZWNoYUZpbiwgMSkgYwpHUk9VUCBCWSBtLk51bWVyb01lcwpPUkRFUiBCWSBtLk51bWVyb01lcwpPUFRJT04gKE1BWFJFQ1VSU0lPTiAxMik7"
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
CROSS APPLY XNET.dbo.fn_CGA_Cobrados(m.FechaInicio, m.FechaFin, 1) c
GROUP BY m.NumeroMes
ORDER BY m.NumeroMes
OPTION (MAXRECURSION 12);
```

---

## 🎯 Opción 5: Cartera con schema XNET

```json
{
  "query": "U0VMRUNUIE5vbWJyZSBBUyBDbGllbnRlLCBSRkMgQVMgUkZDLCBTYWxkbyBBcyBUb3RhbCwgRGlhc1RyYW5zY3Vycmlkb3MgQXMgRGlhcywgTm9tYnJlU3VjdXJzYWwgQVMgU3VjdXJzYWwgRlJPTSBYTkVULmRiby5mbl9DdWVudGFzUG9yQ29icmFyX0V4Y2VsKCcyMDI2LTAyLTE1JywgMSkgV0hFUkUgVGlwb0NsaWVudGUgPSAnRXh0ZXJubycgT1JERVIgQnkgRGlhc1RyYW5zY3Vycmlkb3MgREVTQzs="
}
```

**Query decodificada:**
```sql
SELECT Nombre AS Cliente, RFC AS RFC, Saldo As Total, DiasTranscurridos AS Dias, NombreSucursal AS Sucursal 
FROM XNET.dbo.fn_CuentasPorCobrar_Excel('2026-02-15', 1) 
WHERE TipoCliente = 'Externo' 
ORDER BY DiasTranscurridos DESC;
```

---

## 🔧 Para generar tu propio Base64 con XNET

```powershell
# EXEC con XNET
$query = "EXEC XNET.dbo.sp_Tendencia_Cobrado 2026, 1;"
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($query))

# SELECT con XNET
$query = "SELECT * FROM XNET.dbo.fn_CGA_Cobrados('2026-01-01', '2026-01-31', 1);"
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($query))

# Cartera con XNET
$query = "SELECT Nombre AS Cliente, RFC, Saldo, DiasTranscurridos, NombreSucursal FROM XNET.dbo.fn_CuentasPorCobrar_Excel('2026-02-15', 1) WHERE TipoCliente = 'Externo';"
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($query))
```

---

## 📝 Notas importantes sobre XNET

1. **Schema XNET**: `XNET.dbo.sp_NombreProcedimiento`
2. **Funciones**: `XNET.dbo.fn_NombreFuncion`
3. **Tablas**: `XNET.dbo.NombreTabla` (si aplica)
4. **Mismo formato**: Solo se agrega el prefijo `XNET.`

---

## 🚀 Recomendación de prueba

1. **Prueba Opción 1** - EXEC simple con XNET
2. **Si falla, prueba Opción 3** - SELECT simple con XNET  
3. **Si funciona, prueba Opción 4** - WITH SELECT completo

El schema XNET debe resolver el problema de permisos.
