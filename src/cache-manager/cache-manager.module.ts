import { Global, Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { RedisModule } from '../redis'
import { CacheManagerService } from './cache-manager.service'
import { CacheInterceptor } from './cache.interceptor'
import { ContextModule, LoggerModule } from '@nest-me-up/common'

@Global()
@Module({
  imports: [RedisModule, LoggerModule, ContextModule],
  providers: [
    CacheManagerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
  exports: [CacheManagerService],
})
export class CacheManagerModule {}
