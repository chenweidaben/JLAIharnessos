/**
 * 健澜科技 jlmedaios - 医保基金监管 API（M771）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type FundCaseStatus = 'checking' | 'finding' | 'decided' | 'rectified';

export interface FundCase {
  id: string;
  caseNo: string;
  type: string;
  amount: number;
  status: FundCaseStatus;
  process: string;
  findings: string;
  decision: string;
  rectification: string;
}

export const FUND_CASE_STATUS_META: Record<FundCaseStatus, { label: string; color: string }> = {
  checking: { label: '检查中', color: 'blue' },
  finding: { label: '问题核实中', color: 'orange' },
  decided: { label: '已处理决定', color: 'volcano' },
  rectified: { label: '已整改', color: 'green' },
};

const DEMO: FundCase[] = [
  {
    id: "FC-001",
    caseNo: "FC-261001",
    type: "串换药品",
    amount: 25000,
    status: "decided",
    process: "医保局飞行检查发现门诊某类药品串换。",
    findings: "串换药品 3 个品规，涉及金额 ¥25,000。",
    decision: "追回违规金额 2 倍，约谈科主任。",
    rectification: "已完成追回，科室组织合规培训。",
  },
];

export interface FundCaseListResult {
  items: FundCase[];
  demo: boolean;
}

export async function fetchFundCases(): Promise<FundCaseListResult> {
  try {
    const res = await get<{ items: FundCase[] }>('/insurance/fund-cases');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
