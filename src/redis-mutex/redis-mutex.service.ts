import { Injectable } from '@nestjs/common'
import { RedisService } from '../redis/redis.service'
import { RedisMutexImpl } from './redis-mutex'
import { IRedisMutexService, RedisMutex } from './redis-mutex.interface'

@Injectable()
export class RedisMutexService implements IRedisMutexService {
  constructor(private readonly redisService: RedisService) {}

  public async aquireMutex(key: string, ttl: number): Promise<RedisMutex> {
    const mutex = new RedisMutexImpl(this.redisService, `mutex-${key}`, ttl, 100)
    await mutex.acquire()
    return mutex
  }
}
