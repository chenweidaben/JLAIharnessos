/**
 * 健澜科技 jlmedaios - 影像报告 AI 智能解读 API 服务（M12-A）
 *
 * 真实 BFF（src/bff/routes/imagingInterpret.ts），读写 PostgreSQL，无 mock。
 * 与检验解读端点对称：generate/report/queue/sign/reject；
 * 全部相对路径（/imaging-interpret/...），禁止自带 /api/v1 前缀。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { get, post } from '../request';
import type {
  InterpretAudience,
  InterpretMode,
} from '@/types/labInterpret';
import type {
  ImagingInterpretation,
  ImagingInterpQueueItem,
} from '@/types/imagingInterpret';

/** 拼接查询串：仅在有值时附加。 */
function withQs(params: Record<string, string | undefined>): string {
  const pairs = Object.entries(params).filter(
    (kv): kv is [string, string] => kv[1] !== undefined && kv[1] !== '',
  );
  return pairs.length ? `?${pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}` : '';
}

/** 影像解读草稿队列（可按状态 / 视角过滤）。 */
export function fetchImagingInterpQueue(
  status?: string,
  audience?: InterpretAudience,
): Promise<{ items: ImagingInterpQueueItem[] }> {
  return get<{ items: ImagingInterpQueueItem[] }>(
    `/imaging-interpret/queue${withQs({ status, audience })}`,
  );
}

/** 对已发布影像报告生成解读（幂等；mode=auto 可按 LLM 三态降级）。 */
export function generateImagingInterp(
  reportId: string,
  audience?: InterpretAudience,
  mode?: InterpretMode,
): Promise<ImagingInterpretation> {
  return post<ImagingInterpretation>(
    `/imaging-interpret/generate/${reportId}${withQs({ audience })}`,
    { mode },
  );
}

/** 查看某影像报告某视角的解读草稿。 */
export function fetchImagingInterp(
  reportId: string,
  audience?: InterpretAudience,
): Promise<ImagingInterpretation> {
  return get<ImagingInterpretation>(
    `/imaging-interpret/report/${reportId}${withQs({ audience })}`,
  );
}

/** 医师签名（影像解读）。 */
export function signImagingInterp(id: string): Promise<ImagingInterpretation> {
  return post<ImagingInterpretation>(`/imaging-interpret/sign/${id}`, {});
}

/** 医师退回（影像解读）。 */
export function rejectImagingInterp(id: string, reason: string): Promise<ImagingInterpretation> {
  return post<ImagingInterpretation>(`/imaging-interpret/reject/${id}`, { reason });
}
