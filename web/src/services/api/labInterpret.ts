/**
 * 健澜科技 jlmedaios - 检查检验结果 AI 智能解读 API 服务（M3-E → M12-A）
 *
 * 真实 BFF（src/bff/routes/labInterpret.ts），读写 PostgreSQL，无 mock。
 * M12-A：叠加 audience（医生/患者视角）与 mode（自动/仅规则/强制 LLM）参数；
 *        全部相对路径，由 baseURL 统一拼接，禁止自带 /api/v1 前缀。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { get, post } from '../request';
import type {
  InterpretAudience,
  InterpretMode,
  LabInterpretation,
  LabInterpQueueItem,
} from '@/types/labInterpret';

/** 拼接查询串：仅在有值时附加，避免出现空 ?audience= 噪音。 */
function withQs(params: Record<string, string | undefined>): string {
  const pairs = Object.entries(params).filter(
    (kv): kv is [string, string] => kv[1] !== undefined && kv[1] !== '',
  );
  return pairs.length ? `?${pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}` : '';
}

/** 解读草稿队列（可按状态 / 视角过滤）。 */
export function fetchLabInterpQueue(
  status?: string,
  audience?: InterpretAudience,
): Promise<{ items: LabInterpQueueItem[] }> {
  return get<{ items: LabInterpQueueItem[] }>(
    `/lab-interpret/queue${withQs({ status, audience })}`,
  );
}

/** 对就诊重新生成解读草稿（幂等；mode=auto 可按 LLM 三态降级）。 */
export function generateLabInterp(
  visitId: string,
  audience?: InterpretAudience,
  mode?: InterpretMode,
): Promise<LabInterpretation> {
  return post<LabInterpretation>(
    `/lab-interpret/generate/${visitId}${withQs({ audience })}`,
    { mode },
  );
}

/** 查看某就诊某视角的解读草稿。 */
export function fetchLabInterp(
  visitId: string,
  audience?: InterpretAudience,
): Promise<LabInterpretation> {
  return get<LabInterpretation>(`/lab-interpret/visit/${visitId}${withQs({ audience })}`);
}

/** 医师签名。 */
export function signLabInterp(id: string): Promise<LabInterpretation> {
  return post<LabInterpretation>(`/lab-interpret/sign/${id}`, {});
}

/** 医师退回。 */
export function rejectLabInterp(id: string, reason: string): Promise<LabInterpretation> {
  return post<LabInterpretation>(`/lab-interpret/reject/${id}`, { reason });
}
