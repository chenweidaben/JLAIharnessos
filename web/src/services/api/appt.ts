/**
 * 健澜科技 jlmedaios - 预约随访 API（M3-I）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { Appointment, FollowUpPlan } from '@/types/appt';

export async function listAppointments(): Promise<Appointment[]> {
  return get<Appointment[]>(`/appt/requests`);
}

export async function createAppointment(input: {
  appointmentNo: string;
  patientId: string;
  scheduledAt: string;
  department?: string;
  purpose: string;
}): Promise<{ appt: Appointment; created: boolean }> {
  return post<{ appt: Appointment; created: boolean }>(`/appt/requests`, input);
}

export async function confirmAppointment(id: string, visitId?: string): Promise<Appointment> {
  return post<Appointment>(`/appt/confirm/${id}`, { visitId });
}

export async function completeAppointment(id: string, outcome: 'completed' | 'absent'): Promise<Appointment> {
  return post<Appointment>(`/appt/complete/${id}`, { outcome });
}

export async function cancelAppointment(id: string, reason: string): Promise<Appointment> {
  return post<Appointment>(`/appt/cancel/${id}`, { reason });
}

export async function listFollowUpPlans(): Promise<FollowUpPlan[]> {
  return get<FollowUpPlan[]>(`/appt/followup-plans`);
}

export async function createFollowUpPlan(input: {
  planNo: string;
  patientId: string;
  appointmentId?: string | null;
  scheduledDate: string;
  content: string;
}): Promise<FollowUpPlan> {
  return post<FollowUpPlan>(`/appt/followup-plans`, input);
}

export async function recordFollowUp(planId: string, outcome: string, note?: string): Promise<FollowUpPlan> {
  return post<FollowUpPlan>(`/appt/followup-records/${planId}`, { outcome, note });
}
