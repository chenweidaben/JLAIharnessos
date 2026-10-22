/**
 * 健澜科技 jlmedaios - 医保管理 API（M904）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface InsuranceWorkload {
  id: string;
  date: string;
  discharges: number;
  income: number;
  selfPayRatio: number;
  drgPayment: number;
  rejection: number;
  status: string;
  typeBreakdown: { name: string; count: number }[];
  drgResult: string;
  rejectionReasons: string;
  selfPayAnalysis: string;
  policyExecution: string;
  settlementRecords: string;
}

const DEMO: InsuranceWorkload[] = [
  {
    id: 'INS-904',
    date: '2026-10-22',
    discharges: 180,
    income: 380,
    selfPayRatio: 18.5,
    drgPayment: 320,
    rejection: 8,
    status: '正常运行',
    typeBreakdown: [
      { name: '职工医保', count: 108 },
      { name: '居民医保', count: 48 },
      { name: '异地医保', count: 18 },
      { name: '商保', count: 6 },
    ],
    drgResult: 'DRG 付费结果：今日 DRG 结算 180 例；医保基金应付 320 万；超支 12 万（心内科某组）；结余 8 万（骨科某组）。',
    rejectionReasons: '医保拒付原因：今日拒付 8 万；过度诊疗 4 万；指征不符 2 万；病历缺陷 2 万。',
    selfPayAnalysis: '自费比例分析：今日自费比例 18.5%；超支主要来自新材料使用（关节假体自费 6 万）。',
    policyExecution: '医保政策执行：国家医保目录（2026 版）已切换；DRG 3.0 分组器运行正常；处方前置审核通过率 94%。',
    settlementRecords: '医保结算记录：今日出院医保结算 180 例；实时结算率 100%；异地直接结算 18 例。',
  },
];

export interface InsuranceWorkloadListResult {
  items: InsuranceWorkload[];
  demo: boolean;
}

export async function fetchInsuranceWorkload(): Promise<InsuranceWorkloadListResult> {
  try {
    const res = await get<{ items: InsuranceWorkload[] }>('/insurance/management/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
