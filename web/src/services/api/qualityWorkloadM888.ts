/**
 * 健澜科技 jlmedaios - 医疗质量管理 API（M888）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface QualityWorkload {
  id: string;
  date: string;
  recordGradeA: number;
  surgicalComplication: number;
  hospitalInfection: number;
  pressureUlcer: number;
  falls: number;
  status: string;
  corePolicies: string;
  recordBreakdown: { name: string; count: number }[];
  surgicalQuality: string;
  singleDisease: string;
  adverseEvents: string;
}

const DEMO: QualityWorkload[] = [
  {
    id: 'Q-888',
    date: '2026-10-22',
    recordGradeA: 98.5,
    surgicalComplication: 1.2,
    hospitalInfection: 1.8,
    pressureUlcer: 0.5,
    falls: 0.3,
    status: '正常运行',
    corePolicies: '核心制度落实：三级查房率 100%；疑难病例讨论 6 例；死亡病例讨论 2 例；术前讨论 100%。',
    recordBreakdown: [
      { name: '甲级病历', count: 108 },
      { name: '乙级病历', count: 2 },
      { name: '丙级病历', count: 0 },
    ],
    surgicalQuality: '手术质量：并发症率 1.2%；手术死亡率 0.15%；非计划再次手术 1 例（已 root cause 分析）。',
    singleDisease: '单病种质量：急性心梗（D2B 达标 95%）；心衰 30 天再入院率 8%；社区获得性肺炎抗生素合理率 92%。',
    adverseEvents: '医疗不良事件：今日上报 4 例（跌倒 2/压疮 1/给药错误 1）；根因分析完成率 100%。',
  },
];

export interface QualityWorkloadListResult {
  items: QualityWorkload[];
  demo: boolean;
}

export async function fetchQualityWorkload(): Promise<QualityWorkloadListResult> {
  try {
    const res = await get<{ items: QualityWorkload[] }>('/quality/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
