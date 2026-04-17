import Redis from 'ioredis';

// Obtenemos las credenciales desde variables de entorno
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

// Si la contraseña tiene comillas (por problemas en .env), las quitamos
const cleanPassword = REDIS_PASSWORD.replace(/^['"](.*)['"]$/, '$1');

// Singleton instance to prevent creating multiple connections in dev
const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: cleanPassword,
    maxRetriesPerRequest: 3,
    // Habilitar reintento automático
    retryStrategy: (times) => {
      if (times > 3) {
        console.error('[Redis] Max retries reached, giving up.');
        return null;
      }
      return Math.min(times * 500, 2000);
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

redis.on('error', (err) => {
  console.error('[Redis Error]', err);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

export default redis;
