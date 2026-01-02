# @nest-me-up/redis-modules

An open-source, opinionated library providing Redis-based modules for NestJS applications.

This library is free to copy, fork, or use in your own projects. All comments, suggestions, and contributions are welcome!

## Overview

This package offers a collection of modules designed to streamline Redis integration in NestJS, with a focus on multi-tenancy and context awareness. It handles common patterns like caching and distributed locking with an "opinionated" approach that integrates deeply with application context.

## Dependencies

This library relies on:

- **@nest-me-up/common**: For context propagation (`ContextModule`, `ContextService`) and logging.
- **ioredis**: A robust, performance-focused Redis client.
- **uuid**: For generating unique identifiers.

## Modules

### 1. RedisModule

A fundamental module that provides a wrapper around `ioredis`, exposing a `RedisService` for standard Redis operations. It serves as the foundation for other modules in this library.

### 2. RedisMutexModule

Provides distributed locking mechanisms to handle concurrency in a distributed environment.

- **RedisMutexService**: Implements standard distributed mutex locks.
- **QueuedRedisMutexService**: Offers a queued approach to mutexes, useful when you need to manage lock acquisition order or wait for locks to become available.

### 3. CacheManagerModule

A powerful caching solution that supports both Redis-based caching and Request-scoped caching (memoization within a single request).

#### Context Module Integration

The `CacheManagerModule` leverages the `ContextService` from `@nest-me-up/common` to provide intelligent, context-aware caching:

- **Automatic Key Namespacing:**
  The module automatically incorporates current execution context details—such as `tenantId`, `projectId`, and `userId`—into cache keys. This ensures data isolation in multi-tenant applications without requiring developers to manually construct complex keys.

- **Request-Scoped Caching:**
  By utilizing the context storage (via `ContextService`), the module can store cache hits in memory for the duration of a single request. This means multiple calls to the same cached method with the same parameters within one request lifecycle will only trigger a single Redis lookup (or computation), significantly improving performance for complex request flows.

#### Caching Strategies

This module supports caching at two distinct layers:

1. **Controller-Level Caching**
   - **Decorators:** `@ControllerCache`, `@ControllerClearCache`
   - **Usage:** applied to Controller route handlers.
   - **Mechanism:** Intercepts the HTTP request. It uses the request body or query parameters to generate the cache key.
   - **Benefit:** Great for caching the entire response of an endpoint, reducing processing overhead for frequent identical requests.

2. **Service-Level Caching**
   - **Decorators:** `@ServiceCache`, `@ServiceClearCache`, `@RequestCache`, `@RequestClearCache`
   - **Usage:** Applied directly to methods within your Service classes.
   - **Mechanism:** Wraps the method execution. It uses the actual method arguments to generate the cache key.
   - **Why it's useful:**
     - **Granularity:** Allows you to cache specific business logic or expensive database queries rather than the entire HTTP response.
     - **Reusability:** Works effectively regardless of how the service is called (e.g., from a Controller, a GraphQL resolver, a Cron job, or another Service), making it transport-layer agnostic.
     - **Internal Optimization:** Enables caching of internal method calls that aren't directly exposed as endpoints, allowing for fine-tuned performance optimizations deep within your application logic.

## License

MIT
