/**
 * 健澜科技 jlmedaios - 感染科管理 API（M791）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface IdPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  site: string;
  pathogen: string;
  status: string;
  culture: string;
  susceptibility: string;
  regimen: string;
  efficacy: string;
  isolation: string;
}

const DEMO: IdPatient[] = [
  {
    id: 'ID-001',
    inpatientNo: 'ZY-261118',
    patient: '秦患者',
    diagnosis: '社区获得性肺炎（重症）',
    site: '肺部',
    pathogen: '肺炎链球菌（青霉素敏感）',
    status: '治疗中',
    culture: '痰培养：肺炎链球菌生长（+）。',
    susceptibility: '青霉素 MIC ≤0.06 μg/mL（敏感）；头孢曲松敏感；左氧氟沙星敏感。',
    regimen: '头孢曲松 2g qd 静滴 + 阿奇霉素 0.5g qd，已用 5 天。',
    efficacy: '体温由 39.2℃ 降至 37.2℃，CRP 由 180 降至 65 mg/L。',
    isolation: '飞沫隔离，单间病房，医护佩戴医用外科口罩。',
  },
];

export interface IdListResult {
  items: IdPatient[];
  demo: boolean;
}

export async function fetchIdPatients(): Promise<IdListResult> {
  try {
    const res = await get<{ items: IdPatient[] }>('/clinical/id-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
