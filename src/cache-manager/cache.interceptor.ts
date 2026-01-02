import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable, of } from 'rxjs'
import { tap } from 'rxjs/operators'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { CacheManagerService } from './cache-manager.service'
import { CACHE_KEY_METADATA, CacheConfig, CLEAR_CACHE_KEY_METADATA, ClearCacheConfig } from './cache.decorators'
import { getRelevantParams } from './cache.utils'

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheManager: CacheManagerService,
    @InjectPinoLogger(CacheInterceptor.name)
    private readonly logger: PinoLogger,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const cacheConfig = this.reflector.get<CacheConfig>(CACHE_KEY_METADATA, context.getHandler())
    const clearCacheConfig = this.reflector.get<ClearCacheConfig>(CLEAR_CACHE_KEY_METADATA, context.getHandler())

    try {
      if (cacheConfig) {
        return this.interceptCache(context, next, cacheConfig)
      }

      if (clearCacheConfig) {
        return this.interceptClearCache(context, next, clearCacheConfig)
      }
      return next.handle()
    } catch (error) {
      this.logger.error(error, 'Cache interceptor failed')
      return next.handle()
    }
  }

  private async interceptCache(context: ExecutionContext, next: CallHandler, cacheConfig: CacheConfig) {
    const args = this.extractArgs(context)
    const params = getRelevantParams(args, cacheConfig.paramNames)

    const cachedValue = await this.cacheManager.getCachedValue({ config: cacheConfig, params })
    if (cachedValue) {
      return of(cachedValue)
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheManager.setCachedValue({
          config: cacheConfig,
          params,
          value: response,
          ttlInSeconds: cacheConfig.ttlInSeconds,
        })
      }),
    )
  }

  private async interceptClearCache(context: ExecutionContext, next: CallHandler, clearCacheConfig: ClearCacheConfig) {
    return next.handle().pipe(
      tap(async () => {
        const args = this.extractArgs(context)
        const params = getRelevantParams(args, clearCacheConfig.paramNames)
        await this.cacheManager.clearCache({ config: clearCacheConfig, params })
      }),
    )
  }

  private extractArgs(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest()
    const requestData =
      (request.body && Object.keys(request.body).length > 0 ? request.body : undefined) ||
      (request.query && Object.keys(request.query).length > 0 ? request.query : undefined) ||
      {}
    const args = [requestData]
    return args
  }
}
