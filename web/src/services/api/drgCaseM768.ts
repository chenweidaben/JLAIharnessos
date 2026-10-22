/**
 * 健澜科技 jlmedaios - DRG 分组管理 API（M768）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface DrgCase {
  id: string;
  inpatientNo: string;
  patient: string;
  mainDiagnosis: string;
  drgGroup: string;
  weight: number;
  cost: number;
  profit: number;
  diagnoses: string[];
  procedures: string[];
  groupingProcess: string;
  costBreakdown: { item: string; amount: number }[];
}

const DEMO: DrgCase[] = [
  {
    id: 'DR-001',
    inpatientNo: 'ZY-261001',
    patient: '张患者',
    mainDiagnosis: '胆囊结石伴慢性胆囊炎',
    drgGroup: 'GB25（胆囊切除，伴合并症）',
    weight: 1.25,
    cost: 18500,
    profit: 1200,
    diagnoses: ['胆囊结石伴慢性胆囊炎', '高血压 2 级'],
    procedures: ['腹腔镜下胆囊切除术'],
    groupingProcess: 'MDC 入组 GB → ADRG GB2 → 伴合并症 → GB25。',
    costBreakdown: [
      { item: '药品费', amount: 4500 },
      { item: '耗材费', amount: 3800 },
      { item: '治疗费', amount: 6200 },
      { item: '床位费', amount: 1500 },
    ],
  },
];

export interface DrgListResult {
  items: DrgCase[];
  demo: boolean;
}

export async function fetchDrgCases(): Promise<DrgListResult> {
  try {
    const res = await get<{ items: DrgCase[] }>('/insurance/drg-cases');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
