/**
 * 健澜科技 jlmedaios - 事件总线与通知中心深化（M447 DEMO_MODE=1 短路）
 * 说明：M426 事件总线基础端点 /api/v1/events/bus/* 已做，本批为 system-events/订阅/审计 + 通知中心。
 *
 * GET /api/v1/event-bus/system-events  系统事件流
 * GET /api/v1/notify/messages          消息通知
 * GET /api/v1/notify/todos             待办中心
 * GET /api/v1/event-bus/subscriptions  订阅规则
 * GET /api/v1/event-bus/audit          事件审计
 * GET /api/v1/notify/push-records      推送记录
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `ev-${i + 1}`, ...builder(i + 1) })) };
}

export const eventNotifyM447Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/event-bus/system-events',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ eventNo: `EVT-${11000 + n}`, type: `事件类型-${n}`, source: `服务-${n}`, payloadSummary: `载荷摘要-${n}`, time: new Date(Date.now() - n * 60000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/notify/messages',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ notifyNo: `NT-${12000 + n}`, receiver: `接收人-${n}`, title: `标题-${n}`, readStatus: n % 2 === 0 ? 'read' : 'unread', time: new Date(Date.now() - n * 60000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/notify/todos',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ todoNo: `TD-${13000 + n}`, assignee: `办理人-${n}`, item: `事项-${n}`, priority: n % 2 === 0 ? 'high' : 'normal', dueAt: new Date(Date.now() + 24 * 3600000).toISOString(), status: n % 2 === 0 ? 'done' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/event-bus/subscriptions',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ subNo: `SUB-${14000 + n}`, eventType: `事件类型-${n}`, channel: n % 2 === 0 ? 'webhook' : 'mq', receiver: `接收人-${n}`, enabled: true })))),
  },
  {
    method: 'GET',
    path: '/api/v1/event-bus/audit',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ eventNo: `EVT-${11000 + n}`, subscriber: `订阅方-${n}`, deliveryResult: n % 2 === 0 ? 'success' : 'failed', retryCount: n % 2, time: new Date(Date.now() - n * 60000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/notify/push-records',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ recordNo: `PR-${15000 + n}`, channel: n % 2 === 0 ? 'sms' : 'app', target: `目标-${n}`, deliveryStatus: n % 2 === 0 ? 'delivered' : 'failed', failReason: n % 2 === 0 ? '' : 'token-expired' })))),
  },
];