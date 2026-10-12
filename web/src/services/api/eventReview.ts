/**
 * 健澜科技 jlmedaios - 不良事件后评估前端 API（M17-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type {
  CreateReviewReq, EventReview, EventReviewMetrics, NursingRiskEvent,
} from '@/types/eventReview';

const base = '/nursing-event-reviews';

export function listReviews(visitId?: string): Promise<EventReview[]> {
  return get<EventReview[]>(base, visitId ? { visitId } : {});
}
export function listEvents(visitId?: string): Promise<NursingRiskEvent[]> {
  return get<NursingRiskEvent[]>(`${base}/events`, visitId ? { visitId } : {});
}
export function createReview(body: CreateReviewReq): Promise<EventReview> {
  return post<EventReview>(base, body);
}
export function getMetrics(): Promise<EventReviewMetrics> {
  return get<EventReviewMetrics>(`${base}/metrics`);
}
