/**
 * 健澜科技 jlmedaios - 门诊预约与号源池管理（M466 DEMO_MODE=1 短路）
 * 说明：避开 M439 门诊挂号主域、M457 分诊排队、M446 医技预约；
 * 与既有 m277 的 /schedule/today、/appointment/list 静态段不重叠，无动态 :id；
 * 独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/quota/pool             号源池
 * GET /api/v1/appointment/records     预约记录
 * GET /api/v1/appointment/no-show     爽约管理
 * GET /api/v1/appointment/waitlist    候补排队
 * GET /api/v1/quota/cancel            退号记录
 * GET /api/v1/quota/stats             号源统计
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `qt-${i + 1}`, ...builder(i + 1) })) };
}

export const quotaM466Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/quota/pool',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ department: `科室-${n}`, doctor: `医生-${n}`, date: new Date(Date.now() + n * 86400000).toISOString().slice(0, 10), slot: `时段-${n}`, totalQuota: 30, remaining: 30 - n * 4 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/appointment/records',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ apptNo: `AP-${82000 + n}`, patient: `患者-${n}`, doctor: `医生-${n}`, time: new Date(Date.now() + n * 3600000).toISOString(), channel: n % 2 === 0 ? 'app' : 'kiosk', status: n % 2 === 0 ? 'booked' : 'arrived' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/appointment/no-show',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ patient: `患者-${n}`, slot: `预约时段-${n}`, noShowCount: n, creditScore: 100 - n * 5, action: n % 2 === 0 ? 'warn' : 'restrict' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/appointment/waitlist',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ patient: `患者-${n}`, targetQuota: `目标号源-${n}`, queuePos: n, notifyStatus: n % 2 === 0 ? 'notified' : 'waiting' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/quota/cancel',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ originalAppt: `AP-${83000 + n}`, cancelTime: new Date(Date.now() - n * 3600000).toISOString(), reason: `原因-${n}`, released: true })))),
  },
  {
    method: 'GET',
    path: '/api/v1/quota/stats',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ department: `科室-${n}`, totalQuota: 100, bookRate: (0.7 + n * 0.04).toFixed(2), noShowRate: (0.05 + n * 0.01).toFixed(2), cancelRate: (0.03 + n * 0.005).toFixed(2) })))),
  },
];