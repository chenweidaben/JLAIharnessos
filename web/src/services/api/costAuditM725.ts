/**
 * 健澜科技 jlmedaios - 医保费用审核 API（M725）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type AuditStatus = 'pending' | 'auditing' | 'passed' | 'rejected';

export interface CostAudit {
  id: string;
  auditNo: string;
  patientId: string;
  totalFee: number;
  violationAmount: number;
  status: AuditStatus;
  violations: string[];
  opinion: string;
  rectification: string;
}

export const AUDIT_STATUS_META: Record<AuditStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'orange' },
  auditing: { label: '审核中', color: 'processing' },
  passed: { label: '审核通过', color: 'green' },
  rejected: { label: '拒付', color: 'red' },
};

const DEMO: CostAudit[] = [
  {
    id: 'CA-001',
    auditNo: 'AUDIT-261001',
    patientId: 'P10005',
    totalFee: 28500,
    violationAmount: 3200,
    status: 'rejected',
    violations: ['超疗程使用辅助用药（参麦注射液）', '一次性卫生材料超限价', '未按指征使用抗肿瘤药物'],
    opinion: '存在不合理用药与超限价收费，违规金额 3200 元。',
    rectification: '违规部分予以拒付；科室组织合理用药培训。',
  },
  {
    id: 'CA-002',
    auditNo: 'AUDIT-261002',
    patientId: 'P10008',
    totalFee: 8800,
    violationAmount: 0,
    status: 'passed',
    violations: [],
    opinion: '费用合理，符合医保政策。',
    rectification: '—',
  },
];

export interface AuditListResult {
  items: CostAudit[];
  demo: boolean;
}

export async function fetchCostAudits(): Promise<AuditListResult> {
  try {
    const res = await get<{ items: CostAudit[] }>('/insurance/cost-audits');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
