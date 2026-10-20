/**
 * 健澜科技 jlmedaios - 住院费用清单与预交金（M464 DEMO_MODE=1 短路）
 * 说明：避开 M442 医保结算、M458 缴费机(kiosk/payment)、M3-M 在线支付票据、M454 患者门户；
 * 独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/bill/daily     一日费用清单
 * GET /api/v1/bill/detail     费用明细
 * GET /api/v1/deposit/prepay   预交金记录
 * GET /api/v1/deposit/refund   退费记录
 * GET /api/v1/bill/summary     费用汇总
 * GET /api/v1/bill/items       费用项目台账
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `fb-${i + 1}`, ...builder(i + 1) })) };
}

export const billM464Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/bill/daily',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ inpatientNo: `ZY-${700000 + n}`, date: new Date(Date.now() - n * 86400000).toISOString().slice(0, 10), item: `项目-${n}`, amount: n * 120, department: `科室-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/bill/detail',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ detailNo: `FD-${71000 + n}`, item: `项目-${n}`, unitPrice: n * 15, qty: n, amount: n * 15 * n })))),
  },
  {
    method: 'GET',
    path: '/api/v1/deposit/prepay',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ inpatientNo: `ZY-${720000 + n}`, prepay: 2000 + n * 500, time: new Date(Date.now() - n * 86400000).toISOString(), handler: `经办人-${n}`, balance: 3000 - n * 200 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/deposit/refund',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ refundNo: `RF-${73000 + n}`, original: 3000, refund: n * 300, reason: `原因-${n}`, approveStatus: n % 2 === 0 ? 'approved' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/bill/summary',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ inpatientNo: `ZY-${740000 + n}`, totalFee: 8000 + n * 600, insurancePay: 5000 + n * 300, selfPay: 3000 + n * 300, depositOffset: 1000 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/bill/items',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ code: `X${80000 + n}`, name: `费用项目-${n}`, category: `类别-${n}`, unitPrice: n * 10, execDept: `执行科室-${n}` })))),
  },
];