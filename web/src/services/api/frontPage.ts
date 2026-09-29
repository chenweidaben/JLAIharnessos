/**
 * 健澜科技 jlmedaios - 病案首页 API 服务（M3-A）
 *
 * 真实 BFF（src/bff/routes/frontPage.ts），全部读写 PostgreSQL，无 mock。
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { get, post } from '../request';
import type {
  FrontPageDetail,
  FrontPageQueueItem,
  ReviewPayload,
  SaveCodingPayload,
} from '@/types/frontPage';

/** 待处理队列（draft 待编码 / coding 待质控 / qc 待归档）。 */
export function fetchFrontPageQueue(): Promise<{ items: FrontPageQueueItem[]; total: number }> {
  return get<{ items: FrontPageQueueItem[]; total: number }>('/front-pages/queue');
}

/** 病案首页详情：快照 + 就诊/患者 + 质控签名链。 */
export function fetchFrontPage(id: string): Promise<FrontPageDetail> {
  return get<FrontPageDetail>(`/front-pages/${id}`);
}

/** 编码员保存 ICD 编码（draft/coding → coding）。 */
export function saveCoding(id: string, payload: SaveCodingPayload): Promise<unknown> {
  return post(`/front-pages/${id}/coding`, payload);
}

/** 第二人质控结论：pass → qc / return → coding（退回原因必填）。 */
export function submitReview(id: string, payload: ReviewPayload): Promise<unknown> {
  return post(`/front-pages/${id}/review`, payload);
}

/** 归档（qc → archived）。 */
export function archiveFrontPage(id: string, version: number): Promise<unknown> {
  return post(`/front-pages/${id}/archive`, { version });
}
