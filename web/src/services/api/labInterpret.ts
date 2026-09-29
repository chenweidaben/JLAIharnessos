/**
 * 健澜科技 jlmedaios - 检验 AI 辅助解读 API 服务（M3-E）
 *
 * 真实 BFF（src/bff/routes/labInterpret.ts），读写 PostgreSQL，无 mock。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { get, post } from '../request';
import type { LabInterpretation, LabInterpQueueItem } from '@/types/labInterpret';

/** 解读草稿队列（可按状态过滤）。 */
export function fetchLabInterpQueue(status?: string): Promise<{ items: LabInterpQueueItem[] }> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return get<{ items: LabInterpQueueItem[] }>(`/lab-interpret/queue${qs}`);
}

/** 对就诊重新生成解读草稿（幂等）。 */
export function generateLabInterp(visitId: string): Promise<LabInterpretation> {
  return post<LabInterpretation>(`/lab-interpret/generate/${visitId}`, {});
}

/** 查看某就诊解读草稿。 */
export function fetchLabInterp(visitId: string): Promise<LabInterpretation> {
  return get<LabInterpretation>(`/lab-interpret/visit/${visitId}`);
}

/** 医师签名。 */
export function signLabInterp(id: string): Promise<LabInterpretation> {
  return post<LabInterpretation>(`/lab-interpret/sign/${id}`, {});
}

/** 医师退回。 */
export function rejectLabInterp(id: string, reason: string): Promise<LabInterpretation> {
  return post<LabInterpretation>(`/lab-interpret/reject/${id}`, { reason });
}
