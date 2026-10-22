/**
 * 健澜科技 jlmedaios - 护理质量指标监测 API（M707）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type IndicatorStatus = 'met' | 'near' | 'missed';

export interface NursingIndicator {
  id: string;
  name: string;
  period: string;
  target: string;
  actual: string;
  status: IndicatorStatus;
  definition: string;
  trend: { month: string; value: number }[];
  reason: string;
}

export const INDICATOR_STATUS_META: Record<IndicatorStatus, { label: string; color: string }> = {
  met: { label: '达标', color: 'green' },
  near: { label: '接近', color: 'blue' },
  missed: { label: '未达标', color: 'red' },
};

const DEMO: NursingIndicator[] = [
  {
    id: 'NI-001',
    name: '压疮发生率',
    period: '2026-Q3',
    target: '≤0.5‰',
    actual: '0.32‰',
    status: 'met',
    definition: '住院患者新发压疮例数 / 住院总床日数 × 1000‰。',
    trend: [
      { month: '7月', value: 0.48 },
      { month: '8月', value: 0.41 },
      { month: '9月', value: 0.32 },
    ],
    reason: '—',
  },
  {
    id: 'NI-002',
    name: '跌倒发生率',
    period: '2026-Q3',
    target: '≤0.2‰',
    actual: '0.35‰',
    status: 'missed',
    definition: '住院患者跌倒例数 / 住院总床日数 × 1000‰。',
    trend: [
      { month: '7月', value: 0.22 },
      { month: '8月', value: 0.30 },
      { month: '9月', value: 0.35 },
    ],
    reason: '老年病区陪护比例下降，夜间如厕高发；建议加强陪护宣教与床旁呼叫器配置。',
  },
];

export interface IndicatorListResult {
  items: NursingIndicator[];
  demo: boolean;
}

export async function fetchNursingIndicators(): Promise<IndicatorListResult> {
  try {
    const res = await get<{ items: NursingIndicator[] }>('/quality/nursing-indicators');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
