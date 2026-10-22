/**
 * 健澜科技 jlmedaios - 神经外科管理 API（M865）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface NeurosurgeryWorkload {
  id: string;
  date: string;
  outpatient: number;
  inpatient: number;
  surgeries: number;
  tbi: number;
  cerebrovascular: number;
  status: string;
  surgeryBreakdown: { name: string; count: number }[];
  tbiRecords: string;
  vascularRecords: string;
  icuMonitoring: string;
}

const DEMO: NeurosurgeryWorkload[] = [
  {
    id: 'NS-865',
    date: '2026-10-22',
    outpatient: 120,
    inpatient: 24,
    surgeries: 12,
    tbi: 4,
    cerebrovascular: 4,
    status: '正常运行',
    surgeryBreakdown: [
      { name: '颅脑外伤手术', count: 4 },
      { name: '脑血管手术', count: 4 },
      { name: '脑肿瘤手术', count: 3 },
      { name: '功能神外（癫痫/帕金森）', count: 1 },
    ],
    tbiRecords: '颅脑外伤：硬膜外血肿清除 1 例；硬膜下血肿钻孔引流 2 例；脑内血肿清除 1 例。',
    vascularRecords: '脑血管手术：动脉瘤夹闭 2 例；AVM 切除 1 例；搭桥 1 例。',
    icuMonitoring: 'ICU 监护：GCS 平均 12.5；颅内压（ICP）监测 6 例；亚低温治疗 2 例。',
  },
];

export interface NeurosurgeryWorkloadListResult {
  items: NeurosurgeryWorkload[];
  demo: boolean;
}

export async function fetchNeurosurgeryWorkload(): Promise<NeurosurgeryWorkloadListResult> {
  try {
    const res = await get<{ items: NeurosurgeryWorkload[] }>('/neurosurgery/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
