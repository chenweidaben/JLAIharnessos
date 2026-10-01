/**
 * 健澜科技 jlmedaios - 互联网电子处方 API 服务（M3-L）
 *
 * 全部走真实 BFF 请求（相对路径），绝不内置假数据。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { get, post } from '@/api/client';
import type {
  EPrescriptionView,
  PrescribeInput,
} from '../../types/internetPrescription';

/** 会话内开方（医生，本人签名） */
export function createEPrescription(input: PrescribeInput): Promise<EPrescriptionView> {
  return post<EPrescriptionView>('/internet/prescription/create', input);
}

/** 退回后修改并重提（医生本人） */
export function resubmitEPrescription(
  prescriptionId: string,
  items: PrescribeInput['items'],
): Promise<EPrescriptionView> {
  return post<EPrescriptionView>('/internet/prescription/resubmit', { prescriptionId, items });
}

/** 取消处方（医生本人） */
export function cancelEPrescription(prescriptionId: string): Promise<EPrescriptionView> {
  return post<EPrescriptionView>('/internet/prescription/cancel', { prescriptionId });
}

/** 会话内处方列表（医生） */
export function listSessionPrescriptions(sessionId: string): Promise<EPrescriptionView[]> {
  return get<EPrescriptionView[]>('/internet/prescription/by-session', { sessionId });
}

/** 审方队列（药师） */
export function listAuditQueue(params?: {
  status?: string;
  prescriberId?: string;
}): Promise<EPrescriptionView[]> {
  return get<EPrescriptionView[]>('/internet/prescription/audit-queue', params);
}

/** 审方动作（药师）：approved / rejected / returned */
export function reviewEPrescription(
  prescriptionId: string,
  decision: 'approved' | 'rejected' | 'returned',
  auditComment?: string,
): Promise<EPrescriptionView> {
  return post<EPrescriptionView>('/internet/prescription/review', {
    prescriptionId,
    decision,
    auditComment,
  });
}
