/**
 * 健澜科技 jlmedaios - 麻醉科管理 API（M813）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface AnesthesiaWorkload {
  id: string;
  date: string;
  surgeries: number;
  general: number;
  neuraxial: number;
  local: number;
  status: string;
  modeBreakdown: { name: string; count: number }[];
  anesthesiologists: string;
  intraopEvents: { time: string; patient: string; event: string; action: string }[];
  pacu: string;
  analgesia: string;
}

const DEMO: AnesthesiaWorkload[] = [
  {
    id: 'AN-001',
    date: '2026-10-22',
    surgeries: 32,
    general: 20,
    neuraxial: 8,
    local: 4,
    status: '正常运行',
    modeBreakdown: [
      { name: '全麻（气管插管/喉罩）', count: 20 },
      { name: '椎管内麻醉（腰硬联合）', count: 8 },
      { name: '局麻/神经阻滞', count: 4 },
    ],
    anesthesiologists: '在岗麻醉医师 12 人；一线 6 人 / 二线 4 人 / 三线 2 人。',
    intraopEvents: [
      { time: '10:40', patient: '何患者', event: '术中血压下降（SBP 75 mmHg）', action: '加快补液 + 去氧肾上腺素 50μg 静推，3min 后回升' },
    ],
    pacu: '本日 PACU 接收 30 例；平均停留 35min；取消全麻 1 例（苏醒延迟）。',
    analgesia: '术后镇痛泵配置 18 例；患者满意度 4.6/5。',
  },
];

export interface AnesthesiaWorkloadListResult {
  items: AnesthesiaWorkload[];
  demo: boolean;
}

export async function fetchAnesthesiaWorkload(): Promise<AnesthesiaWorkloadListResult> {
  try {
    const res = await get<{ items: AnesthesiaWorkload[] }>('/anesthesia/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
