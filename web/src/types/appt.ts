/**
 * 健澜科技 jlmedaios - 预约随访类型（M3-I）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export type ApptStatus = 'scheduled' | 'confirmed' | 'completed' | 'absent' | 'cancelled';

export interface Appointment {
  id: string;
  appointmentNo: string;
  patientId: string;
  visitId: string | null;
  scheduledAt: string;
  department: string;
  purpose: string;
  status: ApptStatus;
  createdAt: string;
}

export interface FollowUpPlan {
  id: string;
  planNo: string;
  patientId: string;
  scheduledDate: string;
  content: string;
  status: 'pending' | 'completed' | 'missed';
  createdAt: string;
}
