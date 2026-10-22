/**
 * 健澜科技 jlmedaios - 心血管内科管理 API（M858）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface CardiologyWorkload {
  id: string;
  date: string;
  outpatient: number;
  inpatient: number;
  interventional: number;
  ccuBeds: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  interventionalRecords: string;
  ccuMonitoring: string;
  cardiacRehab: string;
}

const DEMO: CardiologyWorkload[] = [
  {
    id: 'CAR-858',
    date: '2026-10-22',
    outpatient: 240,
    inpatient: 38,
    interventional: 8,
    ccuBeds: 6,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '高血压病', count: 98 },
      { name: '冠心病（心绞痛/心梗）', count: 62 },
      { name: '心力衰竭', count: 28 },
      { name: '心律失常（房颤/早搏）', count: 32 },
      { name: '其他', count: 20 },
    ],
    interventionalRecords: '介入手术：PCI 6 例（左前降支 3/回旋支 2/右冠 1）；永久起搏器植入 1 例（SSI）；射频消融 1 例（阵发性室上速）。',
    ccuMonitoring: 'CCU 监护：在床 6/6；血管活性药物 4 例；IABP 1 例；无创血流动力学监测（EV1000）3 例。',
    cardiacRehab: '心脏康复：PCI 术后早期康复 6 例；运动处方评估 4 例；6 分钟步行试验 8 例。',
  },
];

export interface CardiologyWorkloadListResult {
  items: CardiologyWorkload[];
  demo: boolean;
}

export async function fetchCardiologyWorkload(): Promise<CardiologyWorkloadListResult> {
  try {
    const res = await get<{ items: CardiologyWorkload[] }>('/cardiology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
