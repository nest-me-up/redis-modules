import { v4 } from 'uuid'
import { RedisService } from '../redis/redis.service'
import { RedisMutex } from './redis-mutex.interface'

export class RedisMutexImpl implements RedisMutex {
  private lockValue: string
  private readonly ttlMilliseconds: number
  constructor(
    private readonly redisService: RedisService,
    private readonly lockKey: string,
    private readonly ttl: number, // Time to live in seconds
    private readonly retryDelay: number, // Delay between retries in milliseconds
  ) {
    this.lockValue = null
    this.ttlMilliseconds = ttl * 1000
  }

  public async acquire(): Promise<boolean> {
    this.lockValue = v4()
    const endTime = Date.now() + this.ttlMilliseconds

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (Date.now() > endTime) {
          clearInterval(interval)
          resolve(false) // Timeout reached, lock not acquired
          return
        }

        const redisClient = await this.redisService.redisClient()
        const result = await redisClient.setnx(this.lockKey, this.lockValue)
        if (result) {
          // We did set this, we're okay to set expiry too
          await redisClient.expire(this.lockKey, this.ttl)
          clearInterval(interval)
          resolve(true) // Lock acquired
        }
      }, this.retryDelay)
    })
  }

  public async release(): Promise<boolean> {
    if (!this.lockValue) {
      // We never acquired the lock
      return true
    }
    const redisClient = await this.redisService.redisClient()
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `
    const result = await redisClient.eval(script, 1, this.lockKey, this.lockValue)
    return result === 1
  }
}
