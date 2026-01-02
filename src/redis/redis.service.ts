import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { default as Redis, RedisOptions } from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis
  constructor(readonly configService: ConfigService) {
    const redisConfig = configService.get<RedisOptions>('redis')
    if (!redisConfig) {
      throw new Error('Redis config is not set')
    }
    this.redis = new Redis(redisConfig)
  }

  public async redisClient(): Promise<Redis> {
    if (this.redis.status === 'close' || this.redis.status === 'end') {
      await this.redis.connect()
    }
    return this.redis
  }

  public async setKey({
    key,
    value,
    ttlInSeconds,
  }: {
    key: string
    value: string
    ttlInSeconds?: number
  }): Promise<void> {
    const redis = await this.redisClient()
    if (ttlInSeconds) {
      await redis.set(key, value, 'EX', ttlInSeconds)
    } else {
      await redis.set(key, value)
    }
  }

  public async getKey({ key }: { key: string }): Promise<string | null> {
    const redis = await this.redisClient()
    return await redis.get(key)
  }

  public async deleteKey(key: string): Promise<void> {
    const redis = await this.redisClient()
    await redis.del(key)
  }

  public async deleteKeysStartingWith(startsWith: string): Promise<void> {
    const redis = await this.redisClient()
    const keys = await redis.keys(`${startsWith}*`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }

  public async blpop({ key, ttlInSeconds }: { key: string; ttlInSeconds: number }): Promise<[string, string] | null> {
    //create a new connection in order to avoid blocking the main connection
    const newRedis = (await this.redisClient()).duplicate()
    try {
      const result = await newRedis.blpop(key, ttlInSeconds)
      return result
    } finally {
      if (newRedis) {
        //use disconnect instead of quit to close the connection immediately
        newRedis.disconnect()
      }
    }
  }

  async onModuleDestroy() {
    if (!this.redis) {
      return
    }
    await this.redis.quit()
  }
}
