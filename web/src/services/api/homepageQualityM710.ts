/**
 * 健澜科技 jlmedaios - 病案首页质控 API（M710）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface HomepageQuality {
  id: string;
  inpatientNo: string;
  mainDxCode: string;
  surgeryCode: string;
  score: number;
  defects: string[];
  codingErrors: string[];
  logicConflicts: string[];
}

const DEMO: HomepageQuality[] = [
  {
    id: 'HQ-001',
    inpatientNo: 'ZY-2601',
    mainDxCode: 'K80.201',
    surgeryCode: '51.2301',
    score: 92,
    defects: ['离院方式漏填', '手术日期与出院日期逻辑矛盾'],
    codingErrors: ['主要诊断选择错误（应为 K80.2 而非 K80.3）'],
    logicConflicts: ['住院天数 12 天，但无手术记录'],
  },
  {
    id: 'HQ-002',
    inpatientNo: 'ZY-2610',
    mainDxCode: 'J18.902',
    surgeryCode: '—',
    score: 98,
    defects: [],
    codingErrors: [],
    logicConflicts: [],
  },
];

export interface HomepageListResult {
  items: HomepageQuality[];
  demo: boolean;
}

export async function fetchHomepageQuality(): Promise<HomepageListResult> {
  try {
    const res = await get<{ items: HomepageQuality[] }>('/medical-records/homepage-quality');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
