/**
 * 健澜科技 jlmedaios - 互联网图文问诊类型（M3-K）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 问诊会话状态 */
export type ConsultationStatus =
  | 'pending'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'
  | 'timed_out';

/** 问诊会话 */
export interface ConsultationSessionView {
  id: string;
  sessionNo: string;
  accountId: string;
  profileId: string;
  patientId: string;
  doctorId: string | null;
  department: string;
  visitType: 'followup';
  status: ConsultationStatus;
  eligibilityPassed: boolean;
  lastVisitId: string | null;
  lastVisitAt: string | null;
  chiefComplaint: string | null;
  cancelReason: string | null;
  acceptedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 问诊消息 */
export interface ConsultationMessageView {
  id: string;
  sessionId: string;
  senderType: 'patient' | 'doctor' | 'system';
  senderId: string | null;
  msgType: 'text' | 'image' | 'system';
  content: string;
  createdAt: string;
}

/** 会话详情（含消息） */
export interface ConsultationDetailView {
  session: ConsultationSessionView;
  messages: ConsultationMessageView[];
}

/** 发起问诊请求 */
export interface StartConsultationRequest {
  profileId: string;
  doctorId: string;
  chiefComplaint?: string;
}

/** 发送消息请求 */
export interface SendMessageRequest {
  content: string;
  msgType?: 'text' | 'image';
}
