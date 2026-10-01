/**
 * 健澜科技 jlmedaios - 互联网图文问诊 API（M3-K）
 *
 * 医生 Web 工作站：待接诊队列、我的会话、接诊、回复、结束。
 * 相对路径（与 M3-J 一致），由 request 层 baseURL 拼接。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { get, post } from '../request';
import type {
  ConsultationDetailView,
  ConsultationSessionView,
  ConsultationStatus,
  SendMessageRequest,
} from '@/types/consultation';

/** 待接诊队列（可按科室） */
export function listPendingConsultations(department?: string) {
  return get<ConsultationSessionView[]>('/internet/consultation/pending', {
    department,
  });
}

/** 医生的会话列表 */
export function listDoctorConsultations(status?: ConsultationStatus) {
  return get<ConsultationSessionView[]>('/internet/consultation/doctor/sessions', {
    status,
  });
}

/** 会话详情（含消息） */
export function getConsultation(id: string) {
  return get<ConsultationDetailView>(`/internet/consultation/sessions/${id}`);
}

/** 医生接诊 */
export function acceptConsultation(id: string) {
  return post<ConsultationSessionView>(
    `/internet/consultation/sessions/${id}/accept`,
  );
}

/** 医生回复消息 */
export function sendDoctorMessage(id: string, body: SendMessageRequest) {
  return post<{ id: string; createdAt: string }>(
    `/internet/consultation/sessions/${id}/doctor-messages`,
    body,
  );
}

/** 医生结束问诊 */
export function completeConsultation(id: string) {
  return post<ConsultationSessionView>(
    `/internet/consultation/sessions/${id}/complete`,
  );
}
