/**
 * 健澜科技 jlmedaios - 医保智能审核 API（M770）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type AuditResult = 'pass' | 'warning' | 'violation';

export interface SmartAudit {
  id: string;
  auditNo: string;
  patient: string;
  totalCost: number;
  violationAmount: number;
  result: AuditResult;
  rules: string[];
  details: string;
  appeals: { time: string; by: string; result: string }[];
}

export const SMART_AUDIT_RESULT_META: Record<AuditResult, { label: string; color: string }> = {
  pass: { label: "通过", color: "green" },
  warning: { label: "疑似违规", color: "orange" },
  violation: { label: "确认违规", color: "red" },
};

const DEMO: SmartAudit[] = [
  {
    id: "SA-001",
    auditNo: "AUDIT-261001",
    patient: "张患者",
    totalCost: 18500,
    violationAmount: 1200,
    result: "warning",
    rules: ["超适应症用药（R-102）", "检查检验频次超限（R-205）"],
    details: "阿奇霉素超适应症使用 3 天；CT 复查频次超出临床路径 1 次。",
    appeals: [
      { time: "2026-10-21 15:00", by: "普外科 陈医师", result: "申诉处理中" },
    ],
  },
];

export interface SmartAuditListResult {
  items: SmartAudit[];
  demo: boolean;
}

export async function fetchSmartAudits(): Promise<SmartAuditListResult> {
  try {
    const res = await get<{ items: SmartAudit[] }>("/insurance/smart-audits");
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
