/**
 * 健澜科技 jlmedaios - 质控整改闭环看板前端 API（215）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, patch, post } from '../request';
import type {
  CreateRectificationReq, QcRectification, TransitionRectificationReq,
} from '@/types/qcRectification';

const base = '/qc/rectification';

/** 看板全量列表。 */
export function listRectifications(): Promise<QcRectification[]> {
  return get<QcRectification[]>(base);
}

/** 由质控 issue 新建整改任务（open）。 */
export function createRectification(body: CreateRectificationReq): Promise<QcRectification> {
  return post<QcRectification>(base, body);
}

/** 状态机前推一步（open→fixed→reviewed→closed）。 */
export function transitionRectification(
  id: string, body: TransitionRectificationReq,
): Promise<QcRectification> {
  return patch<QcRectification>(`${base}/${id}`, body);
}
