/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContextService, getLoggerMock, LoggerModule } from '@nest-me-up/common'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as crypto from 'crypto'
import request, { Test as SuperTest } from 'supertest'
import { RedisService } from '../redis'
import { CacheManagerModule } from './cache-manager.module'
import { CacheManagerService } from './cache-manager.service'
import { CacheConfig } from './cache.decorators'
import { CacheTestController } from './test/cache-test.controller'
import { CacheTestModule } from './test/cache-test.module'
import { CacheTestService } from './test/cache-test.service'

jest.setTimeout(30000)
describe('CacheManagerService', () => {
  let app: INestApplication
  let cacheTestService: CacheTestService
  let cacheTestController: CacheTestController
  let cacheManagerService: CacheManagerService

  const contextServiceMock = {
    getContext: jest.fn().mockReturnValue({ tenantId: 'tenant-1', projectId: 'project-1', userId: 'user-1' }),
  }

  let cachedValue = {}
  const redisServiceMock = {
    getKey: jest.fn().mockImplementation((key: { key: string }) => {
      // Handle both object-style args and string-style args if the mock was called differently
      const k = typeof key === 'object' && key !== null ? key.key : key
      const val = (cachedValue as Record<string, unknown>)[k as string]
      return Promise.resolve(val)
    }),
    setKey: jest.fn().mockImplementation((args: { key: string; value: any } | string, value?: any) => {
      let k, v
      if (typeof args === 'object' && args !== null) {
        k = args.key
        v = args.value
      } else {
        k = args
        v = value
      }
      ;(cachedValue as Record<string, unknown>)[k as string] = v
      return Promise.resolve()
    }),
    deleteKeysStartingWith: jest.fn().mockImplementation((pattern) => {
      Object.keys(cachedValue).forEach((key) => {
        if (key.startsWith(pattern)) {
          delete (cachedValue as Record<string, any>)[key]
        }
      })
      return Promise.resolve()
    }),
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CacheManagerModule, CacheTestModule, LoggerModule.forRoot()],
    })
      .overrideProvider(ContextService)
      .useValue(contextServiceMock)
      .overrideProvider(RedisService)
      .useValue(redisServiceMock)
      .overrideProvider('PinoLogger:CacheInterceptor')
      .useValue(getLoggerMock())
      .compile()

    app = module.createNestApplication()
    app.useGlobalInterceptors()
    await app.init()
    cacheTestService = app.get(CacheTestService)
    cacheTestController = app.get(CacheTestController)
    cacheManagerService = app.get(CacheManagerService)
  })
  afterEach(async () => {
    cachedValue = {}
    cacheTestService.reset()
    cacheTestController.reset()
  })
  afterAll(async () => {
    await app.close()
  })

  describe('test service cache', () => {
    it('test cache no params', async () => {
      await cacheTestService.testCacheNoParams()
      await cacheTestService.testCacheNoParams()
      await cacheTestService.testCacheNoParams()
      await cacheTestService.testCacheNoParams()
      const result = await cacheTestService.testCacheNoParams()
      expect(result).toBe(1)
    })

    it('test clear cache no params', async () => {
      await cacheTestService.testCacheNoParams()
      await cacheTestService.testCacheNoParams()
      await cacheTestService.clearCacheNoParams()
      const result = await cacheTestService.testCacheNoParams()
      expect(result).toBe(2)
    })
    it('should cache with params', async () => {
      const testParam = { id: '123', name: 'test' }
      const testParam2: number = 123
      await cacheTestService.testCacheWithParams(testParam, testParam2)
      await cacheTestService.testCacheWithParams(testParam, testParam2)
      await cacheTestService.testCacheWithParams(testParam, testParam2)
      const result = await cacheTestService.testCacheWithParams(testParam, testParam2)
      expect(result).toBe(1)
    })

    it('should use different cache keys for different params', async () => {
      const param1 = { id: '123', name: 'test1' }
      const param2 = { id: '456', name: 'test2' }

      await cacheTestService.testCacheWithParams(param1, 1)
      await cacheTestService.testCacheWithParams(param2, 2)

      const result1 = await cacheTestService.testCacheWithParams(param1, 1)
      const result2 = await cacheTestService.testCacheWithParams(param2, 2)

      expect(result1).toBe(1)
      expect(result2).toBe(2)
    })

    it('should clear cache with params', async () => {
      const testParam = { id: '123', name: 'test' }
      await cacheTestService.testCacheWithParams(testParam, 1)
      await cacheTestService.clearCacheWithParams(testParam, 1)
      const result = await cacheTestService.testCacheWithParams(testParam, 1)
      expect(result).toBe(2)
    })

    it('should cache with paramNames config including only first param', async () => {
      const param1 = { id: '123', name: 'test1' }

      // Same first param but different second param should use same cache
      await cacheTestService.testCacheWithParamNames(param1, 1)
      await cacheTestService.testCacheWithParamNames(param1, 2)
      await cacheTestService.testCacheWithParamNames(param1, 3)
      const result1 = await cacheTestService.testCacheWithParamNames(param1, 4)
      expect(result1).toBe(1)

      // Same name param but different id should use different cache
      const param2 = { id: '456', name: 'test1' }
      const result2 = await cacheTestService.testCacheWithParamNames(param2, 1)
      expect(result2).toBe(2)

      // Different first param should use different cache
      const param3 = { id: '789', name: 'test2' }
      const result3 = await cacheTestService.testCacheWithParamNames(param3, 1)
      expect(result3).toBe(3)
    })

    it('should cache with paramNames config including only first param with object', async () => {
      const param1 = { id: '123', name: 'test1' }

      // Same first param but different second param should use same cache
      await cacheTestService.testCacheWithParamNamesObject(param1)
      await cacheTestService.testCacheWithParamNamesObject(param1)
      await cacheTestService.testCacheWithParamNamesObject(param1)
      const result1 = await cacheTestService.testCacheWithParamNamesObject(param1)
      expect(result1).toBe(1)

      // Same name param but different id should use same cache
      const param2 = { id: '456', name: 'test1' }
      const result2 = await cacheTestService.testCacheWithParamNamesObject(param2)
      expect(result2).toBe(1)

      // Different name param should use different cache
      const param3 = { id: '789', name: 'test2' }
      const result3 = await cacheTestService.testCacheWithParamNamesObject(param3)
      expect(result3).toBe(2)
    })

    it('should cache with paramNames config including only first param with distructor', async () => {
      const param1 = { id: '123', name: 'test1' }

      // Same first param but different second param should use same cache
      await cacheTestService.testCacheWithParamNamesObjectWithDistructor(param1)
      await cacheTestService.testCacheWithParamNamesObjectWithDistructor(param1)
      await cacheTestService.testCacheWithParamNamesObjectWithDistructor(param1)
      const result1 = await cacheTestService.testCacheWithParamNamesObjectWithDistructor(param1)
      expect(result1).toBe(1)

      // Same name param but different id should use same cache
      const param2 = { id: '456', name: 'test1' }
      const result2 = await cacheTestService.testCacheWithParamNamesObjectWithDistructor(param2)
      expect(result2).toBe(1)

      // Different first param should use different cache
      const param3 = { id: '789', name: 'test2' }
      const result3 = await cacheTestService.testCacheWithParamNamesObjectWithDistructor(param3)
      expect(result3).toBe(2)
    })

    it('should only clear cache for matching params', async () => {
      const param1 = { id: '123', name: 'test1' }
      const param2 = { id: '456', name: 'test2' }

      await cacheTestService.testCacheWithParams(param1, 1)
      await cacheTestService.testCacheWithParams(param2, 2)
      await cacheTestService.clearCacheWithParams(param1, 1)

      const result1 = await cacheTestService.testCacheWithParams(param1, 1)
      const result2 = await cacheTestService.testCacheWithParams(param2, 2)

      expect(result1).toBe(3)
      expect(result2).toBe(2)
    })

    it('should cache complex objects', async () => {
      const complexObject = {
        id: '123',
        name: 'test',
        data: {
          items: [1, 2, 3],
          metadata: {
            created: new Date('2024-01-01'),
            tags: ['test', 'cache'],
          },
        },
      }

      await cacheTestService.testCacheWithParams(complexObject, 1)
      await cacheTestService.testCacheWithParams(complexObject, 1)
      const result = await cacheTestService.testCacheWithParams(complexObject, 1)

      expect(result).toBe(1)
    })

    it('should cache and retrieve objects with Maps', async () => {
      const objectWithMap = {
        id: '123',
        data: new Map<string, string | { nested: string }>([
          ['key1', 'value1'],
          ['key2', { nested: 'value2' }],
        ]),
      }

      // First call to cache the value
      const initialResult = await cacheTestService.testCacheObjectWithMap(objectWithMap)
      expect(initialResult.data).toBeInstanceOf(Map)
      expect(initialResult.data.get('key1')).toBe('value1')
      expect(initialResult.data.get('key2')).toEqual({ nested: 'value2' })

      // Second call should return cached value
      const cachedResult = await cacheTestService.testCacheObjectWithMap(objectWithMap)
      expect(cachedResult.data).toBeInstanceOf(Map)
      expect(cachedResult.data.get('key1')).toBe('value1')
      expect(cachedResult.data.get('key2')).toEqual({ nested: 'value2' })

      // Verify it's using cache
      expect(cacheTestService.getCallCount()).toBe(1)
    })

    it('should cache and retrieve deeply nested objects with Maps', async () => {
      const deeplyNested = {
        level1: {
          map1: new Map([['key1', 'value1']]),
          level2: {
            map2: new Map([['key2', { data: 'value2' }]]),
            array: [new Map([['key3', 'value3']]), { nestedMap: new Map([['key4', 'value4']]) }],
          },
        },
      }

      // First call to cache the value
      const initialResult = await cacheTestService.testCacheNestedObjectWithMaps(deeplyNested)
      expect(initialResult.level1.map1.get('key1')).toBe('value1')
      expect(initialResult.level1.level2.map2.get('key2')).toEqual({ data: 'value2' })
      expect(initialResult.level1.level2.array[0].get('key3')).toBe('value3')
      expect(initialResult.level1.level2.array[1].nestedMap.get('key4')).toBe('value4')

      // Second call should return cached value
      const cachedResult = await cacheTestService.testCacheNestedObjectWithMaps(deeplyNested)
      expect(cachedResult.level1.map1.get('key1')).toBe('value1')
      expect(cachedResult.level1.level2.map2.get('key2')).toEqual({ data: 'value2' })
      expect(cachedResult.level1.level2.array[0].get('key3')).toBe('value3')
      expect(cachedResult.level1.level2.array[1].nestedMap.get('key4')).toBe('value4')

      // Verify it's using cache
      expect(cacheTestService.getCallCount()).toBe(1)
    })

    it('should cache and retrieve a standalone Map', async () => {
      const simpleMap = new Map<string, string | number>([
        ['key1', 'value1'],
        ['key2', 42],
      ])

      // First call to cache the value
      const initialResult = await cacheTestService.testCacheSimpleMap(simpleMap)
      expect(initialResult).toBeInstanceOf(Map)
      expect(initialResult.get('key1')).toBe('value1')
      expect(initialResult.get('key2')).toBe(42)

      // Second call should return cached value
      const cachedResult = await cacheTestService.testCacheSimpleMap(simpleMap)
      expect(cachedResult).toBeInstanceOf(Map)
      expect(cachedResult.get('key1')).toBe('value1')
      expect(cachedResult.get('key2')).toBe(42)

      // Verify it's using cache
      expect(cacheTestService.getCallCount()).toBe(1)
    })

    it('should cache and retrieve a boolean', async () => {
      const initialResult = await cacheTestService.testBoolean()
      expect(initialResult).toBe(true)

      const cachedResult = await cacheTestService.testBoolean()
      expect(cachedResult).toBe(true)

      expect(cacheTestService.getCallCount()).toBe(1)
    })
  })

  describe('test controller cache', () => {
    it('controller should cache with no params', async () => {
      await sendGetRequest(app, '/cache-test/no-params').expect(200)
      await sendGetRequest(app, '/cache-test/no-params').expect(200)
      await sendGetRequest(app, '/cache-test/no-params').expect(200)
      const response = await sendGetRequest(app, '/cache-test/no-params').expect(200)
      const result = response.body

      expect(result).toStrictEqual({ value: 1 })
    })

    it('controller should clear cache with no params', async () => {
      await sendGetRequest(app, '/cache-test/no-params').expect(200)
      await sendGetRequest(app, '/cache-test/no-params').expect(200)
      const firstResponse = await sendGetRequest(app, '/cache-test/no-params').expect(200)
      expect(firstResponse.body).toStrictEqual({ value: 1 })

      await sendGetRequest(app, '/cache-test/clear-no-params').expect(200)

      const secondResponse = await sendGetRequest(app, '/cache-test/no-params').expect(200)
      expect(secondResponse.body).toStrictEqual({ value: 2 })
    })
    it('controller should cache with query params but send no params', async () => {
      await sendGetRequest(app, '/cache-test/with-query-params').expect(200)
      await sendGetRequest(app, '/cache-test/with-query-params').expect(200)
      await sendGetRequest(app, '/cache-test/with-query-params').expect(200)
      const response = await sendGetRequest(app, '/cache-test/with-query-params').expect(200)
      expect(response.body).toStrictEqual({ value: 1 })
    })

    it('controller should cache with query params', async () => {
      await sendGetRequest(app, '/cache-test/with-query-params?id=123&name=test1').expect(200)
      await sendGetRequest(app, '/cache-test/with-query-params?id=123&name=test1').expect(200)
      await sendGetRequest(app, '/cache-test/with-query-params?id=456&name=test1').expect(200)

      const response1 = await sendGetRequest(app, '/cache-test/with-query-params?id=789&name=test1').expect(200)
      expect(response1.body).toStrictEqual({ value: 1 })

      const response2 = await sendGetRequest(app, '/cache-test/with-query-params?id=123&name=test2').expect(200)
      expect(response2.body).toStrictEqual({ value: 2 })
    })

    it('controller should clear cache with query params', async () => {
      await sendGetRequest(app, '/cache-test/with-query-params?id=123&name=test1').expect(200)
      const firstResponse = await sendGetRequest(app, '/cache-test/with-query-params?id=456&name=test1').expect(200)
      expect(firstResponse.body).toStrictEqual({ value: 1 })

      await sendGetRequest(app, '/cache-test/clear-with-query-params?id=123&name=test1').expect(200)

      const secondResponse = await sendGetRequest(app, '/cache-test/with-query-params?id=456&name=test1').expect(200)
      expect(secondResponse.body).toStrictEqual({ value: 2 })
    })

    it('controller should cache with query param dto', async () => {
      await sendGetRequest(app, '/cache-test/with-query-param-dto?id=123&name=test1').expect(200)
      await sendGetRequest(app, '/cache-test/with-query-param-dto?id=456&name=test1').expect(200)

      const response1 = await sendGetRequest(app, '/cache-test/with-query-param-dto?id=789&name=test1').expect(200)
      expect(response1.body).toStrictEqual({ value: 1 })

      const response2 = await sendGetRequest(app, '/cache-test/with-query-param-dto?id=123&name=test2').expect(200)
      expect(response2.body).toStrictEqual({ value: 2 })
    })

    it('controller should clear cache with query param dto', async () => {
      await sendGetRequest(app, '/cache-test/with-query-param-dto?id=123&name=test1').expect(200)
      const firstResponse = await sendGetRequest(app, '/cache-test/with-query-param-dto?id=456&name=test1').expect(200)
      expect(firstResponse.body).toStrictEqual({ value: 1 })

      await sendGetRequest(app, '/cache-test/clear-with-query-param-dto?id=123&name=test1').expect(200)

      const secondResponse = await sendGetRequest(app, '/cache-test/with-query-param-dto?id=456&name=test1').expect(200)
      expect(secondResponse.body).toStrictEqual({ value: 2 })
    })

    it('controller should cache with body params', async () => {
      await request(app.getHttpServer())
        .post('/cache-test/with-body-params')
        .send({ id: '123', name: 'test1' })
        .expect(201)
      await request(app.getHttpServer())
        .post('/cache-test/with-body-params')
        .send({ id: '456', name: 'test1' })
        .expect(201)

      const response1 = await request(app.getHttpServer())
        .post('/cache-test/with-body-params')
        .send({ id: '789', name: 'test1' })
        .expect(201)
      expect(response1.body).toStrictEqual({ value: 1 })

      const response2 = await request(app.getHttpServer())
        .post('/cache-test/with-body-params')
        .send({ id: '123', name: 'test2' })
        .expect(201)
      expect(response2.body).toStrictEqual({ value: 2 })
    })

    it('controller should clear cache with body params', async () => {
      await request(app.getHttpServer())
        .post('/cache-test/with-body-params')
        .send({ id: '123', name: 'test1' })
        .expect(201)
      const firstResponse = await request(app.getHttpServer())
        .post('/cache-test/with-body-params')
        .send({ id: '456', name: 'test1' })
        .expect(201)
      expect(firstResponse.body).toStrictEqual({ value: 1 })

      await request(app.getHttpServer())
        .post('/cache-test/clear-with-body-params')
        .send({ id: '123', name: 'test1' })
        .expect(201)

      const secondResponse = await request(app.getHttpServer())
        .post('/cache-test/with-body-params')
        .send({ id: '456', name: 'test1' })
        .expect(201)
      expect(secondResponse.body).toStrictEqual({ value: 2 })
    })

    it('controller should cache with body params but send no params', async () => {
      await request(app.getHttpServer()).post('/cache-test/with-body-params').expect(201)
      await request(app.getHttpServer()).post('/cache-test/with-body-params').expect(201)
      await request(app.getHttpServer()).post('/cache-test/with-body-params').expect(201)
      const response = await request(app.getHttpServer()).post('/cache-test/with-body-params').expect(201)
      expect(response.body).toStrictEqual({ value: 1 })
    })
  })

  describe('cache key generation', () => {
    const params = ['param1']
    const paramsHash = crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex')

    it('should generate cache key with default context (all enabled)', async () => {
      const config: CacheConfig = { key: 'test-key' }
      const key = await (cacheManagerService as any).generateCacheKey(config, params)
      expect(key).toBe(`cache-manager:tenant:tenant-1:project:project-1:user:user-1:test-key:${paramsHash}`)
    })

    it('should generate cache key with context disabled', async () => {
      const config: CacheConfig = {
        key: 'test-key',
        context: { enabled: false },
      }
      const key = await (cacheManagerService as any).generateCacheKey(config, params)
      expect(key).toBe(`cache-manager:test-key:${paramsHash}`)
    })

    it('should generate cache key with only projectId disabled', async () => {
      const config: CacheConfig = {
        key: 'test-key',
        context: { useProjectId: false },
      }
      const key = await (cacheManagerService as any).generateCacheKey(config, params)
      expect(key).toBe(`cache-manager:tenant:tenant-1:user:user-1:test-key:${paramsHash}`)
    })

    it('should generate cache key with only userId disabled', async () => {
      const config: CacheConfig = {
        key: 'test-key',
        context: { useUserId: false },
      }
      const key = await (cacheManagerService as any).generateCacheKey(config, params)
      expect(key).toBe(`cache-manager:tenant:tenant-1:project:project-1:test-key:${paramsHash}`)
    })

    it('should generate cache key with both projectId and userId disabled', async () => {
      const config: CacheConfig = {
        key: 'test-key',
        context: { useProjectId: false, useUserId: false },
      }
      const key = await (cacheManagerService as any).generateCacheKey(config, params)
      expect(key).toBe(`cache-manager:tenant:tenant-1:test-key:${paramsHash}`)
    })

    it('should generate cache key with multiple params', async () => {
      const config: CacheConfig = { key: 'test-key' }
      const params = ['param1', 'param2', { nested: 'value' }]
      const paramsHash = crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex')
      const key = await (cacheManagerService as any).generateCacheKey(config, params)
      expect(key).toBe(`cache-manager:tenant:tenant-1:project:project-1:user:user-1:test-key:${paramsHash}`)
    })
  })
})

function sendGetRequest(app: INestApplication, path: string): SuperTest {
  return request(app.getHttpServer()).get(path)
}
