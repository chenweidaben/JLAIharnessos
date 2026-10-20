/**
 * 健澜科技 jlmedaios - M519 P0 合规重点（医疗质量安全·输血深度）：输血质控深度监控
 *
 * 字段契约（为前端看板预定义结构化枚举）：
 *   TransfusionApplicationRow: { id, patient, bloodType: 'A'|'B'|'O'|'AB', rh: 'positive'|'negative',
 *                                  component: 'RBC'|'plasma'|'platelet'|'wholeBlood',
 *                                  dept, amount, diagnosis }
 *   AdverseReactionRow:        { id, patient, reactionType: 'fever'|'allergy'|'hemolysis'|'bacterial',
 *                                  occurredAt, severity: 'mild'|'moderate'|'severe',
 *                                  treatment, resolved: boolean }
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/transfusion/applications - 输血申请 5 条（结构化枚举） */
async function handleTransfusionApplications(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TA-001', patient: '张**', bloodType: 'A', rh: 'positive', component: 'RBC', dept: '消化内科', amount: '2U', diagnosis: '消化道出血，Hb 75g/L' },
    { id: 'TA-002', patient: '李**', bloodType: 'B', rh: 'positive', component: 'plasma', dept: '血液内科', amount: '400ml', diagnosis: '凝血功能异常，ITP 合并 DIC 倾向' },
    { id: 'TA-003', patient: '王**', bloodType: 'O', rh: 'positive', component: 'platelet', dept: '血液内科', amount: '1治疗量', diagnosis: '化疗后骨髓抑制，Plt 20×10⁹/L' },
    { id: 'TA-004', patient: '赵**', bloodType: 'AB', rh: 'positive', component: 'RBC', dept: '心外科', amount: '4U', diagnosis: 'CABG 手术备血' },
    { id: 'TA-005', patient: '孙**', bloodType: 'A', rh: 'negative', component: 'wholeBlood', dept: '急诊创伤外科', amount: '400ml', diagnosis: '脾破裂失血性休克，RhD 阴性稀有血型' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/transfusion/adverse-reactions - 输血不良反应 5 条（结构化枚举/布尔） */
async function handleTransfusionAdverseReactions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TAR-001', patient: '张**', reactionType: 'fever', occurredAt: '2026-10-20T14:30:00+08:00', severity: 'mild', treatment: '暂停输血 + 解热镇痛药 + 减慢速度', resolved: true },
    { id: 'TAR-002', patient: '李**', reactionType: 'allergy', occurredAt: '2026-10-20T10:15:00+08:00', severity: 'moderate', treatment: '暂停输血 + 抗组胺药 + 激素', resolved: true },
    { id: 'TAR-003', patient: '王**', reactionType: 'hemolysis', occurredAt: '2026-10-19T15:00:00+08:00', severity: 'severe', treatment: '立即停止输血 + 抗休克 + 碱化尿液 + 上报输血科', resolved: false },
    { id: 'TAR-004', patient: '赵**', reactionType: 'bacterial', occurredAt: '2026-10-18T11:00:00+08:00', severity: 'severe', treatment: '停止输血 + 广谱抗生素 + 血培养 + 上报血站', resolved: false },
    { id: 'TAR-005', patient: '孙**', reactionType: 'fever', occurredAt: '2026-10-17T16:00:00+08:00', severity: 'mild', treatment: '观察 + 物理降温', resolved: true },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m519Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/transfusion/applications', handle: handleTransfusionApplications, auth: true },
  { method: 'GET', path: '/api/v1/transfusion/adverse-reactions', handle: handleTransfusionAdverseReactions, auth: true },
];
