/**
 * 健澜科技 jlmedaios - 中医科管理 API（M776）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface TcmPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  tcmDiagnosis: string;
  syndrome: string;
  principle: string;
  status: string;
  fourExams: string;
  treatment: string;
  prescriptions: { date: string; formula: string; herbs: string }[];
  acuRecords: { date: string; therapy: string; acupoints: string }[];
}

const DEMO: TcmPatient[] = [
  {
    id: 'TC-001',
    inpatientNo: 'ZY-261104',
    patient: '孙患者',
    tcmDiagnosis: '胃脘痛',
    syndrome: '脾胃虚寒证',
    principle: '温中健脾，和胃止痛',
    status: '治疗中',
    fourExams: '面白少华，舌淡苔白，脉沉细；脘腹冷痛，喜温喜按。',
    treatment: '黄芪建中汤加减 + 艾灸中脘。',
    prescriptions: [
      { date: '2026-10-20', formula: '黄芪建中汤加减', herbs: '黄芪 15g、桂枝 10g、白芍 15g、炙甘草 6g、生姜 3 片、大枣 5 枚、饴糖 30g（烊化）' },
    ],
    acuRecords: [
      { date: '2026-10-20', therapy: '针刺 + 艾灸', acupoints: '中脘、足三里、内关、公孙' },
    ],
  },
];

export interface TcmListResult {
  items: TcmPatient[];
  demo: boolean;
}

export async function fetchTcmPatients(): Promise<TcmListResult> {
  try {
    const res = await get<{ items: TcmPatient[] }>('/clinical/tcm-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
