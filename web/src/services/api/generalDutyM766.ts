/**
 * 健澜科技 jlmedaios - 医院总值班管理 API（M766）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type DutyStatus = 'upcoming' | 'ongoing' | 'done';

export interface GeneralDuty {
  id: string;
  dutyDate: string;
  leader: string;
  doctor: string;
  nurse: string;
  contact: string;
  status: DutyStatus;
  records: string;
  incidents: string;
  handover: string;
}

export const DUTY_STATUS_META: Record<DutyStatus, { label: string; color: string }> = {
  upcoming: { label: '待值班', color: 'blue' },
  ongoing: { label: '值班中', color: 'processing' },
  done: { label: '已完成', color: 'green' },
};

const DEMO: GeneralDuty[] = [
  {
    id: 'GD-001',
    dutyDate: '2026-10-22',
    leader: '刘副院长',
    doctor: '普外科 陈医师',
    nurse: '护理部 王护士长',
    contact: '内线 8001 / 13800001234',
    status: 'ongoing',
    records: '夜班巡查 2 次；收急诊 12 人。',
    incidents: '22:30 病区呼叫铃故障，已联系总务科抢修。',
    handover: '明日 08:00 与白班张副院长交接。',
  },
];

export interface DutyListResult {
  items: GeneralDuty[];
  demo: boolean;
}

export async function fetchGeneralDuty(): Promise<DutyListResult> {
  try {
    const res = await get<{ items: GeneralDuty[] }>('/admin/general-duty');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
