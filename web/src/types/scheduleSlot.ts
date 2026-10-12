/**
 * 健澜科技 jlmedaios - 号源排班前端类型（M19-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface SlotItem {
  id: string;
  scheduleId: string;
  slotStart: string;
  slotEnd: string;
  totalQuota: number;
  bookedCount: number;
  status: 'open' | 'closed';
  remaining: number;
  available: boolean;
}
