import { ContextService } from '@nest-me-up/common'
import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import { RedisService } from '../redis'
import { CacheConfig, ClearCacheConfig } from './cache.decorators'

const REDIS_KEY_PREFIX = 'cache-manager'
const CACHE_MANAGER_REQUEST_CACHE = 'cache-manager-request-cache'
@Injectable()
export class CacheManagerService {
  constructor(
    private readonly contextService: ContextService,
    private readonly redisService: RedisService,
  ) {}

  public async getCachedValue<T>({ config, params }: { config: CacheConfig; params: unknown[] }): Promise<T> {
    const cacheKey = this.generateCacheKey(config, params)
    let value = null
    value = await this.redisService.getKey({ key: cacheKey })

    return this.parseCacheValue(value) as T
  }

  public getRequestCachedValue<T>({ config, params }: { config: CacheConfig; params: unknown[] }): T {
    const cacheKey = this.generateCacheKey(config, params)
    const cacheMap = this.getContextCacheMap()
    const value = cacheMap.get(cacheKey)
    return this.parseCacheValue(value) as T
  }

  private parseCacheValue(value: unknown): unknown {
    // Return as-is if value is null/undefined or not an object/array string
    if (!value || typeof value !== 'string') {
      return value
    }

    if (typeof value === 'string' && !(value.startsWith('{') || value.startsWith('['))) {
      return value
    }

    // Parse JSON with reviver function to convert objects back to Maps
    return JSON.parse(value, (_, v) => {
      if (v && typeof v === 'object' && !Array.isArray(v) && v.__isMap === true) {
        // Only convert objects that were explicitly marked as Maps
        delete v.__isMap
        return new Map(Object.entries(v))
      }
      return v
    })
  }

  private getContextCacheMap(): Map<string, unknown> {
    let cacheMap: Map<string, unknown> = this.contextService.getContextStorageData(CACHE_MANAGER_REQUEST_CACHE)
    if (!cacheMap) {
      cacheMap = new Map<string, unknown>()
      this.contextService.updateContextStorageData(CACHE_MANAGER_REQUEST_CACHE, cacheMap)
    }
    return cacheMap
  }

  public async setCachedValue({
    config,
    params,
    value,
    ttlInSeconds,
  }: {
    config: CacheConfig
    params: unknown[]
    value: unknown
    ttlInSeconds: number
  }): Promise<void> {
    const cacheKey = this.generateCacheKey(config, params)

    // Only stringify if it's an object or array that needs Map conversion
    const valueToStore = this.stringifyValue(value)

    await this.redisService.setKey({ key: cacheKey, value: valueToStore, ttlInSeconds })
  }

  public setRequestCachedValue({ config, params, value }: { config: CacheConfig; params: unknown[]; value: unknown }) {
    const cacheKey = this.generateCacheKey(config, params)

    // Only stringify if it's an object or array that needs Map conversion
    const valueToStore = this.stringifyValue(value)

    const cacheMap = this.getContextCacheMap()
    cacheMap.set(cacheKey, valueToStore)
  }

  private stringifyValue(value: unknown): string {
    return value && typeof value === 'object'
      ? JSON.stringify(value, (_, v) => {
          if (v instanceof Map) {
            // Mark Map objects with a special property
            return { ...Object.fromEntries(v), __isMap: true }
          }
          return v
        })
      : value.toString()
  }

  public async clearCache({ config, params }: { config: ClearCacheConfig; params: unknown[] }): Promise<void> {
    const pattern = this.generateCacheKey(config, params)
    await this.redisService.deleteKeysStartingWith(pattern)
  }

  public clearRequestCache({ config, params }: { config: ClearCacheConfig; params: unknown[] }) {
    const pattern = this.generateCacheKey(config, params)
    const cacheMap = this.getContextCacheMap()
    cacheMap.delete(pattern)
  }

  private generateCacheKey(config: CacheConfig, params: unknown[]): string {
    const { tenantId, projectId, userId } = this.contextService.getContext()
    const paramsKey = params ? crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex') : ''
    let key = `${REDIS_KEY_PREFIX}`

    if (config.context?.enabled === undefined || config.context?.enabled) {
      key = `${key}:tenant:${tenantId}`
      if (config.context?.useProjectId === undefined || config.context?.useProjectId) {
        key = `${key}:project:${projectId}`
      }
      if (config.context?.useUserId === undefined || config.context?.useUserId) {
        key = `${key}:user:${userId}`
      }
    }
    const cacheKey = `${key}:${config.key}${config.dataVersion ? `:${config.dataVersion}` : ''}:${paramsKey}`
    return cacheKey
  }
}
