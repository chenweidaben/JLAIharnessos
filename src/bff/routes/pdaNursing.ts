/**
 * 健澜科技 jlmedaios - 移动护理PDA床旁闭环（M446 DEMO_MODE=1 短路）
 * 说明：M438护理执行域已做，本批聚焦PDA扫码闭环。
 *
 * GET /api/v1/pda/order-execution    床旁医嘱执行
 * GET /api/v1/pda/scan-verification  扫码三查七对
 * GET /api/v1/pda/vitals             床旁生命体征录入
 * GET /api/v1/pda/mobile-notes       移动护理记录
 * GET /api/v1/pda/shift-handover     移动端交班
 * GET /api/v1/pda/bedside-supply     床旁耗材登记
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `pda-${i + 1}`, ...builder(i + 1) })) };
}

export const pdaM446Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/pda/order-execution',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ orderNo: `ORD-${9000 + n}`, patient: `患者-${n}`, drug: `药品-${n}`, nurse: `护士-${n}`, scanCheck: 'matched' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/pda/scan-verification',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ wristband: `WB-${n}`, bagCode: `BG-${n}`, checkItem: `核对项-${n}`, matchResult: 'match', time: new Date(Date.now() - n * 60000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/pda/vitals',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, temperature: 36.5 + n * 0.1, pulse: 72 + n, bloodPressure: `12${n}/8${n}`, nurse: `护士-${n}`, time: new Date(Date.now() - n * 60000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/pda/mobile-notes',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, noteItem: `记录项-${n}`, nurse: `护士-${n}`, shift: n % 2 === 0 ? 'day' : 'night', syncStatus: 'synced' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/pda/shift-handover',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ shift: n % 2 === 0 ? '白班' : '夜班', bed: `${n}床`, keyPatient: `重点患者-${n}`, handoverFrom: `交班人-${n}`, handoverTo: `接班人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/pda/bedside-supply',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, supply: `耗材-${n}`, quantity: n, nurse: `护士-${n}`, time: new Date(Date.now() - n * 60000).toISOString() })))),
  },
];