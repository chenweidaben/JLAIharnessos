/**
 * 健澜科技 jlmedaios - 药品不良反应监测 API（M715）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type AdrGrade = 'mild' | 'moderate' | 'severe';
export type AdrStatus = 'reported' | 'assessing' | 'evaluated';

export interface AdrReport {
  id: string;
  reportNo: string;
  patientId: string;
  suspectedDrug: string;
  reaction: string;
  grade: AdrGrade;
  status: AdrStatus;
  process: string;
  handling: string;
  causality: string;
}

export const ADR_GRADE_META: Record<AdrGrade, { label: string; color: string }> = {
  mild: { label: '轻度', color: 'blue' },
  moderate: { label: '中度', color: 'orange' },
  severe: { label: '重度', color: 'red' },
};

export const ADR_STATUS_META: Record<AdrStatus, { label: string; color: string }> = {
  reported: { label: '已上报', color: 'orange' },
  assessing: { label: '评价中', color: 'processing' },
  evaluated: { label: '已评价', color: 'green' },
};

const DEMO: AdrReport[] = [
  {
    id: 'ADR-001',
    reportNo: 'ADR-261001',
    patientId: 'P10005',
    suspectedDrug: '头孢呋辛',
    reaction: '皮疹伴瘙痒',
    grade: 'mild',
    status: 'evaluated',
    process: '用药 2 天后躯干出现散在红色斑丘疹，伴瘙痒；停药并予西替利嗪后缓解。',
    handling: '停药；西替利嗪 10mg qn；监测皮疹变化。',
    causality: '可能有关（Naranjo 评分 5 分）。',
  },
  {
    id: 'ADR-002',
    reportNo: 'ADR-261002',
    patientId: 'P10011',
    suspectedDrug: '万古霉素',
    reaction: '急性肾损伤（肌酐升高 2 倍）',
    grade: 'severe',
    status: 'assessing',
    process: '用药 7 天后血肌酐由 80 μmol/L 升至 180 μmol/L；合并使用呋塞米。',
    handling: '停用万古霉素；调整替考拉宁；水化支持。',
    causality: '待评价。',
  },
];

export interface AdrListResult {
  items: AdrReport[];
  demo: boolean;
}

export async function fetchAdrs(): Promise<AdrListResult> {
  try {
    const res = await get<{ items: AdrReport[] }>('/pharmacy/adrs');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
