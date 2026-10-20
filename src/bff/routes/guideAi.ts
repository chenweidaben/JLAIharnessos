/**
 * 健澜科技 jlmedaios - 智能导诊与就医问答（M462 DEMO_MODE=1 短路）
 * 说明：避开 M457 分诊排队(queue/*)、M459 院内导航停车(nav/*、parking/*)、M439 挂号、M447 通知中心；
 * 独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/guide/chat             智能导诊对话
 * GET /api/v1/guide/symptom-check    症状自查
 * GET /api/v1/guide/dept-recommend   科室推荐
 * GET /api/v1/guide/find-doctor      帮你找医生
 * GET /api/v1/guide/notice            就诊须知
 * GET /api/v1/guide/route-plan        就诊流程规划
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `gd-${i + 1}`, ...builder(i + 1) })) };
}

export const guideM462Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/guide/chat',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ session: `会话-${n}`, patientNeed: `患者诉求-${n}`, aiReply: `AI回复-${n}`, recommendDept: `推荐科室-${n}`, confidence: 0.8 + n * 0.03 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/guide/symptom-check',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ symptom: `症状项-${n}`, relatedDisease: `关联疾病-${n}`, suggestDept: `建议科室-${n}`, riskLevel: n % 3 === 0 ? 'high' : n % 3 === 1 ? 'mid' : 'low', tip: `提示语-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/guide/dept-recommend',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ chiefComplaint: `主诉-${n}`, matchDept: `匹配科室-${n}`, doctor: `医生-${n}`, slot: `挂号时段-${n}`, match: 0.7 + n * 0.04 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/guide/find-doctor',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ doctor: `医生-${n}`, department: `科室-${n}`, title: `职称-${n}`, specialty: `擅长-${n}`, schedule: `出诊时间-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/guide/notice',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ item: `须知项-${n}`, scene: `适用场景-${n}`, materialList: `材料清单-${n}`, notes: `注意事项-${n}`, updatedAt: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/guide/route-plan',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ step: n, stage: `环节-${n}`, etaMin: n * 5, material: `材料-${n}`, done: n % 2 === 0 })))),
  },
];