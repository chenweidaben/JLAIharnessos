/**
 * 健澜科技 jlmedaios - 放射科管理 API（M804）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface RadiologyWorkload {
  id: string;
  date: string;
  modality: string;
  studies: number;
  positive: number;
  reportSla: string;
  status: string;
  modalityBreakdown: { name: string; count: number; positive: number }[];
  positivityRate: string;
  reportTimeliness: string;
  criticalValues: { time: string; patient: string; finding: string; action: string }[];
}

const DEMO: RadiologyWorkload[] = [
  {
    id: 'RD-001',
    date: '2026-10-22',
    modality: '综合',
    studies: 320,
    positive: 168,
    reportSla: '平片 30min / CT 60min / MRI 120min',
    status: '正常运行',
    modalityBreakdown: [
      { name: 'DR 平片', count: 180, positive: 82 },
      { name: 'CT', count: 110, positive: 72 },
      { name: 'MRI', count: 30, positive: 14 },
    ],
    positivityRate: '总体阳性率 52.5%；CT 阳性率 65.5% 最高。',
    reportTimeliness: '当日已报告 318/320，及时率 99.4%；2 例超时已催办。',
    criticalValues: [
      { time: '10:25', patient: '张患者', finding: '颅内出血（CT）', action: '已电话通知神外科并回传记录' },
    ],
  },
];

export interface RadiologyWorkloadListResult {
  items: RadiologyWorkload[];
  demo: boolean;
}

export async function fetchRadiologyWorkload(): Promise<RadiologyWorkloadListResult> {
  try {
    const res = await get<{ items: RadiologyWorkload[] }>('/radiology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
