/**
 * 健澜科技 jlmedaios - 神经内科管理 API（M861）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface NeurologyWorkload {
  id: string;
  date: string;
  outpatient: number;
  inpatient: number;
  strokeCenter: number;
  eeg: number;
  emg: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  strokeRecords: string;
  eegEmgRecords: string;
  neuroRehab: string;
}

const DEMO: NeurologyWorkload[] = [
  {
    id: 'NEU-861',
    date: '2026-10-22',
    outpatient: 180,
    inpatient: 30,
    strokeCenter: 10,
    eeg: 12,
    emg: 8,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '脑梗死', count: 48 },
      { name: 'TIA（短暂性脑缺血）', count: 18 },
      { name: '癫痫', count: 22 },
      { name: '帕金森病', count: 16 },
      { name: '其他（头痛/周围神经病）', count: 76 },
    ],
    strokeRecords: '卒中中心：静脉溶栓 6 例（DNT 平均 38min，达标率 100%）；动脉取栓 4 例（基底动脉 1/大脑中动脉 3）。',
    eegEmgRecords: '脑电图 12 例（癫痫样放电 6 例）；肌电图 8 例（周围神经病 4/肌病 2/重症肌无力 2）。',
    neuroRehab: '神经康复：卒中早期床旁康复 12 例；吞咽康复 6 例；肢体功能训练 8 例。',
  },
];

export interface NeurologyWorkloadListResult {
  items: NeurologyWorkload[];
  demo: boolean;
}

export async function fetchNeurologyWorkload(): Promise<NeurologyWorkloadListResult> {
  try {
    const res = await get<{ items: NeurologyWorkload[] }>('/neurology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
