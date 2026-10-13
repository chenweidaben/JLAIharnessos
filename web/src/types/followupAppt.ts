/**
 * 健澜科技 jlmedaios - 复诊预约类型（M62-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export interface SlotOption {
  scheduleId: string;
  appointmentDate: string;
  department: string;
  remaining: number;
}

export interface FollowupAppt {
  id: string;
  dischargePlanId: string;
  scheduleId: string;
  appointmentDate: string;
  department: string;
  status: 'booked' | 'cancelled' | 'completed';
  bookedBy: string;
  createdAt: string;
}

export interface RecommendResult {
  options: SlotOption[];
  suggested: SlotOption | null;
}
