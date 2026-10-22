/**
 * 健澜科技 jlmedaios - 病案首页 v2 API（M671，配套 M567）
 *
 * 对接 BFF：GET /api/v1/medical-records/homepages
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface MedicalHomepage {
  id: string;
  inpatientNo: string;
  patientId: string;
  admissionDate: string;
  dischargeDate: string;
  primaryDiagnosis: string;
  secondaryDiagnoses: string[];
  surgeryProcedures: string[];
  pathologyDiagnosis: string;
  totalCost: number;
  selfPay: number;
  insurancePay: number;
}

const DEMO_HOMEPAGES: MedicalHomepage[] = [
  {
    id: 'MH-001',
    inpatientNo: 'ZY-2601',
    patientId: 'P10002',
    admissionDate: '2026-10-15',
    dischargeDate: '2026-10-22',
    primaryDiagnosis: '急性阑尾炎',
    secondaryDiagnoses: ['2 型糖尿病'],
    surgeryProcedures: ['腹腔镜阑尾切除术 (ICD-9-CM: 47.01)'],
    pathologyDiagnosis: '急性化脓性阑尾炎',
    totalCost: 12800,
    selfPay: 3200,
    insurancePay: 9600,
  },
  {
    id: 'MH-002',
    inpatientNo: 'ZY-2602',
    patientId: 'P10005',
    admissionDate: '2026-10-10',
    dischargeDate: '2026-10-20',
    primaryDiagnosis: '冠状动脉粥样硬化性心脏病',
    secondaryDiagnoses: ['高血压 3 级（很高危）', '2 型糖尿病'],
    surgeryProcedures: ['经皮冠状动脉支架植入术 (36.06)'],
    pathologyDiagnosis: '',
    totalCost: 58600,
    selfPay: 14200,
    insurancePay: 44400,
  },
];

export interface HomepageListResult {
  items: MedicalHomepage[];
  totalCount: number;
  demo: boolean;
}

export async function fetchMedicalHomepages(): Promise<HomepageListResult> {
  try {
    const res = await get<{ items: MedicalHomepage[]; totalCount: number }>('/medical-records/homepages');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_HOMEPAGES, totalCount: DEMO_HOMEPAGES.length, demo: true };
  }
}
