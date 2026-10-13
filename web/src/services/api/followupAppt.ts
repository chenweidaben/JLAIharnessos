/**
 * 健澜科技 jlmedaios - 复诊预约 API（M62-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { FollowupAppt, RecommendResult } from '@/types/followupAppt';

const base = '/followup-appointments';

export function recommendFollowup(planId: string) {
  return get<RecommendResult>(`${base}/recommend/${planId}`);
}
export function bookFollowupAppt(planId: string, input: { scheduleId: string; appointmentDate: string; department: string }) {
  return post<FollowupAppt>(`${base}/${planId}/book`, input);
}
export function listFollowupAppt(visitId: string) {
  return get<FollowupAppt[]>(`${base}`, { visitId });
}
export function cancelFollowupAppt(id: string) {
  return post<FollowupAppt>(`${base}/${id}/cancel`, {});
}
