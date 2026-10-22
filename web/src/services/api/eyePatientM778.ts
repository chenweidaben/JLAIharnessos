/**
 * 健澜科技 jlmedaios - 眼科管理 API（M778）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type EyeSide = 'OD' | 'OS' | 'OU';

export const EYE_SIDE_META: Record<EyeSide, { label: string }> = {
  OD: { label: '右眼 (OD)' },
  OS: { label: '左眼 (OS)' },
  OU: { label: '双眼 (OU)' },
};

export interface EyePatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  side: EyeSide;
  visualAcuity: string;
  treatment: string;
  status: string;
  acuity: string;
  iop: string;
  slitLamp: string;
  fundus: string;
  surgeryRecords: { date: string; name: string; outcome: string }[];
}

const DEMO: EyePatient[] = [
  {
    id: 'EY-001',
    inpatientNo: 'ZY-261106',
    patient: '吴患者',
    diagnosis: '年龄相关性白内障（右眼）',
    side: 'OD',
    visualAcuity: 'OD 0.3 / OS 0.8',
    treatment: '右眼白内障超声乳化 + 人工晶体植入',
    status: '术后',
    acuity: '裸眼 OD 0.3 / OS 0.8；矫正 OD 0.5 / OS 1.0。',
    iop: 'OD 14 mmHg / OS 15 mmHg。',
    slitLamp: '右眼晶状体核 III 级混浊；前房清。',
    fundus: '右眼眼底窥不清；左眼视盘边界清，黄斑中心凹反光可见。',
    surgeryRecords: [
      { date: '2026-10-18', name: '右眼 phaco + IOL 植入', outcome: '术后第一天 OD 0.6' },
    ],
  },
];

export interface EyeListResult {
  items: EyePatient[];
  demo: boolean;
}

export async function fetchEyePatients(): Promise<EyeListResult> {
  try {
    const res = await get<{ items: EyePatient[] }>('/clinical/eye-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
