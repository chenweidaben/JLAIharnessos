/**
 * 健澜科技 jlmedaios - 临床路径变异分析 API（M709）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PathwayVariation {
  id: string;
  pathwayName: string;
  variantCount: number;
  totalCount: number;
  mainReason: string;
  categories: { name: string; count: number }[];
  reasonAnalysis: string;
  suggestions: string;
}

const DEMO: PathwayVariation[] = [
  {
    id: 'PV-001',
    pathwayName: '腹腔镜胆囊切除临床路径',
    variantCount: 8,
    totalCount: 50,
    mainReason: '术后住院日延长（合并基础疾病）',
    categories: [
      { name: '患者因素（合并症）', count: 5 },
      { name: '医护因素（方案调整）', count: 2 },
      { name: '系统因素（检查排队）', count: 1 },
    ],
    reasonAnalysis: '老年患者合并糖尿病、高血压，术后切口愈合延迟。',
    suggestions: '术前基础疾病评估前置；缩短术前检查等候。',
  },
];

export interface VariationListResult {
  items: PathwayVariation[];
  demo: boolean;
}

export async function fetchPathwayVariations(): Promise<VariationListResult> {
  try {
    const res = await get<{ items: PathwayVariation[] }>('/clinical-pathway/variations');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
