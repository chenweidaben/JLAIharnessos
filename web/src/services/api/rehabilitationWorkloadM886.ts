/**
 * 健澜科技 jlmedaios - 康复科管理（M886 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface RehabilitationWorkloadM886 {
  id: string;
  date: string;
  assessments: number;
  pt: number;
  ot: number;
  st: number;
  acupunctureMassage: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  assessment: string;
  modalities: { name: string; count: number }[];
  outcome: string;
}

const DEMO: RehabilitationWorkloadM886[] = [
  {
    id: 'RH-886',
    date: '2026-10-22',
    assessments: 28,
    pt: 60,
    ot: 24,
    st: 12,
    acupunctureMassage: 30,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '脑卒中', count: 18 },
      { name: '脑外伤', count: 4 },
      { name: '脊髓损伤', count: 4 },
      { name: '骨关节术后', count: 12 },
    ],
    assessment: '康复评定：Fugl-Meyer 运动功能评分（上肢/下肢）；Barthel 指数（ADL）；今日新发评定 28 例。',
    modalities: [
      { name: 'PT（物理治疗）', count: 60 },
      { name: 'OT（作业治疗）', count: 24 },
      { name: 'ST（言语治疗）', count: 12 },
      { name: '针灸/推拿', count: 30 },
    ],
    outcome: '康复效果：出院患者 Barthel 指数平均改善 22 分；脑卒中患者步行恢复率 78%。',
  },
];

export interface RehabilitationWorkloadM886Result {
  items: RehabilitationWorkloadM886[];
  demo: boolean;
}

export async function fetchRehabilitationWorkloadM886(): Promise<RehabilitationWorkloadM886Result> {
  try {
    const res = await get<{ items: RehabilitationWorkloadM886[] }>('/rehabilitation/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
