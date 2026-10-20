/**
 * 健澜科技 jlmedaios - 事件总线深度接口（M418）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function makeItems(kind: string, n = 5) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${kind}-${i + 1}`,
    kind,
    name: `${kind} #${i + 1}`,
    status: i % 2 === 0 ? 'active' : 'paused',
    time: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
    detail: `${kind} 第${i + 1}条（DEMO）`,
  }));
}

export const eventsBusRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/events/types-detail', auth: false, handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('type') })) },
  { method: 'GET', path: '/api/v1/events/subscribers-detail', auth: false, handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('subscriber') })) },
  { method: 'GET', path: '/api/v1/events/publishers-detail', auth: false, handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('publisher') })) },
  { method: 'GET', path: '/api/v1/events/consumers-detail', auth: false, handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('consumer') })) },
  { method: 'GET', path: '/api/v1/events/dead-letter-detail', auth: false, handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('dead-letter') })) },
  { method: 'GET', path: '/api/v1/events/metrics-detail', auth: false, handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('metric') })) },
];