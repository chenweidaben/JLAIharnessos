/**
 * 健澜科技 jlmedaios - 输血科管理 API（M834）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface TransfusionWorkload {
  id: string;
  date: string;
  redCells: number;
  plasma: number;
  platelets: number;
  autologous: number;
  status: string;
  bloodTypeDistribution: { type: string; units: number }[];
  crossmatchRecords: { patient: string; bloodType: string; result: string }[];
  reactions: { time: string; patient: string; type: string; action: string }[];
  discards: { item: string; units: number; reason: string }[];
  indicationReview: string;
}

const DEMO: TransfusionWorkload[] = [
  {
    id: 'TF-001',
    date: '2026-10-22',
    redCells: 48,
    plasma: 24,
    platelets: 12,
    autologous: 4,
    status: '正常运行',
    bloodTypeDistribution: [
      { type: 'A 型', units: 18 },
      { type: 'B 型', units: 14 },
      { type: 'O 型', units: 22 },
      { type: 'AB 型', units: 6 },
    ],
    crossmatchRecords: [
      { patient: '姜患者', bloodType: 'A Rh+', result: '交叉配血相合' },
    ],
    reactions: [
      { time: '14:20', patient: '戚患者', type: '非溶血性发热反应', action: '减慢输注 + 地塞米松 5mg 静推，缓解' },
    ],
    discards: [
      { item: '悬红细胞', units: 2, reason: '过期未用' },
    ],
    indicationReview: '输血指征审核 88 例；合理输血 86 例；不合理 2 例（已反馈临床）。',
  },
];

export interface TransfusionWorkloadListResult {
  items: TransfusionWorkload[];
  demo: boolean;
}

export async function fetchTransfusionWorkload(): Promise<TransfusionWorkloadListResult> {
  try {
    const res = await get<{ items: TransfusionWorkload[] }>('/transfusion/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
