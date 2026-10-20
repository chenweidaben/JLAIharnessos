/**
 * 健澜科技 jlmedaios - M517b P0 合规重点（医疗质量安全·麻醉深度新方向）：术中安全+术后随访
 *
 * anesthesia/grading 已由 m517Routes.ts 提供；本文件提供：
 *   - /anesthesia/intraop    术中安全总览（前端看板主消费）
 *   - /anesthesia/followup   术后随访（前端看板主消费）
 *
 * 字段契约（严格对齐前端 web/src/services/api/anesthesiaDeepBoard.ts）：
 *   IntraopRow: { id, surgery, anesthetist, event: 'hypotension'|'hypoxemia'|'arrhythmia'|'transfusion'|'checkOk', durationMin: number }
 *   FollowupRow: { id, patient, vas: number(0-10), nauseaVomiting: boolean, completed: boolean }
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/anesthesia/intraop - 术中安全总览 5 条（结构化枚举） */
async function handleAnesthesiaIntraop(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AI-001', surgery: '腹腔镜胆囊切除术', anesthetist: '王医师', event: 'hypotension', durationMin: 95 },
    { id: 'AI-002', surgery: '全髋关节置换术', anesthetist: '李医师', event: 'checkOk', durationMin: 140 },
    { id: 'AI-003', surgery: '食管癌根治术', anesthetist: '张教授', event: 'arrhythmia', durationMin: 260 },
    { id: 'AI-004', surgery: '冠状动脉旁路移植术', anesthetist: '刘教授', event: 'transfusion', durationMin: 320 },
    { id: 'AI-005', surgery: '急诊脾破裂修补术', anesthetist: '陈医师', event: 'hypoxemia', durationMin: 75 },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/anesthesia/followup - 术后随访 5 条（结构化数值/布尔） */
async function handleAnesthesiaFollowup(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AF-001', patient: '张**', vas: 2, nauseaVomiting: false, completed: true },
    { id: 'AF-002', patient: '李**', vas: 5, nauseaVomiting: true, completed: true },
    { id: 'AF-003', patient: '王**', vas: 5, nauseaVomiting: true, completed: true },
    { id: 'AF-004', patient: '赵**', vas: 2, nauseaVomiting: false, completed: true },
    { id: 'AF-005', patient: '陈**', vas: 7, nauseaVomiting: true, completed: false },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m517bRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/anesthesia/intraop', handle: handleAnesthesiaIntraop, auth: true },
  { method: 'GET', path: '/api/v1/anesthesia/followup', handle: handleAnesthesiaFollowup, auth: true },
];
