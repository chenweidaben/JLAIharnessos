/**
 * 健澜科技 jlmedaios - 心电生理检查管理 API（M837）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface CardiologyDiagnosticWorkload {
  id: string;
  date: string;
  ecg: number;
  holter: number;
  abpm: number;
  treadmill: number;
  status: string;
  typeBreakdown: { name: string; count: number; abnormal: number }[];
  ecgDiagnosis: string;
  holterResult: string;
  criticalReports: { time: string; patient: string; finding: string; action: string }[];
}

const DEMO: CardiologyDiagnosticWorkload[] = [
  {
    id: 'CD-001',
    date: '2026-10-22',
    ecg: 120,
    holter: 40,
    abpm: 24,
    treadmill: 18,
    status: '正常运行',
    typeBreakdown: [
      { name: '常规心电图', count: 120, abnormal: 42 },
      { name: '动态心电图（Holter）', count: 40, abnormal: 22 },
      { name: '动态血压（ABPM）', count: 24, abnormal: 14 },
      { name: '运动平板', count: 18, abnormal: 8 },
    ],
    ecgDiagnosis: '窦性心动过速 12 例；心房颤动 8 例；ST-T 改变 18 例；室性早搏 6 例。',
    holterResult: '24h 早搏总数：室早平均 3200 次/24h；房早平均 800 次/24h；房颤负荷 12%（2 例）。',
    criticalReports: [
      { time: '09:50', patient: '姚患者', finding: '急性广泛前壁 ST 段抬高型心梗图形', action: '立即电话通知心内科并启动 STEMI 绿色通道' },
    ],
  },
];

export interface CardiologyDiagnosticWorkloadListResult {
  items: CardiologyDiagnosticWorkload[];
  demo: boolean;
}

export async function fetchCardiologyDiagnosticWorkload(): Promise<CardiologyDiagnosticWorkloadListResult> {
  try {
    const res = await get<{ items: CardiologyDiagnosticWorkload[] }>('/cardiology-diagnostic/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
