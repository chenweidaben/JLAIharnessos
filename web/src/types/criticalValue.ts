/**
 * 健澜科技 jlmedaios - 危急值闭环前端类型（M3-F）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type CriticalStatus = 'raised' | 'acked' | 'resolved';

export interface CriticalAlertItem {
  id: string;
  visitId: string;
  visitNo: string;
  patientName: string;
  department: string;
  itemName: string;
  value: string | null;
  unit: string | null;
  flag: string | null;
  status: CriticalStatus;
  raisedAt: string;
}
