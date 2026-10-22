/**
 * 健澜科技 jlmedaios - 妇科管理（M849 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface GynecologyWorkloadM849 {
  id: string;
  date: string;
  outpatient: number;
  surgeries: number;
  hysteroscopy: number;
  laparoscopy: number;
  status: string;
  surgeryBreakdown: { name: string; count: number }[];
  oncology: string;
  endocrine: string;
  minimallyInvasive: string;
}

const DEMO: GynecologyWorkloadM849[] = [
  {
    id: 'GY-849',
    date: '2026-10-22',
    outpatient: 180,
    surgeries: 14,
    hysteroscopy: 4,
    laparoscopy: 8,
    status: '正常运行',
    surgeryBreakdown: [
      { name: '腹腔镜下子宫肌瘤剔除', count: 4 },
      { name: '腹腔镜下卵巢囊肿剥除', count: 4 },
      { name: '宫腔镜下内膜息肉切除', count: 4 },
      { name: '开腹/阴式', count: 2 },
    ],
    oncology: '妇科肿瘤记录：宫颈癌前病变（CIN III）2 例（LEEP）；子宫肌瘤 6 例；卵巢囊肿 4 例。',
    endocrine: '内分泌疾病管理：异常子宫出血 12 例；PCOS 8 例；围绝经期综合征 14 例。',
    minimallyInvasive: '微创手术占比 12/14 = 85.7%；术中平均出血 60ml；平均住院日 3.2 天。',
  },
];

export interface GynecologyWorkloadM849Result {
  items: GynecologyWorkloadM849[];
  demo: boolean;
}

export async function fetchGynecologyWorkloadM849(): Promise<GynecologyWorkloadM849Result> {
  try {
    const res = await get<{ items: GynecologyWorkloadM849[] }>('/gynecology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
