/**
 * 健澜科技 jlmedaios - 患者 360 视图 v2 API（M630，P0 合规）
 *
 * 对接 BFF：GET /api/v1/patients/:id/summary
 *   （聚合基本信息 + 近期就诊 + 检验 + 用药；未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PatientSummary {
  basic: {
    patientId: string;
    name: string;
    gender: string;
    age: number;
    bloodType: string;
    phone: string;
  };
  recentVisits: Array<{ visitId: string; date: string; deptName: string; diagnosis: string }>;
  medications: Array<{ drugName: string; dosage: string; startDate: string }>;
  labs: Array<{ itemName: string; value: string; refRange: string; abnormal: 'high' | 'low' | 'normal' }>;
}

const DEMO_SUMMARY: PatientSummary = {
  basic: { patientId: 'P10001', name: '张某某', gender: '男', age: 58, bloodType: 'A', phone: '138****1234' },
  recentVisits: [
    { visitId: 'V-2601', date: '2026-10-20', deptName: '心内科', diagnosis: '高血压 3 级（极高危）' },
    { visitId: 'V-2588', date: '2026-09-12', deptName: '心内科', diagnosis: '2 型糖尿病' },
    { visitId: 'V-2540', date: '2026-07-05', deptName: '全科', diagnosis: '健康体检' },
  ],
  medications: [
    { drugName: '苯磺酸氨氯地平片', dosage: '5mg qd', startDate: '2026-10-15' },
    { drugName: '阿司匹林肠溶片', dosage: '100mg qd', startDate: '2026-10-15' },
    { drugName: '阿托伐他汀钙片', dosage: '20mg qn', startDate: '2026-10-15' },
  ],
  labs: [
    { itemName: '血钾', value: '4.2', refRange: '3.5–5.5', abnormal: 'normal' },
    { itemName: '糖化血红蛋白', value: '7.1%', refRange: '<6.5%', abnormal: 'high' },
    { itemName: '低密度脂蛋白', value: '3.4', refRange: '<3.4', abnormal: 'high' },
  ],
};

export async function fetchPatientSummary(patientId: string): Promise<PatientSummary & { demo: boolean }> {
  try {
    const res = await get<PatientSummary>('/patients/summary', { patientId });
    return { ...res, demo: false };
  } catch {
    return { ...DEMO_SUMMARY, demo: true };
  }
}
