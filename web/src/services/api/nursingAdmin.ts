/**
 * 健澜科技 jlmedaios - 护理管理后台 API（M16-B）
 *
 * 真实模式直连 BFF（/nursing-admin/*），全部读写 PostgreSQL。
 * 路径一律相对（不带 /api/v1 前缀）；不提供任何本地假数据。
 * BFF/数据库不可用时由 request 层显式抛错，健康门禁在 store/页面统一处理。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post, del } from '../request';
import type {
  IndicatorEntry,
  IndicatorLibraryView,
  LeaveRequest,
  LeaveType,
  ScheduleAssignment,
  ScheduleBoard,
  ShiftDef,
} from '@/types/nursingAdmin';

const base = '/nursing-admin';

/* ------------------------------ 排班 ------------------------------ */

/** 排班看板：班次定义 + 排班 + 休假 + 发布留痕（按病区/周）。 */
export const getScheduleBoard = (wardCode: string, weekStart: string): Promise<ScheduleBoard> =>
  get(`${base}/schedule/board`, { wardCode, weekStart });

/** 新增/更新班次定义。 */
export const upsertShift = (payload: Partial<ShiftDef>): Promise<ShiftDef> =>
  post(`${base}/shifts`, payload);

/** 排班（分配护士某日某班次）。 */
export const assignShift = (payload: Partial<ScheduleAssignment>): Promise<ScheduleAssignment> =>
  post(`${base}/assignments`, payload);

/** 取消某条排班。 */
export const removeAssignment = (id: string): Promise<{ id: string }> =>
  del(`${base}/assignments/${id}`);

/** 休假登记。 */
export const createLeave = (
  payload: { wardCode: string; nurseId: string; nurseName: string; startDate: string; endDate: string; type: LeaveType; reason?: string },
): Promise<LeaveRequest> => post(`${base}/leaves`, payload);

/** 发布排班（护士长确认，留痕）。 */
export const publishSchedule = (
  payload: { wardCode: string; period: string; note?: string },
): Promise<{ id: string }> => post(`${base}/schedule/publish`, payload);

/* ------------------------------ 敏感指标 ------------------------------ */

/** 指标库 + 明细。 */
export const getIndicatorLibrary = (): Promise<IndicatorLibraryView> => get(`${base}/indicators`);

/** 人工录入指标明细（须人工核实后上报）。 */
export const submitIndicatorEntry = (
  payload: { indicatorCode: string; period: string; numerator: number; denominator: number; note?: string },
): Promise<IndicatorEntry> => post(`${base}/indicator-entries`, payload);

/** 核实并上报（护士长/护理部确认）。 */
export const verifyIndicatorEntry = (id: string): Promise<IndicatorEntry> =>
  post(`${base}/indicator-entries/${id}/verify`, {});
