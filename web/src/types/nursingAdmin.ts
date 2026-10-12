/**
 * 健澜科技 jlmedaios - 护理管理后台（M16-B）类型
 *
 * 覆盖：护理排班（班次/排班表/休假/发布留痕/合规校验）+ 敏感质量指标（指标库/采集录入/预警/趋势）。
 * 与 BFF（/nursing-admin/*）DTO 一一对应，camelCase；真实模式全部读写 PostgreSQL。
 * 不包含任何 mock 视图模型；BFF/DB 不可用时由 store 显式报错，不假数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

/* ============================== 排班 ============================== */

/** 班次定义（按病区配置）。 */
export interface ShiftDef {
  id: string;
  wardCode: string;
  name: string;
  /** HH:mm */
  startTime: string;
  /** HH:mm（次日班次可跨夜，hours 显式给定时以 hours 为准）。 */
  endTime: string;
  color: string;
  isNight: boolean;
  /** 单班工时（小时）。 */
  hours: number;
}

/** 排班分配：某护士某日某班次。 */
export interface ScheduleAssignment {
  id: string;
  wardCode: string;
  nurseId: string;
  nurseName: string;
  /** YYYY-MM-DD */
  date: string;
  shiftId: string;
  shiftName: string;
  isNight: boolean;
  hours: number;
}

export type LeaveType = 'annual' | 'sick' | 'comp' | 'personal';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

/** 休假/请假登记。 */
export interface LeaveRequest {
  id: string;
  wardCode: string;
  nurseId: string;
  nurseName: string;
  startDate: string;
  endDate: string;
  type: LeaveType;
  status: LeaveStatus;
  reason?: string | null;
}

/** 发布留痕。 */
export interface SchedulePublish {
  id: string;
  wardCode: string;
  period: string;
  publishedBy: string;
  publishedAt: string;
  note?: string | null;
}

/** 合规校验问题（纯函数产出）。 */
export type ComplianceType = 'consecutive' | 'weekly_hours' | 'coverage' | 'conflict' | 'leave';
export type ComplianceLevel = 'error' | 'warning';
export interface ComplianceIssue {
  type: ComplianceType;
  level: ComplianceLevel;
  nurseName?: string;
  date?: string;
  message: string;
}

/* ============================== 敏感指标 ============================== */

export type IndicatorDirection = 'high_good' | 'low_good';
export type IndicatorSource = 'manual' | 'auto';
export type IndicatorStatus = 'draft' | 'verified' | 'reported';

/** 敏感质量指标库。 */
export interface IndicatorDef {
  code: string;
  name: string;
  numeratorDesc: string;
  denominatorDesc: string;
  unit: string;
  direction: IndicatorDirection;
  /** 上报频度：month / quarter / year。 */
  frequency: string;
  /** 数据来源：auto=已接入数据源；manual=需人工录入（未接入时显式标注，不渲染编造数字）。 */
  source: IndicatorSource;
  /** 目标值（率，0-100）；方向 high_good 越高越好，low_good 越低越好。 */
  target?: number | null;
}

/** 某指标某期采集/录入明细。 */
export interface IndicatorEntry {
  id: string;
  indicatorCode: string;
  /** 统计期，如 2026-10。 */
  period: string;
  numerator: number;
  denominator: number;
  /** 率（%），由分子/分母计算；未接入数据源时为 null，标注待人工录入。 */
  value: number | null;
  source: IndicatorSource;
  verified: boolean;
  status: IndicatorStatus;
  recordedAt: string;
  recordedBy?: string | null;
}

/* ============================== 视图 ============================== */

export interface ScheduleBoard {
  wardCode: string;
  wardName: string;
  shifts: ShiftDef[];
  assignments: ScheduleAssignment[];
  leaves: LeaveRequest[];
  publishes: SchedulePublish[];
  /** 每班次每日最少应配人数（覆盖规则）。 */
  requiredStaff: Record<string, number>;
}

export interface IndicatorLibraryView {
  indicators: IndicatorDef[];
  entries: IndicatorEntry[];
}
