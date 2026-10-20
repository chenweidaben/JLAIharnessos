/**
 * 健澜科技 jlmedaios - 患者服务与关怀深度（M444 DEMO_MODE=1 短路）
 * 说明：智慧服务三级 service/* 已做，本批聚焦院内关怀闭环。
 *
 * GET /api/v1/care/surveys         满意度调查
 * GET /api/v1/care/complaints       投诉建议
 * GET /api/v1/care/volunteers      志愿者服务
 * GET /api/v1/care/companions      陪护管理
 * GET /api/v1/care/followups       出院随访任务
 * GET /api/v1/care/accessibility   无障碍服务
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `care-${i + 1}`, ...builder(i + 1) })) };
}

export const careM444Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/care/surveys',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ surveyNo: `SV-${6000 + n}`, department: `科室-${n}`, score: 5 - (n % 2), suggestion: `建议-${n}`, collectStatus: n % 2 === 0 ? 'collected' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/care/complaints',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ ticketNo: `CP-${7000 + n}`, patient: `患者-${n}`, type: `类型-${n}`, handler: `受理人-${n}`, status: n % 2 === 0 ? 'resolved' : 'processing' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/care/volunteers',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ volunteer: `志愿者-${n}`, post: `岗位-${n}`, slot: `服务时段-${n}`, hours: n * 2, rating: 5 - (n % 2) })))),
  },
  {
    method: 'GET',
    path: '/api/v1/care/companions',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, caregiver: `护工-${n}`, agreement: `协议-${n}`, fee: n * 150, status: 'active' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/care/followups',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ inpatientNo: `ZY-${8000 + n}`, method: n % 2 === 0 ? 'phone' : 'wechat', follower: `随访人-${n}`, result: `结果-${n}`, nextAt: new Date(Date.now() + 30 * 86400000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/care/accessibility',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ service: `无障碍服务项-${n}`, audience: `对象-${n}`, mode: `服务方式-${n}`, recorder: `记录人-${n}`, time: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
];