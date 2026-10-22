/**
 * 健澜科技 jlmedaios - 麻醉科管理 API（M843）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface AnesthesiologyWorkload {
  id: string;
  date: string;
  general: number;
  neuraxial: number;
  nerveBlock: number;
  pacu: number;
  status: string;
  typeBreakdown: { name: string; count: number }[];
  anesthesiaRecords: string;
  complications: { time: string; patient: string; type: string; action: string }[];
  postOpPain: string;
}

const DEMO: AnesthesiologyWorkload[] = [
  {
    id: 'AN-843',
    date: '2026-10-22',
    general: 28,
    neuraxial: 12,
    nerveBlock: 6,
    pacu: 38,
    status: '正常运行',
    typeBreakdown: [
      { name: '全身麻醉', count: 28 },
      { name: '椎管内麻醉', count: 12 },
      { name: '神经阻滞', count: 6 },
      { name: '局部麻醉', count: 4 },
    ],
    anesthesiaRecords: 'ASA I 级 12 / II 级 24 / III 级 10 / IV 级 4；平均出血量 220ml；平均尿量 350ml；术中用药记录完整率 100%。',
    complications: [
      { time: '10:40', patient: '裴患者', type: '术中低血压（MAP<55）', action: '去氧肾上腺素 100μg 静推两次，回升至 70mmHg' },
    ],
    postOpPain: '术后镇痛泵 24 例（PCIA 18 / PCEA 6）；VAS<3 分 22 例；VAS≥4 分 2 例（已追加药物）。',
  },
];

export interface AnesthesiologyWorkloadListResult {
  items: AnesthesiologyWorkload[];
  demo: boolean;
}

export async function fetchAnesthesiologyWorkload(): Promise<AnesthesiologyWorkloadListResult> {
  try {
    const res = await get<{ items: AnesthesiologyWorkload[] }>('/anesthesiology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
