/* eslint-disable @typescript-eslint/no-unused-vars */
import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ControllerCache, ControllerClearCache } from '../cache.decorators'

@Controller('cache-test')
export class CacheTestController {
  noParamsCounter = 0
  withParamsCounter = 0
  withParamNamesCounter = 0
  withParamDtoCounter = 0
  withBodyParamsCounter = 0

  reset() {
    this.noParamsCounter = 0
    this.withParamsCounter = 0
    this.withParamNamesCounter = 0
    this.withParamDtoCounter = 0
    this.withBodyParamsCounter = 0
  }

  @Get('no-params')
  @ControllerCache({
    key: 'testNoParams',
  })
  async testCacheNoParams() {
    this.noParamsCounter++
    return { value: this.noParamsCounter }
  }

  @Get('clear-no-params')
  @ControllerClearCache({
    key: 'testNoParams',
  })
  async clearCacheNoParams() {
    return 'clear'
  }

  @Get('with-query-params')
  @ControllerCache({
    key: 'testWithQueryParams',
    paramNames: ['name'],
  })
  async testCacheWithQueryParams(@Query('id') id: string, @Query('name') name: string) {
    this.withParamsCounter++
    return { value: this.withParamsCounter }
  }

  @Get('clear-with-query-params')
  @ControllerClearCache({
    key: 'testWithQueryParams',
    paramNames: ['name'],
  })
  async clearCacheWithQueryParams(@Query('id') id: string, @Query('name') name: string) {
    return 'clear'
  }

  @Get('with-query-param-dto')
  @ControllerCache({
    paramNames: ['name'],
    key: 'testWithQueryParamDto',
  })
  async testCacheWithQueryParamDto(@Query() dto: { id: string; name: string }) {
    this.withParamDtoCounter++
    return { value: this.withParamDtoCounter }
  }

  @Get('clear-with-query-param-dto')
  @ControllerClearCache({
    key: 'testWithQueryParamDto',
    paramNames: ['name'],
  })
  @Get('clear-with-query-param-dto')
  async clearCacheWithQueryParamDto(@Query() dto: { id: string; name: string }) {
    return 'clear'
  }

  @Post('with-body-params')
  @ControllerCache({
    key: 'testWithBodyParams',
    paramNames: ['name'],
  })
  async testCacheWithBodyParams(@Body() dto: { id: string; name: string }) {
    this.withBodyParamsCounter++
    return { value: this.withBodyParamsCounter }
  }

  @Post('clear-with-body-params')
  @ControllerClearCache({
    key: 'testWithBodyParams',
    paramNames: ['name'],
  })
  async clearCacheWithBodyParams(@Body() dto: { id: string; name: string }) {
    return 'clear'
  }
}
