# Postman - Versión con EXEC (si está permitido)

## 📋 Configuración Postman

### **URL y Método**
- **Método**: `POST`
- **URL**: `http://rws.grucas.com:19287/api/reco/encoded`

### **Headers**
| Key | Value |
|-----|-------|
| Content-Type | `application/json` |
| Authorization | `Bearer [TU_TOKEN_BASE64]` |

### **Body (raw JSON) - EXEC directo**

```json
{
  "query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX0NvYnJhZG8gQFllYXIgPSAyMDI2LCBASWRFbXByZXNhID0gMTs="
}
```

### **Body (raw JSON) - EXEC con schema XNET**

```json
{
  "query": "RVhFQyBYTkVULmRiby5zcF9UZW5kZW5jaWFfQ29icmFkbyBAWWVhciA9IDIwMjYsIEBJZEVtcHJlc2EgPSAxOw=="
}
```

---

## 🔍 Si el EXEC no funciona, prueba esta versión SELECT simplificada

```json
{
  "query": "V0lUSCBUQUJMRV9NZXNlcyBBUyAoU0VMRUNUIDE4IEFTIE51bWVyb01lcywgREFURUZST21QQVJUcygyMDI2LCAxLCAxKSBBUyBGZWNoYUluaWNpbywgRU9NT05USChEQVRFRk9STVBBUlRTKDIwMjYsIDEsIDEpKSBBUyBGZWNoYUZpbikgVU5JT04gQUxMIFNFTEVDVCBOdW1lcm9NZXMgKyAxLCBEQVRFRk9STVBBUlRTKDIwMjYsIE51bWVyb01lcyArIDEsIDEpLCBFb01PTlRIKERBVEVGUk9NUEFSVHMoMjAyNiwgTnVtZXJvTWVzICsgMSwgMSkpIEZST00gVEFCTEVfTWVzZXMgV0hFUkUgTnVtZXJvTWVzIDwgMTIpLCBSZXN1bHRhZG9zIFNFIChTRUxFQ1QgbS5OdW1lcm9NZXMgQVMgTWVzLCBWVC5HYXN0b3NNRV9Db2IgKyBWVC5JbmdyZXNvc01FX0NvYiBBcyBUb3RhbENvYnJhZG8sIENTKCkgQVMgQ2FudGlkYWRGYWN0dXJhcyBGUk9NIFRBQkxFX01lc2VzIG0gQ1JPU1MgQVBQTFkgZGJvLmZuX0NHQV9Db2JyYWRvcyhtLkZlY2hhSW5pY2lvLCBtLkZlY2hhRmluLCAxKSBWVCBHUk9VUCBCWSBtLk51bWVyb01lcykgU0VMRUNUIE1lcywgVG90YWxDb2JyYWRvLCBDYW50aWRhZEZhY3R1cmFzIEZST20gUmVzdWx0YWRvcyBPUkRFUiBCWSBNZXM7"
}
```

---

## 🔧 Para generar tu propio Base64

Usa este comando PowerShell para cualquier consulta:

```powershell
# Para EXEC
$query = "EXEC dbo.sp_Tendencia_Cobrado @Year = 2026, @IdEmpresa = 1;"
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($query))

# Para SELECT simplificado
$query = @"
WITH TABLA_Meses AS (SELECT 18 AS NumeroMes, DATEFROMPARTS(2026, 1, 1) AS FechaInicio, EOMONTH(DATEFROMPARTS(2026, 1, 1)) AS FechaFin UNION ALL SELECT NumeroMes + 1, DATEFROMPARTS(2026, NumeroMes + 1, 1), EOMONTH(DATEFROMPARTS(2026, NumeroMes + 1, 1)) FROM TABLA_Meses WHERE NumeroMes < 12), Resultados SE (SELECT m.NumeroMes AS Mes, VT.GastosME_Cob + VT.IngresosME_Cob As TotalCobrado, COUNT(*) AS CantidadFacturas FROM TABLA_Meses m CROSS APPLY dbo.fn_CGA_Cobrados(m.FechaInicio, m.FechaFin, 1) VT GROUP BY m.NumeroMes) SELECT Mes, TotalCobrado, CantidadFacturas From Resultados ORDER BY Mes;
"@
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($query))
```

---

## 🚨 Posibles problemas y soluciones

### **Si dice "EXEC no permitido":**
- Usa la versión SELECT simplificada
- Elimina DECLARE variables
- Usa valores directos en la consulta

### **Si dice "WITH no permitido":**
- Prueba con SELECT simple sin CTEs
- Usa subconsultas en lugar de CTEs

### **Si dice "JOIN no permitido":**
- Usa solo la función directamente sin JOINs
- Procesa los datos en el frontend

---

## 📞 Prueba paso a paso

1. **Primero prueba EXEC simple**:
   ```json
   {"query": "RVhFQyBkYm8uc3BfVGVuZGVuY2lhX0NvYnJhZG8gQFllYXIgPSAyMDI2LCBASWRFbXByZXNhID0gMTs="}
   ```

2. **Si falla, prueba SELECT básico**:
   ```json
   {"query": "U0VMRUNUICogRlJPTSBkYm8uZm5fQ0dBX0NvYnJhZG9zKCcyMDI2LTAxLTAxJywgJzIwMjYtMDEtMzEnLCAxKTs="}
   ```

3. **Si funciona, construye la consulta completa**

---

## 📝 Nota importante

La consulta original que te di tenía:
- DECLARE variables (puede no ser permitido)
- CTEs complejos (puede no ser permitido) 
- Múltiples JOINs (puede no ser permitido)

Prueba primero con el EXEC directo. Si no funciona, usa la versión SELECT simplificada que solo usa la función base.
