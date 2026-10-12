/**
 * 健澜科技 jlmedaios - 护理出入量前端 API（M17-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { IoBalanceView, IoRecord, RecordIoReq } from '@/types/nursingIo';

const base = '/nursing-io';

export function listIo(visitId: string): Promise<IoRecord[]> {
  return get<IoRecord[]>(base, { visitId });
}
export function recordIo(body: RecordIoReq): Promise<IoRecord> {
  return post<IoRecord>(base, body);
}
export function getBalance(visitId: string): Promise<IoBalanceView> {
  return get<IoBalanceView>(`${base}/balance`, { visitId });
}
