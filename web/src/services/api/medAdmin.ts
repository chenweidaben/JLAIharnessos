/**
 * 健澜科技 jlmedaios - 给药三查七对 MAR API（M17-B）
 *
 * 真实模式直连 BFF（/medication-admin/*），全部读写 PostgreSQL。
 * 路径相对（不带 /api/v1 前缀）；不提供本地假数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';
import type {
  ExecuteMedPayload,
  ExecuteMedResultView,
  MedAdministration,
  MedErrorMetricsResponse,
} from '@/types/medAdmin';

const base = '/medication-admin';

/** 执行给药（三查七对 + 双人核对 + 本人签名）。 */
export const executeMed = (payload: ExecuteMedPayload): Promise<ExecuteMedResultView> =>
  post(`${base}/execute`, payload);

/** 给药记录列表（可按 visitId/orderId/status/errorType 过滤）。 */
export const listMedAdmins = (params: {
  visitId?: string;
  orderId?: string;
  status?: string;
  errorType?: string;
}): Promise<MedAdministration[]> => get(`${base}`, params);

/** 单条给药记录。 */
export const getMedAdmin = (id: string): Promise<MedAdministration> => get(`${base}/${id}`);

/** NQI_MED_ERROR 给药差错率。 */
export const getMedErrorMetrics = (): Promise<MedErrorMetricsResponse> => get(`${base}/metrics`);
