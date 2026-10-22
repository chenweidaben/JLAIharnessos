/**
 * 健澜科技 jlmedaios - 院感暴发预警 v2 API（M633，配套 M606）
 *
 * 对接 BFF：GET /api/v1/infection/outbreak-alerts
 *   （真实后端：5 条预警含 2 已核实 + 1 暴发确认 + 监测趋势 7 天）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type AlertLevel = 'confirmed' | 'suspected' | 'monitoring';

export interface OutbreakAlert {
  id: string;
  deptCode: string;
  deptName: string;
  pathogen: string;
  casesCount: number;
  level: AlertLevel;
  detectedAt: string;
  confirmedAt: string | null;
  note: string;
}

export interface OutbreakTrendPoint {
  date: string;
  casesCount: number;
}

export interface OutbreakAlertBundle {
  alerts: OutbreakAlert[];
  trend: OutbreakTrendPoint[];
}

const DEMO_BUNDLE: OutbreakAlertBundle = {
  alerts: [
    { id: 'OB-001', deptCode: 'ICU', deptName: 'ICU', pathogen: 'CR-AB', casesCount: 3, level: 'confirmed', detectedAt: '2026-10-18T09:00:00+08:00', confirmedAt: '2026-10-19T10:00:00+08:00', note: 'ICU 连续 3 例 CR-AB，已启动暴发响应。' },
    { id: 'OB-002', deptCode: 'WARD-A', deptName: '呼吸一科', pathogen: '流感嗜血杆菌', casesCount: 2, level: 'confirmed', detectedAt: '2026-10-19T09:00:00+08:00', confirmedAt: '2026-10-20T09:30:00+08:00', note: '同病房 2 例，加强空气消毒。' },
    { id: 'OB-003', deptCode: 'WARD-B', deptName: '儿科', pathogen: '诺如病毒', casesCount: 4, level: 'suspected', detectedAt: '2026-10-21T08:00:00+08:00', confirmedAt: null, note: '呕吐聚集事件，待流行病学核实。' },
    { id: 'OB-004', deptCode: 'ENDOSCOPY', deptName: '内镜中心', pathogen: '幽门螺杆菌', casesCount: 2, level: 'monitoring', detectedAt: '2026-10-20T14:00:00+08:00', confirmedAt: null, note: '常规监测，未见聚集。' },
    { id: 'OB-005', deptCode: 'DIALYSIS', deptName: '血透室', pathogen: 'HBV', casesCount: 1, level: 'monitoring', detectedAt: '2026-10-22T07:00:00+08:00', confirmedAt: null, note: '单例，按常规处置。' },
  ],
  trend: [
    { date: '2026-10-16', casesCount: 1 },
    { date: '2026-10-17', casesCount: 1 },
    { date: '2026-10-18', casesCount: 3 },
    { date: '2026-10-19', casesCount: 4 },
    { date: '2026-10-20', casesCount: 3 },
    { date: '2026-10-21', casesCount: 5 },
    { date: '2026-10-22', casesCount: 2 },
  ],
};

export const ALERT_LEVEL_META: Record<AlertLevel, { label: string; color: string }> = {
  confirmed: { label: '暴发确认', color: 'red' },
  suspected: { label: '疑似暴发', color: 'orange' },
  monitoring: { label: '常规监测', color: 'blue' },
};

export async function fetchOutbreakAlerts(): Promise<OutbreakAlertBundle & { demo: boolean }> {
  try {
    const res = await get<OutbreakAlertBundle>('/infection/outbreak-alerts');
    return { ...res, demo: false };
  } catch {
    return { ...DEMO_BUNDLE, demo: true };
  }
}
