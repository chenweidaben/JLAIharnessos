/**
 * 健澜科技 jlmedaios - 心理科管理 API（M827）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PsychologyWorkload {
  id: string;
  date: string;
  counseling: number;
  depressionScreen: number;
  anxietyScreen: number;
  psychotherapy: number;
  status: string;
  typeBreakdown: { name: string; count: number }[];
  scores: string;
  therapyRecords: string;
  mect: string;
  followup: string;
}

const DEMO: PsychologyWorkload[] = [
  {
    id: 'PS-001',
    date: '2026-10-22',
    counseling: 42,
    depressionScreen: 28,
    anxietyScreen: 24,
    psychotherapy: 16,
    status: '正常运行',
    typeBreakdown: [
      { name: '抑郁障碍咨询', count: 16 },
      { name: '焦虑障碍咨询', count: 12 },
      { name: '睡眠障碍咨询', count: 8 },
      { name: '其它（家庭/职业）', count: 6 },
    ],
    scores: 'PHQ-9 ≥10 分 12 例（中重度）；GAD-7 ≥10 分 10 例（中重度）。',
    therapyRecords: '认知行为治疗（CBT）8 例；精神动力学治疗 4 例；支持性心理治疗 4 例。',
    mect: '无抽搐电休克治疗（MECT）2 例（重度抑郁伴自杀观念）。',
    followup: '出院后 2 周/1 月/3 月门诊随访 PHQ-9、GAD-7。',
  },
];

export interface PsychologyWorkloadListResult {
  items: PsychologyWorkload[];
  demo: boolean;
}

export async function fetchPsychologyWorkload(): Promise<PsychologyWorkloadListResult> {
  try {
    const res = await get<{ items: PsychologyWorkload[] }>('/psychology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
