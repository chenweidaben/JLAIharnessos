/**
 * 健澜科技 jlmedaios - DRG 分组前端类型（M3-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type DrgResultStatus = 'grouped' | 'confirmed' | 'rejected';

export interface DrgRule {
  groupCode: string;
  groupName: string;
  mdc: string;
  dxPrefixes: string[];
  requiresOrp: boolean;
  weight: string;
  avgPayment: string;
}

export interface DrgResult {
  id: string;
  visitId: string;
  department: string;
  primaryDxCode: string | null;
  hasOrp: boolean;
  groupCode: string;
  groupName: string | null;
  mdc: string | null;
  grouperVersion: string;
  weight: string;
  estimatedPayment: string;
  totalFee: string | null;
  balance: string | null;
  explanation: Record<string, unknown>;
  status: DrgResultStatus;
  groupedAt: string;
}

export interface DrgResultListItem {
  id: string;
  visitId: string;
  visitNo: string;
  patientName: string;
  department: string;
  primaryDxCode: string | null;
  groupCode: string;
  groupName: string | null;
  weight: string;
  estimatedPayment: string;
  totalFee: string | null;
  balance: string | null;
  status: DrgResultStatus;
  updatedAt: string;
}
