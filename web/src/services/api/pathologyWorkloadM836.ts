/**
 * 健澜科技 jlmedaios - 病理科管理（M836 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PathologyWorkloadM836 {
  id: string;
  date: string;
  biopsy: number;
  cytology: number;
  frozen: number;
  specialStain: number;
  status: string;
  specimenBreakdown: { type: string; count: number }[];
  slideMaking: string;
  diagnosisRecords: string;
  ihcRecords: { item: string; count: number }[];
  remoteConsult: string;
}

const DEMO: PathologyWorkloadM836[] = [
  {
    id: 'PA-836',
    date: '2026-10-22',
    biopsy: 60,
    cytology: 14,
    frozen: 12,
    specialStain: 8,
    status: '正常运行',
    specimenBreakdown: [
      { type: '内镜活检', count: 28 },
      { type: '穿刺活检', count: 18 },
      { type: '手术切除标本', count: 14 },
    ],
    slideMaking: '常规制片 90 张；HE 染色 90；特殊染色 8（PAS / 抗酸 / 网状纤维）。',
    diagnosisRecords: '今日发出报告 78 份；延迟 2 份（需深切/免疫组化辅助）。',
    ihcRecords: [
      { item: 'Ki-67', count: 18 },
      { item: 'P53', count: 12 },
      { item: 'ER/PR', count: 8 },
      { item: 'HER2', count: 4 },
    ],
    remoteConsult: '远程会诊 1 例（基层医院疑难乳腺病例）；已回传。',
  },
];

export interface PathologyWorkloadM836Result {
  items: PathologyWorkloadM836[];
  demo: boolean;
}

export async function fetchPathologyWorkloadM836(): Promise<PathologyWorkloadM836Result> {
  try {
    const res = await get<{ items: PathologyWorkloadM836[] }>('/pathology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
