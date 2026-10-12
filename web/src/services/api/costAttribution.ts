/**
 * 健澜科技 jlmedaios - 成本归因 API（M22-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';
import type { AttributionResult } from '@/types/costAttribution';

export function attribution(visitId: string, groupCode: string) {
  return get<AttributionResult>(`/drg-attribution?visitId=${encodeURIComponent(visitId)}&groupCode=${encodeURIComponent(groupCode)}`);
}
