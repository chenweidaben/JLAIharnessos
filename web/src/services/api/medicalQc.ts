/**
 * 健澜科技 jlmedaios - 运行病历质控 API 服务（M2-B）
 *
 * 真实 BFF（src/bff/routes/medicalQc.ts），全部读写 PostgreSQL，无 mock。
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { get, post } from '../request';
import type {
  QcCheckResult,
  QcQueueItem,
  QcRecordDetail,
  QcSubmitPayload,
} from '@/types/medicalQc';

/** 待质控队列（submitted/returned/reviewed/signed）。 */
export function fetchQcQueue(): Promise<{ items: QcQueueItem[]; total: number }> {
  return get<{ items: QcQueueItem[]; total: number }>('/medical-qc/queue');
}

/** 质控详情：病历 + 就诊/患者 + 历史质控签名链 + 最新规则评估。 */
export function fetchQcRecord(id: string): Promise<QcRecordDetail> {
  return get<QcRecordDetail>(`/medical-qc/records/${id}`);
}

/** 质控检查：规则引擎 + 可选 AI 辅助（只读，不落结论）。 */
export function checkQc(id: string, useAi: boolean): Promise<QcCheckResult> {
  return post<QcCheckResult>(`/medical-qc/records/${id}/check`, { useAi });
}

/** 提交质控结论：pass 逐级推进 / return 退回，质控人签名。 */
export function submitQc(id: string, payload: QcSubmitPayload): Promise<unknown> {
  return post(`/medical-qc/records/${id}/review`, payload);
}

/** 作者整改后重新提交（returned → submitted）。 */
export function resubmitQc(id: string): Promise<unknown> {
  return post(`/medical-qc/records/${id}/resubmit`, {});
}