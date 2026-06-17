import { createClient } from 'redis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

class RedisClient {
  public client: ReturnType<typeof createClient>;

  constructor() {
    this.client = createClient({
      url: env.REDIS_URL,
    });

    this.client.on('error', (err) => logger.error({ err }, 'Redis Client Error'));
    this.client.on('connect', () => logger.info('Redis Client Connected'));
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async disconnect() {
    if (this.client.isOpen) {
      await this.client.disconnect();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async set(key: string, value: any, ttlSeconds: number = 86400): Promise<void> {
    await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
  }
  
  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}

export const redisClient = new RedisClient();
