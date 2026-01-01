import { SetMetadata } from '@nestjs/common'

export interface CacheConfig {
  key: string
  paramNames?: string[]
  ttlInSeconds?: number
  context?: CacheContextOptions
  dataVersion?: string
}

export interface ClearCacheConfig {
  key: string
  paramNames?: string[]
  context?: CacheContextOptions
  dataVersion?: string
}

export interface CacheContextOptions {
  useUserId?: boolean
  enabled?: boolean
  useProjectId?: boolean
}

export const CACHE_KEY_METADATA = 'cache_key_metadata'
export const CLEAR_CACHE_KEY_METADATA = 'clear_cache_key_metadata'

export const ControllerCache = (config: CacheConfig) => {
  return SetMetadata(CACHE_KEY_METADATA, {
    key: config.key,
    paramNames: config.paramNames,
    ttlInSeconds: config.ttlInSeconds || 3600, // Default 1 hour
    dataVersion: config.dataVersion,
  })
}

export const ControllerClearCache = (config: ClearCacheConfig) => {
  return SetMetadata(CLEAR_CACHE_KEY_METADATA, config)
}
