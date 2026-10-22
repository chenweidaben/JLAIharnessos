/**
 * 健澜科技 jlmedaios - 中医科管理（M856 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface TcmWorkloadM856 {
  id: string;
  date: string;
  outpatient: number;
  acupuncture: number;
  tuina: number;
  cupping: number;
  herbalPrescriptions: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  acupunctureRecords: string;
  tuinaRecords: string;
  herbalRecords: string;
  constitution: string;
}

const DEMO: TcmWorkloadM856[] = [
  {
    id: 'TCM-856',
    date: '2026-10-22',
    outpatient: 120,
    acupuncture: 42,
    tuina: 28,
    cupping: 18,
    herbalPrescriptions: 68,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '颈椎病', count: 32 },
      { name: '腰椎病', count: 28 },
      { name: '失眠', count: 18 },
      { name: '面瘫', count: 4 },
      { name: '脾胃病/其他', count: 38 },
    ],
    acupunctureRecords: '针灸记录：颈肩腰腿痛 28 例；失眠 8 例；面瘫 4 例；其他 2 例。电针 18 例。',
    tuinaRecords: '推拿记录：小儿推拿 6 例；成人保健/治疗 22 例。',
    herbalRecords: '中药处方：汤剂 52 剂；颗粒剂 16 剂；中成药 24 剂。',
    constitution: '中医体质辨识：平和质 12 例；气虚质 18 例；阳虚质 14 例；阴虚质 8 例；痰湿质 10 例；血瘀质 6 例；气郁质 8 例；特禀质 2 例。',
  },
];

export interface TcmWorkloadM856Result {
  items: TcmWorkloadM856[];
  demo: boolean;
}

export async function fetchTcmWorkloadM856(): Promise<TcmWorkloadM856Result> {
  try {
    const res = await get<{ items: TcmWorkloadM856[] }>('/tcm/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
