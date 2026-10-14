/**
 * 健澜科技 jlmedaios - 临床路径变异管理 API（213）
 *
 * 真实模式直连 BFF（baseURL 已含 /api/v1，此处路径不再重复前缀）。
 * 本服务不提供任何本地假数据；BFF/数据库不可用时由 request 层显式抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';

/** 变异类型：positive 正向 / negative 负向 / neutral 一般 */
export type VarianceType = 'positive' | 'negative' | 'neutral';

export interface PathwayVarianceItem {
  id: string;
  pathwayId: string | null;
  visitId: string;
  reason: string;
  varianceType: VarianceType | string;
  recordedAt: string;
}

export interface PathwayVarianceListResult {
  records: PathwayVarianceItem[];
  /** 变异率（0~1） */
  varianceRate: number;
  /** 变异例数（分子） */
  variedCount: number;
  /** 总入径例数（分母） */
  enrolledCount: number;
}

export interface CreatePathwayVarianceInput {
  visitId: string;
  reason: string;
  varianceType: VarianceType;
  pathwayId?: string | null;
}

/** 变异原因列表 + 变异率统计（visitId 可选：不传为全院口径） */
export function listPathwayVariance(visitId?: string): Promise<PathwayVarianceListResult> {
  return get<PathwayVarianceListResult>('/pathway/variance', visitId ? { visitId } : {});
}

/** 登记一条就诊级变异 */
export function createPathwayVariance(
  input: CreatePathwayVarianceInput,
): Promise<PathwayVarianceItem> {
  return post<PathwayVarianceItem>('/pathway/variance', input);
}
