/**
 * 健澜科技 jlmedaios - 小儿外科管理 API（M801）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PedSurgPatient {
  id: string;
  inpatientNo: string;
  child: string;
  ageMonth: number;
  diagnosis: string;
  opApproach: string;
  status: string;
  preOp: string;
  opRecord: string;
  anesthesia: string;
  postOp: string;
  followup: string;
}

const DEMO: PedSurgPatient[] = [
  {
    id: 'PS-001',
    inpatientNo: 'ZY-261127',
    child: '陈患儿',
    ageMonth: 18,
    diagnosis: '右侧腹股沟斜疝（嵌顿已复位）',
    opApproach: '腹腔镜下右侧疝囊高位结扎术',
    status: '术后第 2 天',
    preOp: '体重 11.5 kg；Hb 118 g/L；心肺听诊无异常。',
    opRecord: '脐部 5mm 观察孔 + 右下腹 3mm 操作孔；疝囊高位结扎，未置引流。',
    anesthesia: '气管插管全麻，术中生命体征平稳；苏醒评分 10 分。',
    postOp: '术后 6h 进奶；切口干燥无渗出；已下床活动。',
    followup: '术后 1 周门诊复查切口；3 月复查有无复发。',
  },
];

export interface PedSurgListResult {
  items: PedSurgPatient[];
  demo: boolean;
}

export async function fetchPedSurgPatients(): Promise<PedSurgListResult> {
  try {
    const res = await get<{ items: PedSurgPatient[] }>('/clinical/ped-surg-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
