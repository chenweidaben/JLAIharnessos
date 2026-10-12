/**
 * 健澜科技 jlmedaios - 护士站四合一屏前端 API（M18-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';
import type { WardRow } from '@/types/nurseStation';

const base = '/nurse-station';

export function wardBoard() {
  return get<{ items: WardRow[] }>(`${base}/ward`);
}
export function visitWorkbench(visitId: string) {
  return get<Record<string, unknown>>(`${base}/visit/${visitId}`);
}
