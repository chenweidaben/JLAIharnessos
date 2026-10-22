/**
 * 健澜科技 jlmedaios - 康复医学科管理 API（M773）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type RehabStage = 'assessment' | 'acute' | 'recovery' | 'outpatient' | 'discharged';

export interface RehabPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  stage: RehabStage;
  therapist: string;
  status: string;
  assessment: string;
  plan: string;
  progress: string;
  dischargePlan: string;
}

export const REHAB_STAGE_META: Record<RehabStage, { label: string; color: string }> = {
  assessment: { label: '评定期', color: 'blue' },
  acute: { label: '急性期康复', color: 'orange' },
  recovery: { label: '恢复期康复', color: 'processing' },
  outpatient: { label: '门诊随访', color: 'purple' },
  discharged: { label: '已出院', color: 'default' },
};

const DEMO: RehabPatient[] = [
  {
    id: 'RH-001',
    inpatientNo: 'ZY-261101',
    patient: '王患者',
    diagnosis: '脑梗死后左侧肢体偏瘫',
    stage: 'recovery',
    therapist: '康复治疗师 张治疗师',
    status: '进行中',
    assessment: 'Brunnstrom III 期；改良 Barthel 45 分。',
    plan: '每日偏瘫肢体综合训练 45min + 作业治疗 30min。',
    progress: '3 周后 Brunnstrom IV 期，Barthel 提升至 60 分。',
    dischargePlan: '预计 2 周后转社区康复，家庭康复指导。',
  },
];

export interface RehabListResult {
  items: RehabPatient[];
  demo: boolean;
}

export async function fetchRehabPatients(): Promise<RehabListResult> {
  try {
    const res = await get<{ items: RehabPatient[] }>('/clinical/rehab-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
