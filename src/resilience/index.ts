/**
 * 健澜科技杠OS（jlmedaios）- 韧性层统一出口
 *
 * 面向医院高并发环境的生产级韧性原语：
 *   - CircuitBreaker   熔断器（fail-fast，防故障级联）
 *   - Bulkhead         舱壁隔离（按资源隔离并发）
 *   - ConcurrencyLimiter 异步信号量（并发上限）
 *   - AsyncQueue       有界异步队列（削峰填谷/背压）
 *   - TieredRateLimiter 分级多维限流（滑动窗口/令牌桶）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

export { CircuitBreaker, ResilienceErrorCodes } from './CircuitBreaker.js';
export type {
  CircuitState,
  CircuitBreakerOptions,
  CircuitMetrics,
} from './CircuitBreaker.js';

export { ConcurrencyLimiter } from './ConcurrencyLimiter.js';
export type { ConcurrencyLimiterOptions, LimiterMetrics } from './ConcurrencyLimiter.js';

export { Bulkhead } from './Bulkhead.js';
export type { BulkheadPolicy, BulkheadResourceOptions } from './Bulkhead.js';

export { AsyncQueue } from './AsyncQueue.js';
export type {
  QueueOnFull,
  AsyncQueueOptions,
  QueueMetrics,
} from './AsyncQueue.js';

export { TieredRateLimiter, assertAllowed } from './RateLimiter.js';
export type {
  RateAlgorithm,
  TierRule,
  RateDecision,
} from './RateLimiter.js';
