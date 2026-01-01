export interface RedisMutex {
  release(): Promise<boolean>
}

export interface IRedisMutexService {
  aquireMutex(key: string, ttl: number): Promise<RedisMutex>
}
