/**
 * 健澜科技 jlmedaios - 住院药房摆药管理 API（M714）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface InpatientDispensing {
  id: string;
  bedNo: string;
  patientId: string;
  drugName: string;
  dose: string;
  route: string;
  frequency: string;
  preparedBy: string;
  verifiedBy: string;
  preparedAt: string | null;
}

const DEMO: InpatientDispensing[] = [
  {
    id: 'ID-001',
    bedNo: '01-03',
    patientId: 'P10005',
    drugName: '头孢呋辛 1.5g',
    dose: '1.5g',
    route: '静脉滴注',
    frequency: 'q8h',
    preparedBy: '药师周',
    verifiedBy: '药师陈',
    preparedAt: '2026-10-22T07:30:00+08:00',
  },
  {
    id: 'ID-002',
    bedNo: '02-05',
    patientId: 'P10011',
    drugName: '泮托拉唑 40mg',
    dose: '40mg',
    route: '静脉推注',
    frequency: 'qd',
    preparedBy: '—',
    verifiedBy: '—',
    preparedAt: null,
  },
];

export interface DispensingListResult {
  items: InpatientDispensing[];
  demo: boolean;
}

export async function fetchInpatientPrescriptions(): Promise<DispensingListResult> {
  try {
    const res = await get<{ items: InpatientDispensing[] }>('/pharmacy/inpatient-prescriptions');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
