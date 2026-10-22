/**
 * 健澜科技 jlmedaios - 妇产科管理 API（M781）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface ObgynPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  gestationalWeek: string;
  parity: string;
  status: string;
  prenatalVisits: { date: string; ga: string; note: string }[];
  ctg: string;
  delivery: string;
  postpartum: string;
}

const DEMO: ObgynPatient[] = [
  {
    id: 'OB-001',
    inpatientNo: 'ZY-261108',
    patient: '冯患者',
    diagnosis: 'G1P0 孕 39 周 LOA，待产',
    gestationalWeek: '39 周',
    parity: 'G1P0',
    status: '待产',
    prenatalVisits: [
      { date: '2026-08-20', ga: '28 周', note: 'OGTT 正常，血压 110/70' },
      { date: '2026-10-15', ga: '38 周', note: '胎心监护反应型' },
    ],
    ctg: 'NST 反应型，基线 140 bpm，变异良好。',
    delivery: '预计 2026-10-25 临产，目前宫口未开。',
    postpartum: '产后 42 天复查 B 超 + 盆底评估。',
  },
];

export interface ObgynListResult {
  items: ObgynPatient[];
  demo: boolean;
}

export async function fetchObgynPatients(): Promise<ObgynListResult> {
  try {
    const res = await get<{ items: ObgynPatient[] }>('/clinical/obgyn-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
