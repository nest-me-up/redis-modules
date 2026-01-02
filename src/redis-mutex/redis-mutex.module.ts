import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'
import { RedisModule } from '../redis/redis.module'
import { QueuedRedisMutexService } from './queued-redis-mutex.service'
import { RedisMutexService } from './redis-mutex.service'

@Module({
  imports: [ConfigModule, LoggerModule, RedisModule],
  providers: [RedisMutexService, QueuedRedisMutexService],
  exports: [RedisMutexService, QueuedRedisMutexService],
})
export class RedisMutexModule {}
