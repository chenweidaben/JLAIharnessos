/**
 * 健澜科技 jlmedaios - 三级公立医院绩效考核 API（M762）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface NationalPerfIndicator {
  id: string;
  code: string;
  name: string;
  category: string;
  target: string;
  actual: string;
  score: number;
  definition: string;
  source: string;
  benchmark: string;
}

const DEMO: NationalPerfIndicator[] = [
  {
    id: 'NP-001',
    code: 'FY-01',
    name: '医疗服务收入（不含药品、耗材、检查检验收入）占医疗收入比例',
    category: '费用结构',
    target: '≥ 35%',
    actual: '38.2%',
    score: 95,
    definition: '反映医院收入结构优化程度。',
    source: '财务系统 2026 H1 报表。',
    benchmark: '全国三级医院均值 32%，本院高于均值 6.2pp。',
  },
];

export interface NationalPerfListResult {
  items: NationalPerfIndicator[];
  demo: boolean;
}

export async function fetchNationalPerformance(): Promise<NationalPerfListResult> {
  try {
    const res = await get<{ items: NationalPerfIndicator[] }>('/accreditation/national-performance');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
