---
description: Iniciar Redis local con Docker para cache de desarrollo
---

# Redis Local para GCX Dashboard

Inicia Redis localmente para cachear datos de Cockpit, reportes IA y queries RECO.

## 1. Iniciar Redis

```bash
docker compose up -d redis
```

// turbo
```

## 2. Verificar que funciona

```bash
docker exec gcx-redis redis-cli ping
```

Debe responder `PONG`.

## 3. Configurar entorno local

Copiar `.env.local.example` a `.env.local`:

```bash
copy .env.local.example .env.local
```

Asegurar que tenga:
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 4. Ver logs

```bash
docker logs -f gcx-redis
```

## 5. Detener Redis

```bash
docker compose down
```

## Opcional: RedisInsight (UI gráfica)

Para explorar datos visualmente:

```bash
docker compose up -d redisinsight
```

Abrir: http://localhost:5540

Agregar conexión: `localhost:6379` sin password.

## Persistencia

- Los datos se guardan en volumen `redis_data`
- Para limpiar cache: `docker compose down -v` (elimina volumen)
- Para backup: `docker exec gcx-redis redis-cli BGSAVE`
