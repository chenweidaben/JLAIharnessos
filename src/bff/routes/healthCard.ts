/**
 * 健澜科技 jlmedaios - 就诊卡与健康账户（M463 DEMO_MODE=1 短路）
 * 说明：避开 M458 缴费机(kiosk/payment)、M442 医保结算、M3-M 在线支付票据、M454 患者门户；
 * 独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/card/apply          就诊卡申领
 * GET /api/v1/card/reissue         换卡挂失
 * GET /api/v1/card/balance         账户余额
 * GET /api/v1/account/transactions 交易流水
 * GET /api/v1/account/family        亲情账户
 * GET /api/v1/card/records         用卡记录
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `hc-${i + 1}`, ...builder(i + 1) })) };
}

export const cardM463Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/card/apply',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ cardNo: `C${61000000 + n}`, holder: `持卡人-${n}`, cardType: n % 2 === 0 ? 'resident' : 'medicare', channel: n % 2 === 0 ? 'kiosk' : 'app', status: 'issued' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/card/reissue',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ oldCard: `C${62000000 + n}`, newCard: `C${63000000 + n}`, reason: `原因-${n}`, handler: `经办人-${n}`, time: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/card/balance',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ cardNo: `C${64000000 + n}`, balance: 1000 + n * 50, frozen: n * 20, updatedAt: new Date(Date.now() - n * 3600000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/account/transactions',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ txnNo: `TXN-${65000 + n}`, type: n % 2 === 0 ? 'recharge' : 'consume', amount: n * 100, balance: 2000 - n * 50, time: new Date(Date.now() - n * 3600000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/account/family',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ primary: `主账户-${n}`, related: `关联人-${n}`, relation: `关系-${n}`, scope: `授权范围-${n}`, status: 'active' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/card/records',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ cardNo: `C${66000000 + n}`, scene: `场景-${n}`, department: `科室-${n}`, amount: n * 80, time: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
];