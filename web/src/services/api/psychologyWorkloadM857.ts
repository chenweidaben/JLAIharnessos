/**
 * 健澜科技 jlmedaios - 心理科管理（M857 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PsychologyWorkloadM857 {
  id: string;
  date: string;
  outpatient: number;
  assessment: number;
  cbt: number;
  groupTherapy: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  assessmentScores: string;
  treatmentRecords: string;
  crisisIntervention: string;
}

const DEMO: PsychologyWorkloadM857[] = [
  {
    id: 'PSY-857',
    date: '2026-10-22',
    outpatient: 42,
    assessment: 28,
    cbt: 18,
    groupTherapy: 4,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '焦虑障碍', count: 14 },
      { name: '抑郁障碍', count: 12 },
      { name: '失眠', count: 8 },
      { name: '强迫障碍', count: 4 },
      { name: '其他（适应障碍/躯体形式）', count: 4 },
    ],
    assessmentScores: '心理评估：SDS 平均 56（中度抑郁倾向 8 例）；SAS 平均 52（中度焦虑 10 例）；PHQ-9 ≥10 分 10 例；GAD-7 ≥10 分 12 例。',
    treatmentRecords: '治疗记录：认知行为治疗（CBT）个体 18 例；团体心理治疗 1 场（4 人）；药物治疗（SSRI/SNRI）14 例。',
    crisisIntervention: '危机干预：自杀风险评估 3 例（高风险 1 例，已转精神科住院）；电话危机热线接听 6 例。',
  },
];

export interface PsychologyWorkloadM857Result {
  items: PsychologyWorkloadM857[];
  demo: boolean;
}

export async function fetchPsychologyWorkloadM857(): Promise<PsychologyWorkloadM857Result> {
  try {
    const res = await get<{ items: PsychologyWorkloadM857[] }>('/psychology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
