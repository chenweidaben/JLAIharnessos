/**
 * 健澜科技 jlmedaios - CDS临床决策支持深化（M448 DEMO_MODE=1 短路）
 * 说明：rules/hits 既有200，本文件补建 intercepts/interactions/diff-diagnosis/decision-log。
 *
 * GET /api/v1/cds/intercepts          医嘱拦截
 * GET /api/v1/cds/interactions        用药相互作用
 * GET /api/v1/cds/diff-diagnosis     鉴别诊断推荐
 * GET /api/v1/cds/decision-log        决策日志
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `cds-${i + 1}`, ...builder(i + 1) })) };
}

export const cdsM448Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/cds/intercepts',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ orderNo: `ORD-${16000 + n}`, reason: `拦截原因-${n}`, level: n % 2 === 0 ? 'hard' : 'soft', releaser: `解除人-${n}`, time: new Date(Date.now() - n * 60000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/cds/interactions',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ drugA: `药品A-${n}`, drugB: `药品B-${n}`, type: `作用类型-${n}`, severity: n % 2 === 0 ? 'major' : 'minor', advice: `建议-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/cds/diff-diagnosis',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ chiefComplaint: `主诉-${n}`, candidate: `候选诊断-${n}`, confidence: 0.8 - n * 0.05, evidence: `依据-${n}`, recommendedDoctor: `推荐医生-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/cds/decision-log',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ sessionNo: `SESS-${17000 + n}`, triggeredRule: `规则-${n}`, output: `输出-${n}`, adopted: n % 2 === 0, time: new Date(Date.now() - n * 60000).toISOString() })))),
  },
];