/**
 * 健澜科技 jlmedaios - 放射科管理（M839 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface RadiologyWorkloadM839 {
  id: string;
  date: string;
  ct: number;
  mr: number;
  dr: number;
  interventional: number;
  status: string;
  typeBreakdown: { name: string; count: number; positive: number }[];
  reportTimeliness: string;
  positivity: string;
  contrastReactions: { time: string; patient: string; reaction: string; action: string }[];
  imageQuality: string;
}

const DEMO: RadiologyWorkloadM839[] = [
  {
    id: 'RD-839',
    date: '2026-10-22',
    ct: 110,
    mr: 30,
    dr: 180,
    interventional: 6,
    status: '正常运行',
    typeBreakdown: [
      { name: 'CT', count: 110, positive: 72 },
      { name: 'MR', count: 30, positive: 14 },
      { name: 'DR 平片', count: 180, positive: 82 },
      { name: '介入', count: 6, positive: 6 },
    ],
    reportTimeliness: 'CT 60min 及时率 99.1%；MR 120min 及时率 98.5%；DR 30min 及时率 99.4%。',
    positivity: '总体阳性率 52.5%；CT 65.5%、MR 46.7%、DR 45.6%。',
    contrastReactions: [
      { time: '11:20', patient: '毛患者', reaction: '轻度碘过敏（皮疹）', action: '静推地塞米松 5mg，观察 30min 缓解' },
    ],
    imageQuality: '随机抽查 30 例图像：甲级 28 / 乙级 2 / 丙级 0。',
  },
];

export interface RadiologyWorkloadM839Result {
  items: RadiologyWorkloadM839[];
  demo: boolean;
}

export async function fetchRadiologyWorkloadM839(): Promise<RadiologyWorkloadM839Result> {
  try {
    const res = await get<{ items: RadiologyWorkloadM839[] }>('/radiology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
