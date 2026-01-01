import { CacheManagerModule } from '../cache-manager.module'
import { CacheTestController } from './cache-test.controller'
import { CacheTestService } from './cache-test.service'
import { Module } from '@nestjs/common'

@Module({
  imports: [CacheManagerModule],
  providers: [CacheTestService],
  controllers: [CacheTestController],
})
export class CacheTestModule {}
