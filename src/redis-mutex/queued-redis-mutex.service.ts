import { Injectable } from '@nestjs/common'
import { RedisService } from '../redis/redis.service'
import { QueuedRedisMutexImpl } from './queued-redis-mutex'
import { IRedisMutexService, RedisMutex } from './redis-mutex.interface'

@Injectable()
@Injectable()
export class QueuedRedisMutexService implements IRedisMutexService {
  constructor(private readonly redisService: RedisService) {}

  public async aquireMutex(key: string, ttl: number): Promise<RedisMutex> {
    const mutex = new QueuedRedisMutexImpl(this.redisService, `mutex-${key}`, ttl, 100)
    await mutex.acquire()
    return mutex
  }
}
