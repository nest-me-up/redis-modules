import { v4 } from 'uuid'
import { RedisService } from '../redis/redis.service'
import { RedisMutex } from './redis-mutex.interface'

export class QueuedRedisMutexImpl implements RedisMutex {
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

    // Add ourselves to the waiting list
    const redisClient = await this.redisService.redisClient()
    const waitKey = `${this.lockKey}:wait`
    await redisClient.rpush(waitKey, this.lockValue)

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (Date.now() > endTime) {
          // Remove ourselves from the waiting list on timeout
          await redisClient.lrem(waitKey, 0, this.lockValue)
          clearInterval(interval)
          resolve(false)
          return
        }

        // Check if we're first in line
        const firstWaiter = await redisClient.lindex(waitKey, 0)
        if (firstWaiter !== this.lockValue) {
          return // Not our turn yet
        }

        const result = await redisClient.setnx(this.lockKey, this.lockValue)
        if (result) {
          // We got the lock, remove ourselves from the waiting list
          await redisClient.lrem(waitKey, 1, this.lockValue)
          await redisClient.expire(this.lockKey, this.ttl)
          clearInterval(interval)
          resolve(true)
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
