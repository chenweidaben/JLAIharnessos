/**
 * 健澜科技 jlmedaios - M294 诊断建议
 *
 * CDS 诊断建议
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/cds/diagnosis-suggest - 诊断建议 5 条 */
async function handleDiagnosisSuggest(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DS-001', patient: '王***', symptoms: '发热（38.5°C）、咳嗽、咳痰（黄色）', suggestedDiagnosis: '社区获得性肺炎（细菌性）', confidence: '92%', evidence: '症状+胸片浸润影+血常规白细胞升高' },
    { id: 'DS-002', patient: '李***', symptoms: '胸痛（压榨样）、向左肩放射、大汗', suggestedDiagnosis: '急性心肌梗死', confidence: '96%', evidence: '症状+心电图 ST 段抬高+肌钙蛋白升高' },
    { id: 'DS-003', patient: '张***', symptoms: '腹痛（转移性右下腹痛）、恶心、呕吐', suggestedDiagnosis: '急性阑尾炎', confidence: '88%', evidence: 'McBurney 点压痛+反跳痛+血常规' },
    { id: 'DS-004', patient: '赵***', symptoms: '多饮、多尿、体重下降（近 3 个月）', suggestedDiagnosis: '2 型糖尿病', confidence: '90%', evidence: '空腹血糖 8.5 mmol/L+糖化血红蛋白 7.8%' },
    { id: 'DS-005', patient: '孙***', symptoms: '头痛（搏动性）、恶心、畏光', suggestedDiagnosis: '偏头痛（无先兆型）', confidence: '85%', evidence: '症状反复发作+神经系统检查正常+排除继发性头痛' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m294Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/cds/diagnosis-suggest', handle: handleDiagnosisSuggest, auth: true },
];
