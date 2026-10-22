/**
 * 健澜科技 jlmedaios - 中医科管理 API（M826）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface TcmWorkload {
  id: string;
  date: string;
  outpatient: number;
  acupuncture: number;
  tuina: number;
  herbalPieces: number;
  status: string;
  therapyBreakdown: { name: string; count: number }[];
  tonguePulse: string;
  syndrome: string;
  prescriptions: string;
  outcome: string;
}

const DEMO: TcmWorkload[] = [
  {
    id: 'TC-001',
    date: '2026-10-22',
    outpatient: 120,
    acupuncture: 36,
    tuina: 22,
    herbalPieces: 68,
    status: '正常运行',
    therapyBreakdown: [
      { name: '针灸', count: 36 },
      { name: '推拿', count: 22 },
      { name: '中药饮片', count: 68 },
      { name: '艾灸/拔罐', count: 14 },
    ],
    tonguePulse: '舌象：淡红舌薄白苔 60 / 红苔黄 28 / 瘀暗舌 16；脉象：细弦 42 / 滑数 30 / 沉细 28。',
    syndrome: '气虚血瘀 28 / 肝郁气滞 24 / 脾胃虚弱 20 / 风寒湿痹 18 / 其它 30。',
    prescriptions: '天麻钩藤饮 12 剂；归脾汤 10 剂；独活寄生汤 8 剂。',
    outcome: '腰痛患者治疗 2 周后 VAS 由 7.2 降至 3.5；失眠患者 PSQI 由 14 分降至 8 分。',
  },
];

export interface TcmWorkloadListResult {
  items: TcmWorkload[];
  demo: boolean;
}

export async function fetchTcmWorkload(): Promise<TcmWorkloadListResult> {
  try {
    const res = await get<{ items: TcmWorkload[] }>('/tcm/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
