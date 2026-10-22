/**
 * 健澜科技 jlmedaios - 医嘱执行单 API（M694）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type MedStatus = 'pending' | 'executed' | 'missed' | 'cancelled';

export interface MedAdministration {
  id: string;
  orderNo: string;
  patientId: string;
  drugName: string;
  dose: string;
  route: string;
  scheduledAt: string;
  executedAt: string | null;
  executedBy: string;
  skinTestResult: string;
  status: MedStatus;
}

export const MED_STATUS_META: Record<MedStatus, { label: string; color: string }> = {
  pending: { label: '待执行', color: 'orange' },
  executed: { label: '已执行', color: 'green' },
  missed: { label: '漏执行', color: 'red' },
  cancelled: { label: '已撤销', color: 'default' },
};

const DEMO: MedAdministration[] = [
  {
    id: 'MED-001',
    orderNo: 'ORD-001',
    patientId: 'P10001',
    drugName: '头孢哌酮舒巴坦 3.0g',
    dose: '3.0g',
    route: '静脉滴注',
    scheduledAt: '2026-10-22T10:00:00+08:00',
    executedAt: '2026-10-22T10:05:00+08:00',
    executedBy: '周敏',
    skinTestResult: '阴性',
    status: 'executed',
  },
  {
    id: 'MED-002',
    orderNo: 'ORD-002',
    patientId: 'P10002',
    drugName: '氨溴索 30mg',
    dose: '30mg',
    route: '静脉推注',
    scheduledAt: '2026-10-22T10:00:00+08:00',
    executedAt: null,
    executedBy: '',
    skinTestResult: '—',
    status: 'pending',
  },
  {
    id: 'MED-003',
    orderNo: 'ORD-003',
    patientId: 'P10005',
    drugName: '低分子肝素 4000IU',
    dose: '4000IU',
    route: '皮下注射',
    scheduledAt: '2026-10-22T08:00:00+08:00',
    executedAt: '2026-10-22T08:10:00+08:00',
    executedBy: '李慧',
    skinTestResult: '—',
    status: 'executed',
  },
];

export interface MedListResult {
  items: MedAdministration[];
  demo: boolean;
}

export async function fetchMedAdministrations(): Promise<MedListResult> {
  try {
    const res = await get<{ items: MedAdministration[] }>('/nurse/med-administrations');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
