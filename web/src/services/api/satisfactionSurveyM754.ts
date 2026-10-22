/**
 * 健澜科技 jlmedaios - 满意度调查管理 API（M754）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type SurveyStatus = 'draft' | 'running' | 'closed';

export interface SatisfactionSurvey {
  id: string;
  name: string;
  type: string;
  distributed: number;
  collected: number;
  score: number;
  status: SurveyStatus;
  structure: string;
  stats: string;
  suggestions: string;
}

export const SURVEY_STATUS_META: Record<SurveyStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  running: { label: '进行中', color: 'processing' },
  closed: { label: '已结束', color: 'green' },
};

const DEMO: SatisfactionSurvey[] = [
  {
    id: 'SS-001',
    name: '2026 Q3 门诊满意度调查',
    type: '门诊患者',
    distributed: 2000,
    collected: 1620,
    score: 92.5,
    status: 'closed',
    structure: '6 个维度 20 题（挂号/候诊/诊疗/收费/药房/环境）。',
    stats: '门诊整体满意度 92.5%；候诊时长为主要扣分项。',
    suggestions: '优化分诊叫号、增加高峰期窗口。',
  },
];

export interface SurveyListResult {
  items: SatisfactionSurvey[];
  demo: boolean;
}

export async function fetchSatisfactionSurveys(): Promise<SurveyListResult> {
  try {
    const res = await get<{ items: SatisfactionSurvey[] }>('/patient-service/satisfaction-surveys');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
