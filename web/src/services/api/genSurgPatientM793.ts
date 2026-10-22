/**
 * 健澜科技 jlmedaios - 普外科管理 API（M793）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface GenSurgPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  surgery: string;
  surgeryDate: string;
  status: string;
  preOp: string;
  opRecord: string;
  postOp: string;
  drainage: string;
  discharge: string;
}

const DEMO: GenSurgPatient[] = [
  {
    id: 'GS-001',
    inpatientNo: 'ZY-261120',
    patient: '魏患者',
    diagnosis: '急性化脓性阑尾炎',
    surgery: '腹腔镜下阑尾切除术',
    surgeryDate: '2026-10-18',
    status: '术后第 4 天',
    preOp: 'ASA II 级；WBC 13.5，N% 88%；CT 示阑尾增粗伴周围渗出。',
    opRecord: '气腹建立顺利，阑尾充血水肿，表面脓苔；顺行切除，残端荷包缝合。手术时长 45 min，出血 20 mL。',
    postOp: '术后第 1 天排气，第 3 天流质饮食；切口 II/甲愈合。',
    drainage: '肝下引流管 1 根，术后 48h 拔除，引流量共 30 mL。',
    discharge: '门诊 1 周后拆线；术后 2 周可恢复轻体力活动。',
  },
];

export interface GenSurgListResult {
  items: GenSurgPatient[];
  demo: boolean;
}

export async function fetchGenSurgPatients(): Promise<GenSurgListResult> {
  try {
    const res = await get<{ items: GenSurgPatient[] }>('/clinical/gen-surg-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
