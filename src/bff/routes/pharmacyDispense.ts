/**
 * 健澜科技 jlmedaios - 院内药房调剂补建（M442 DEMO_MODE=1 短路）
 * 说明：dispense 既有200，本文件补建 returns/consultations/narcotics/stock-counts/formulary。
 *
 * GET /api/v1/pharmacy/returns          退药记录
 * GET /api/v1/pharmacy/consultations     用药咨询
 * GET /api/v1/pharmacy/narcotics         毒麻精药管理
 * GET /api/v1/pharmacy/stock-counts      药品盘点
 * GET /api/v1/pharmacy/formulary         院内处方集
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `rx-${i + 1}`, ...builder(i + 1) })) };
}

export const pharmacyDispenseM442Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/pharmacy/returns',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ prescriptionNo: `RX-${1000 + n}`, drug: `药品-${n}`, quantity: n, reason: `退药原因-${n}`, approver: `审批人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/pharmacy/consultations',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ consultNo: `CS-${2000 + n}`, patient: `患者-${n}`, drug: `药品-${n}`, answer: `药师答复-${n}`, satisfaction: n % 2 === 0 ? 'good' : 'ok' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/pharmacy/narcotics',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ drug: `毒麻药品-${n}`, batch: `批-${n}`, safe: `专柜-${n}`, dualCheck: true, balance: 100 - n * 5 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/pharmacy/stock-counts',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ drug: `药品-${n}`, bookCount: 500, actualCount: 500 - (n % 3), diff: -(n % 3), counter: `盘点人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/pharmacy/formulary',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ drug: `药品-${n}`, category: `类别-${n}`, indication: `适应症-${n}`, limitLevel: n % 2 === 0 ? '甲类' : '乙类', status: 'active' })))),
  },
];