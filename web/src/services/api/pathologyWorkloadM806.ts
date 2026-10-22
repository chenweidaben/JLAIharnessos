/**
 * 健澜科技 jlmedaios - 病理科管理 API（M806）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PathologyWorkload {
  id: string;
  date: string;
  specimenType: string;
  specimens: number;
  diagnoses: number;
  reportSla: string;
  status: string;
  typeBreakdown: { name: string; count: number }[];
  concordance: string;
  reportTimeliness: string;
  ihcRecords: { item: string; count: number }[];
}

const DEMO: PathologyWorkload[] = [
  {
    id: 'PA-001',
    date: '2026-10-22',
    specimenType: '综合',
    specimens: 86,
    diagnoses: 78,
    reportSla: '常规 3-5 工作日 / 术中冰冻 30min',
    status: '正常运行',
    typeBreakdown: [
      { name: '常规石蜡', count: 60 },
      { name: '术中冰冻', count: 12 },
      { name: '细胞学', count: 14 },
    ],
    concordance: '冰冻与石蜡诊断符合率 98.5%；术中冰冻延迟 1 例。',
    reportTimeliness: '3 日内发出 76/78，及时率 97.4%。',
    ihcRecords: [
      { item: 'Ki-67', count: 18 },
      { item: 'P53', count: 12 },
      { item: 'ER/PR', count: 8 },
    ],
  },
];

export interface PathologyWorkloadListResult {
  items: PathologyWorkload[];
  demo: boolean;
}

export async function fetchPathologyWorkload(): Promise<PathologyWorkloadListResult> {
  try {
    const res = await get<{ items: PathologyWorkload[] }>('/pathology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
