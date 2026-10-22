/**
 * 健澜科技 jlmedaios - 营养科管理 API（M833）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface NutritionWorkload {
  id: string;
  date: string;
  assessments: number;
  consultations: number;
  enteral: number;
  parenteral: number;
  status: string;
  assessmentBreakdown: { tool: string; count: number }[];
  consultRecords: { patient: string; dept: string; reason: string }[];
  prescriptions: string;
  monitoring: { item: string; value: string }[];
}

const DEMO: NutritionWorkload[] = [
  {
    id: 'NT-001',
    date: '2026-10-22',
    assessments: 38,
    consultations: 12,
    enteral: 22,
    parenteral: 8,
    status: '正常运行',
    assessmentBreakdown: [
      { tool: 'NRS-2002', count: 24 },
      { tool: 'PG-SGA（肿瘤）', count: 8 },
      { tool: 'MNA（老年）', count: 6 },
    ],
    consultRecords: [
      { patient: '吕患者', dept: '普外科', reason: '术后肠内营养启动评估' },
    ],
    prescriptions: '肠内营养：整蛋白型 14 例 / 短肽型 6 例 / 免疫增强型 2 例；肠外营养：全合一 8 例。',
    monitoring: [
      { item: '白蛋白', value: '平均 32.5 g/L（较入院 ↑ 2.1）' },
      { item: '前白蛋白', value: '平均 185 mg/L（较入院 ↑ 28）' },
      { item: '体重变化', value: '在治患者 7 日体重 ↑ 0.6 kg' },
    ],
  },
];

export interface NutritionWorkloadListResult {
  items: NutritionWorkload[];
  demo: boolean;
}

export async function fetchNutritionWorkload(): Promise<NutritionWorkloadListResult> {
  try {
    const res = await get<{ items: NutritionWorkload[] }>('/nutrition/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
