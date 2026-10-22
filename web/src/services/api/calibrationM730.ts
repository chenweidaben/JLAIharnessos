/**
 * 健澜科技 jlmedaios - 设备计量检定管理 API（M730）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type CalibStatus = 'passed' | 'failed' | 'pending' | 'expired';

export interface CalibrationRecord {
  id: string;
  equipName: string;
  calibratedAt: string;
  agency: string;
  validUntil: string;
  status: CalibStatus;
  certificateNo: string;
  result: string;
  handling: string;
}

export const CALIB_STATUS_META: Record<CalibStatus, { label: string; color: string }> = {
  passed: { label: '合格', color: 'green' },
  failed: { label: '不合格', color: 'red' },
  pending: { label: '待检定', color: 'orange' },
  expired: { label: '已过期', color: 'volcano' },
};

const DEMO: CalibrationRecord[] = [
  {
    id: 'CA-001',
    equipName: '多参数监护仪（ICU-01）',
    calibratedAt: '2026-03-15',
    agency: '浙江省计量科学研究院',
    validUntil: '2027-03-14',
    status: 'passed',
    certificateNo: 'JL-2026-0315-001',
    result: '所有参数示值误差在允许范围内。',
    handling: '—',
  },
  {
    id: 'CA-002',
    equipName: '电子天平（药库）',
    calibratedAt: '2026-09-10',
    agency: '杭州市计量测试院',
    validUntil: '2026-12-09',
    status: 'expired',
    certificateNo: 'JL-2025-0910-018',
    result: '上次检定合格；本次已过期 12 天。',
    handling: '立即停用，安排下周期检定。',
  },
];

export interface CalibListResult {
  items: CalibrationRecord[];
  demo: boolean;
}

export async function fetchCalibrations(): Promise<CalibListResult> {
  try {
    const res = await get<{ items: CalibrationRecord[] }>('/equipment/calibration');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
