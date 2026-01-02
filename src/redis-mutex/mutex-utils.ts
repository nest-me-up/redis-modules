import { IRedisMutexService } from './redis-mutex.interface'

export async function runWithMutexLock<T>(
  redisMutexService: IRedisMutexService,
  key: string,
  ttl: number,
  fn: () => Promise<T>,
): Promise<T> {
  const mutex = await redisMutexService.aquireMutex(key, ttl)
  try {
    return await fn()
  } finally {
    await mutex.release()
  }
}
