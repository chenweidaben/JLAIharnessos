/**
 * 健澜科技 jlmedaios - M517 P0 合规重点（医疗质量安全·麻醉深度）：手术麻醉深度监控 3 端点
 *
 * anesthesia/grading 麻醉分级、anesthesia/intraop-events 术中事件、anesthesia/analgesia 术后镇痛。
 * 与 M492 /operation/anesthesia 概览区分（走 anesthesia/ 新前缀）；与 M516 /disease/*、M515 /safety/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * 字段契约（严格对齐前端 web/src/services/api/anesthesiaDeepBoard.ts GradingRow）：
 *   grading: { id, patient, surgery, asa: 'I'|'II'|'III'|'IV'|'V', method: 'general'|'spinal'|'nerveBlock'|'local' }
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/anesthesia/grading - 麻醉分级 5 条（结构化枚举，前端 Tag 渲染） */
async function handleAnesthesiaGrading(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AG-001', patient: '张**', surgery: '腹腔镜胆囊切除术', asa: 'I', method: 'general' },
    { id: 'AG-002', patient: '李**', surgery: '全髋关节置换术', asa: 'III', method: 'spinal' },
    { id: 'AG-003', patient: '王**', surgery: '食管癌根治术', asa: 'IV', method: 'general' },
    { id: 'AG-004', patient: '赵**', surgery: '冠状动脉旁路移植术', asa: 'IV', method: 'general' },
    { id: 'AG-005', patient: '陈**', surgery: '急诊脾破裂修补术', asa: 'II', method: 'local' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/anesthesia/intraop-events - 术中事件时间线 5 条（结构化，供深度钻取） */
async function handleAnesthesiaIntraopEvents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AIE-001', surgery: '腹腔镜胆囊切除术', eventType: 'hypotension', occurredAt: '2026-10-20T10:30:00+08:00', severity: 'moderate', treatment: '加快输液 + 麻黄碱 10mg iv', resolved: true },
    { id: 'AIE-002', surgery: '全髋关节置换术', eventType: 'hypertension', occurredAt: '2026-10-19T14:00:00+08:00', severity: 'moderate', treatment: '加深麻醉 + 尼卡地平 0.5mg iv', resolved: true },
    { id: 'AIE-003', surgery: '食管癌根治术', eventType: 'hypoxemia', occurredAt: '2026-10-18T09:30:00+08:00', severity: 'severe', treatment: '调整导管深度 + 纯氧通气', resolved: true },
    { id: 'AIE-004', surgery: 'CABG', eventType: 'arrhythmia', occurredAt: '2026-10-17T11:00:00+08:00', severity: 'severe', treatment: '利多卡因 50mg iv + 补钾', resolved: true },
    { id: 'AIE-005', surgery: '急诊脾破裂修补术', eventType: 'allergy', occurredAt: '2026-10-16T15:00:00+08:00', severity: 'severe', treatment: '停药 + 肾上腺素 0.1mg iv + 激素', resolved: true },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/anesthesia/analgesia - 术后镇痛方式 5 条（结构化） */
async function handleAnesthesiaAnalgesia(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AA-001', patient: '张**', method: 'PCIA', vasRest: 2, vasActivity: 4, satisfaction: 95 },
    { id: 'AA-002', patient: '李**', method: 'epidural', vasRest: 2, vasActivity: 5, satisfaction: 92 },
    { id: 'AA-003', patient: '王**', method: 'nerveBlock', vasRest: 3, vasActivity: 6, satisfaction: 85 },
    { id: 'AA-004', patient: '赵**', method: 'ivSingle', vasRest: 4, vasActivity: 7, satisfaction: 82 },
    { id: 'AA-005', patient: '陈**', method: 'PCIA', vasRest: 2, vasActivity: 3, satisfaction: 96 },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m517Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/anesthesia/grading', handle: handleAnesthesiaGrading, auth: true },
  { method: 'GET', path: '/api/v1/anesthesia/intraop-events', handle: handleAnesthesiaIntraopEvents, auth: true },
  { method: 'GET', path: '/api/v1/anesthesia/analgesia', handle: handleAnesthesiaAnalgesia, auth: true },
];
