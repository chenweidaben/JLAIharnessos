/**
 * 健澜科技 jlmedaios - 缺陷整改闭环 API 服务（M9-B）
 *
 * 真实 BFF（src/bff/routes/rectification.ts），全部读写 PostgreSQL，无 mock。
 * 后端返回带 join 的展示视图，本服务映射为前端 RectificationTask 结构。
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { get, post } from '../request';
import type {
  DefectLevel,
  DefectType,
  RectificationTask,
  RectifyStatus,
} from '@/types/quality';

/** 后端返回的整改任务展示视图（字段对应 RectificationTaskView）。 */
interface RectificationView {
  id: string;
  recordId: string;
  visitId: string | null;
  defectRuleId: string;
  defectSection: string | null;
  defectMessage: string;
  defectType: DefectType;
  defectLevel: DefectLevel;
  deduction: number;
  assigneeId: string;
  createdById: string;
  status: RectifyStatus;
  rectifyContent: string | null;
  rectifyNote: string | null;
  rectifiedAt: string | null;
  reviewResult: 'approved' | 'rejected' | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  mrn: string | null;
  patientName: string | null;
  visitNo: string | null;
  dept: string | null;
  assigneeName: string | null;
  createdByName: string | null;
}

/** 后端视图 → 前端 RectificationTask。 */
function mapTask(v: RectificationView): RectificationTask {
  return {
    taskId: v.id,
    recordNo: v.visitNo ?? v.mrn ?? v.recordId.slice(0, 8),
    patientName: v.patientName ?? '未知',
    dept: v.dept ?? '',
    doctor: v.assigneeName ?? '',
    defectDesc: v.defectMessage,
    defectType: v.defectType,
    deduction: v.deduction,
    qualityDoctor: v.createdByName ?? '',
    deadline: v.deadline ?? '',
    status: v.status,
    rectifyContent: v.rectifyContent ?? undefined,
    rectifyNote: v.rectifyNote ?? undefined,
    rectifyTime: v.rectifiedAt ?? undefined,
    reviewResult: v.reviewResult ?? undefined,
    reviewNote: v.reviewNote ?? undefined,
  };
}

export interface IssueRectificationPayload {
  recordId: string;
  defectRuleId: string;
  defectMessage: string;
  defectType: DefectType;
  defectLevel: DefectLevel;
  defectSection?: string | null;
  deduction?: number;
  assigneeId?: string | null;
  deadline?: Date | null;
}

/** 整改任务列表（质控人看全部，责任医生看自己）。 */
export async function fetchRectificationTasks(params?: {
  status?: RectifyStatus;
  assigneeId?: string;
  overdue?: boolean;
}): Promise<RectificationTask[]> {
  const list = await get<RectificationView[]>('/rectifications', params);
  return list.map(mapTask);
}

/** 整改任务统计。 */
export function fetchRectificationStats(): Promise<{
  total: number;
  pending: number;
  inProgress: number;
  rectified: number;
  reviewed: number;
  overdue: number;
  completionRate: number;
}> {
  return get('/rectifications/stats');
}

/** 质控人下发整改任务。 */
export function issueRectification(
  payload: IssueRectificationPayload,
): Promise<unknown> {
  return post('/rectifications', payload);
}

/** 责任医生提交整改。 */
export function submitRectify(
  taskId: string,
  content: string,
  note: string,
): Promise<unknown> {
  return post(`/rectifications/${taskId}/rectify`, { content, note });
}

/** 质控人复核整改（通过 / 驳回）。 */
export function reviewRectify(
  taskId: string,
  result: 'approved' | 'rejected',
  note: string,
): Promise<unknown> {
  return post(`/rectifications/${taskId}/review`, { result, note });
}
