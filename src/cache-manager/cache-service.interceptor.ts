import { CacheManagerService } from './cache-manager.service'
import { CacheConfig, ClearCacheConfig } from './cache.decorators'
import { getRelevantParams } from './cache.utils'

export function ServiceCache(config: CacheConfig) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const cacheManager: CacheManagerService = this.cacheManager // Service needs to have CacheManagerService injected

      if (!cacheManager) {
        throw new Error('CacheManagerService must be injected as "cacheManager" to use @CacheService decorator')
      }

      const params = getRelevantParams(args, config.paramNames)

      const cachedValue = await cacheManager.getCachedValue({ config, params })
      if (cachedValue) {
        return cachedValue
      }

      const result = await originalMethod.apply(this, args)

      await cacheManager.setCachedValue({ config, params, value: result, ttlInSeconds: config.ttlInSeconds })

      return result
    }
  }
}

export function ServiceClearCache(config: ClearCacheConfig) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const cacheManager: CacheManagerService = this.cacheManager // Service needs to have CacheManagerService injected

      if (!cacheManager) {
        throw new Error('CacheManagerService must be injected to use @ServiceClearCache decorator')
      }

      const result = await originalMethod.apply(this, args)

      const params = getRelevantParams(args, config.paramNames)
      await cacheManager.clearCache({ config, params })

      return result
    }
  }
}

export function RequestCache(config: CacheConfig) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const cacheManager: CacheManagerService = this.cacheManager // Service needs to have CacheManagerService injected

      if (!cacheManager) {
        throw new Error('CacheManagerService must be injected as "cacheManager" to use @CacheService decorator')
      }

      const params = getRelevantParams(args, config.paramNames)

      const cachedValue = cacheManager.getRequestCachedValue({ config, params })
      if (cachedValue) {
        return cachedValue
      }

      const result = await originalMethod.apply(this, args)

      cacheManager.setRequestCachedValue({ config, params, value: result })

      return result
    }
  }
}

export function RequestClearCache(config: ClearCacheConfig) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const cacheManager: CacheManagerService = this.cacheManager // Service needs to have CacheManagerService injected

      if (!cacheManager) {
        throw new Error('CacheManagerService must be injected to use @ServiceClearCache decorator')
      }

      const result = await originalMethod.apply(this, args)

      const params = getRelevantParams(args, config.paramNames)
      cacheManager.clearRequestCache({ config, params })

      return result
    }
  }
}
