/**
 * 健澜科技 jlmedaios - 合同管理 API（M906）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface ContractWorkload {
  id: string;
  date: string;
  newlySigned: number;
  inExecution: number;
  expiring: number;
  totalAmount: number;
  disputes: number;
  status: string;
  categoryBreakdown: { name: string; count: number }[];
  amountDistribution: string;
  executionProgress: string;
  expiryReminder: string;
  disputeHandling: string;
  approvalFlow: string;
}

const DEMO: ContractWorkload[] = [
  {
    id: 'CT-906',
    date: '2026-10-22',
    newlySigned: 4,
    inExecution: 180,
    expiring: 12,
    totalAmount: 4200,
    disputes: 1,
    status: '正常运行',
    categoryBreakdown: [
      { name: '采购合同', count: 90 },
      { name: '服务合同', count: 50 },
      { name: '工程合同', count: 20 },
      { name: '合作合同', count: 20 },
    ],
    amountDistribution: '合同金额分布：50 万以下 120 份；50-200 万 40 份；200-500 万 15 份；500 万以上 5 份。',
    executionProgress: '合同履行进度：在履行合同 180 份；按计划执行 168 份；延期 8 份（供应商原因 5/医院原因 3）；提前完成 4 份。',
    expiryReminder: '合同到期提醒：30 天内到期 12 份（耗材 6/服务 4/工程 2）；已启动续签评审 8 份。',
    disputeHandling: '合同纠纷处理：今日在处理纠纷 1 起（设备供货延期）；已发律师函；诉讼 0 起。',
    approvalFlow: '合同审批流程：今日新签 4 份（科室发起→法务审核→分管院长→院长→盖章）；平均审批时长 3.5 天。',
  },
];

export interface ContractWorkloadListResult {
  items: ContractWorkload[];
  demo: boolean;
}

export async function fetchContractWorkload(): Promise<ContractWorkloadListResult> {
  try {
    const res = await get<{ items: ContractWorkload[] }>('/contract/management/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
