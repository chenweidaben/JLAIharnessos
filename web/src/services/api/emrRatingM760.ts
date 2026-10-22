/**
 * 健澜科技 jlmedaios - 电子病历评级 API（M760）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type EmrPass = 'met' | 'partial' | 'missed';

export interface EmrIndicator {
  id: string;
  code: string;
  name: string;
  targetLevel: string;
  score: number;
  pass: EmrPass;
  description: string;
  features: string;
  application: string;
}

export const EMR_PASS_META: Record<EmrPass, { label: string; color: string }> = {
  met: { label: '已达标', color: 'green' },
  partial: { label: '部分达标', color: 'orange' },
  missed: { label: '未达标', color: 'red' },
};

const DEMO: EmrIndicator[] = [
  {
    id: 'ER-001',
    code: 'EMR-5.1',
    name: '结构化电子病历',
    targetLevel: '五级',
    score: 90,
    pass: 'met',
    description: '病历全结构化、术语标准化、CDSS 内嵌。',
    features: 'EMR 编辑器、模板库、术语字典、CDSS 弹窗。',
    application: '住院病历结构化率 98%，CDSS 干预日均 3000+ 次。',
  },
];

export interface EmrListResult {
  items: EmrIndicator[];
  demo: boolean;
}

export async function fetchEmrRating(): Promise<EmrListResult> {
  try {
    const res = await get<{ items: EmrIndicator[] }>('/accreditation/emr-rating');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
