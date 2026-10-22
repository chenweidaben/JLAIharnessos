/**
 * 健澜科技 jlmedaios - 出院小结 v2 API（M649，配套 M576）
 *
 * 对接 BFF：GET /api/v1/discharge/summaries
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type DischargeMode = 'cured' | 'improved' | 'not_cured' | 'dead' | 'left';

export interface DischargeSummary {
  id: string;
  patientId: string;
  ward: string;
  admissionDate: string;
  dischargeDate: string;
  admissionDiagnosis: string;
  dischargeDiagnosis: string;
  dischargeMode: DischargeMode;
  treatmentSummary: string;
  followupAdvice: string;
}

export const DISCHARGE_MODE_META: Record<DischargeMode, { label: string; color: string }> = {
  cured: { label: '治愈', color: 'green' },
  improved: { label: '好转', color: 'blue' },
  not_cured: { label: '未愈', color: 'orange' },
  dead: { label: '死亡', color: 'red' },
  left: { label: '自动出院', color: 'default' },
};

const DEMO_SUMMARIES: DischargeSummary[] = [
  {
    id: 'DS-001',
    patientId: 'P10002',
    ward: '普外科',
    admissionDate: '2026-10-15',
    dischargeDate: '2026-10-22',
    admissionDiagnosis: '急性阑尾炎',
    dischargeDiagnosis: '急性阑尾炎（术后）',
    dischargeMode: 'cured',
    treatmentSummary: '腹腔镜阑尾切除术，术后恢复顺利，伤口愈合 II/甲。',
    followupAdvice: '术后 7 天门诊拆线，清淡饮食，避免剧烈运动 1 个月。',
  },
  {
    id: 'DS-002',
    patientId: 'P10005',
    ward: '心内科',
    admissionDate: '2026-10-10',
    dischargeDate: '2026-10-20',
    admissionDiagnosis: '冠心病、不稳定型心绞痛',
    dischargeDiagnosis: '冠状动脉支架植入术后（PCI）',
    dischargeMode: 'improved',
    treatmentSummary: 'PCI 植入支架 1 枚，双联抗血小板治疗。',
    followupAdvice: '坚持阿司匹林 + 氯吡格雷 12 个月，每月门诊随访，避免剧烈运动。',
  },
];

export interface DischargeListResult {
  items: DischargeSummary[];
  totalCount: number;
  demo: boolean;
}

export async function fetchDischargeSummaries(patientId: string): Promise<DischargeListResult> {
  try {
    const res = await get<{ items: DischargeSummary[]; totalCount: number }>('/discharge/summaries', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_SUMMARIES.filter((s) => s.patientId === patientId), totalCount: 0, demo: true };
  }
}
