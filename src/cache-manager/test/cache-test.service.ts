/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common'
import { ServiceCache, ServiceClearCache } from '../cache-service.interceptor'

@Injectable()
export class CacheTestService {
  private noParamsCounter = 0
  private withParamsCounter = 0
  private paramNamesCounter = 0
  private paramNamesObjectCounter = 0
  private callCount = 0
  constructor() {}

  reset() {
    this.noParamsCounter = 0
    this.withParamsCounter = 0
    this.paramNamesCounter = 0
    this.paramNamesObjectCounter = 0
    this.callCount = 0
  }

  @ServiceCache({
    key: 'test',
    dataVersion: 'v1',
  })
  async testCacheNoParams() {
    this.noParamsCounter++
    return this.noParamsCounter
  }

  @ServiceClearCache({
    keys: ['test'],
    dataVersion: 'v1',
  })
  async clearCacheNoParams() {
    return 'test'
  }

  @ServiceCache({
    key: 'testWithParams',
  })
  async testCacheWithParams(param1: { id: string; name: string }, parame2: number) {
    this.withParamsCounter++
    return this.withParamsCounter
  }

  @ServiceClearCache({
    keys: ['testWithParams'],
  })
  async clearCacheWithParams(param: { id: string; name: string }, param2: number) {
    return param
  }

  @ServiceCache({
    key: 'testWithParamNames',
    paramNames: ['param1'],
  })
  async testCacheWithParamNames(param1: { id: string; name: string }, arg1: number) {
    this.paramNamesCounter++
    return this.paramNamesCounter
  }

  @ServiceCache({
    key: 'testWithParamNamesObject',
    paramNames: ['name'],
  })
  async testCacheWithParamNamesObject(param1: { id: string; name: string }) {
    this.paramNamesObjectCounter++
    return this.paramNamesObjectCounter
  }

  @ServiceCache({
    key: 'testWithParamNamesObjectWithDistructor',
    paramNames: ['name'],
  })
  async testCacheWithParamNamesObjectWithDistructor({ id, name }: { id: string; name: string }) {
    this.paramNamesObjectCounter++
    return this.paramNamesObjectCounter
  }

  @ServiceCache({ key: 'object-with-map' })
  async testCacheObjectWithMap(param: {
    id: string
    data: Map<string, unknown>
  }): Promise<{ id: string; data: Map<string, unknown> }> {
    this.callCount++
    return {
      id: param.id,
      data: param.data,
    }
  }

  @ServiceCache({ key: 'nested-object-with-maps' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async testCacheNestedObjectWithMaps(param: any): Promise<any> {
    this.callCount++
    return param
  }

  @ServiceCache({ key: 'simple-map' })
  async testCacheSimpleMap(map: Map<string, string | number>): Promise<Map<string, string | number>> {
    this.callCount++
    return map
  }

  @ServiceCache({ key: 'boolean' })
  async testBoolean(): Promise<boolean> {
    this.callCount++
    return true
  }

  getCallCount(): number {
    return this.callCount
  }
}
