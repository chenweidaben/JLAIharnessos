/**
 * 健澜科技 jlmedaios - 智慧服务评级 API（M759）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type RatingPass = 'met' | 'partial' | 'missed';

export interface SmartServiceIndicator {
  id: string;
  code: string;
  name: string;
  targetLevel: string;
  score: number;
  pass: RatingPass;
  description: string;
  evidence: string;
  suggestion: string;
}

export const RATING_PASS_META: Record<RatingPass, { label: string; color: string }> = {
  met: { label: '已达标', color: 'green' },
  partial: { label: '部分达标', color: 'orange' },
  missed: { label: '未达标', color: 'red' },
};

const DEMO: SmartServiceIndicator[] = [
  {
    id: 'SS-001',
    code: '3.1.1',
    name: '智能预约服务',
    targetLevel: '四级',
    score: 85,
    pass: 'partial',
    description: '支持全渠道预约、分时段精准到 15 分钟。',
    evidence: '门诊/微信/支付宝/自助机四渠道已上线。',
    suggestion: '补齐诊间预约、出院复诊自动推送。',
  },
];

export interface RatingListResult {
  items: SmartServiceIndicator[];
  demo: boolean;
}

export async function fetchSmartServiceRating(): Promise<RatingListResult> {
  try {
    const res = await get<{ items: SmartServiceIndicator[] }>('/accreditation/smart-service-rating');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
