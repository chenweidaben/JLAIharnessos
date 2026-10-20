/**
 * 健澜科技 jlmedaios - 事件总线深度接口（M426 DEMO_MODE=1 短路）
 *
 * GET /api/v1/events/bus/list          事件总线消息列表
 * GET /api/v1/events/bus/topics        主题(topic)列表
 * GET /api/v1/events/bus/subscriptions 订阅关系
 * GET /api/v1/events/bus/dead-letter   死信队列
 * GET /api/v1/events/bus/replay         事件重放记录
 * GET /api/v1/events/bus/metrics       总线指标
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function makeItems(builder: (i: number) => Record<string, unknown>, n = 5) {
  return Array.from({ length: n }, (_, i) => ({ id: `bus-${i + 1}`, ...builder(i + 1) }));
}

export const eventsBusDetailRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/events/bus/list',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems((n) => ({ eventId: `EVT-${1000 + n}`, type: `event-type-${n}`, producer: `producer-${n}`, time: new Date(Date.now() - n * 60000).toISOString(), status: n % 2 === 0 ? 'delivered' : 'pending' })) })),
  },
  {
    method: 'GET',
    path: '/api/v1/events/bus/topics',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems((n) => ({ topic: `topic-${n}`, partitions: n * 3, subscribers: n + 1, messageCount: n * 1200 })) })),
  },
  {
    method: 'GET',
    path: '/api/v1/events/bus/subscriptions',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems((n) => ({ topic: `topic-${n}`, consumerGroup: `cg-${n}`, status: n % 2 === 0 ? 'healthy' : 'lagging', latencyMs: n * 350 })) })),
  },
  {
    method: 'GET',
    path: '/api/v1/events/bus/dead-letter',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems((n) => ({ eventId: `DLQ-${2000 + n}`, topic: `topic-${n}`, reason: `failure-reason-${n}`, retries: n, time: new Date(Date.now() - n * 3600000).toISOString() })) })),
  },
  {
    method: 'GET',
    path: '/api/v1/events/bus/replay',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems((n) => ({ batchNo: `RPL-${3000 + n}`, topic: `topic-${n}`, range: `offset ${n * 100}-${n * 100 + 50}`, operator: `admin-${n}`, status: n % 2 === 0 ? 'done' : 'running' })) })),
  },
  {
    method: 'GET',
    path: '/api/v1/events/bus/metrics',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems((n) => ({ metric: `metric-${n}`, value: n * 12.5, unit: n % 2 === 0 ? 'msg/s' : 'ms', peak: n * 20, time: new Date(Date.now() - n * 60000).toISOString() })) })),
  },
];