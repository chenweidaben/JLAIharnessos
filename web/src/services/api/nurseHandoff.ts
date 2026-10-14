/**
 * 健澜科技 jlmedaios - 护士交接班记录前端 API（214）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { NurseHandoff, RecordHandoffReq } from '@/types/nurseHandoff';

const base = '/nurse/handoff';

export function listHandoffs(wardId?: string): Promise<NurseHandoff[]> {
  return get<NurseHandoff[]>(base, wardId ? { wardId } : {});
}

export function recordHandoff(body: RecordHandoffReq): Promise<NurseHandoff> {
  return post<NurseHandoff>(base, body);
}
