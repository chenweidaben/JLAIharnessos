/**
 * 健澜科技 jlmedaios - 护理管理后台纯函数引擎（M16-B）
 *
 * 与后端 src/medical-tools/nursing/nursingAdmin.ts 严格同口径：纯函数、确定性、无 I/O、可单测。
 * 覆盖：排班合规（连班/周工时/单班覆盖/冲突/休假联动）与敏感指标（分母校验/方向/四分位/趋势）。
 *
 * 医疗安全：本模块只产出"规则建议与校验"，最终排班发布/指标上报须护士长/护理部显式确认；
 * AI 不自动确认、不自动上报。未接入数据源的指标不得渲染编造数字（由调用方显式标注"待人工录入"）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import type {
  ComplianceIssue,
  IndicatorDirection,
  LeaveRequest,
  ScheduleAssignment,
} from '@/types/nursingAdmin';

/* ---------------------------------------------------------------------------
 * 基础工具
 * ------------------------------------------------------------------------ */

/** HH:mm → 分钟。 */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => Number(x));
  return h * 60 + (m || 0);
}

/** YYYY-MM-DD → 次日字符串（UTC 日期运算，避免本地时区回退一天）。 */
export function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** 周工时上限：48h/周（分钟）。 */
export const WEEKLY_HOURS_LIMIT_MIN = 48 * 60;

/* ---------------------------------------------------------------------------
 * 排班合规校验
 * ------------------------------------------------------------------------ */

/** 连班限制：护士当日排夜班，次日不应再排班次（休息不足）。 */
export function checkConsecutiveShifts(assignments: ScheduleAssignment[]): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const byNurse = new Map<string, ScheduleAssignment[]>();
  for (const a of assignments) {
    const list = byNurse.get(a.nurseId) ?? [];
    list.push(a);
    byNurse.set(a.nurseId, list);
  }
  for (const [nurseId, list] of byNurse) {
    const sorted = [...list].sort((x, y) => x.date.localeCompare(y.date));
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const cur = sorted[i];
      const nxt = sorted[i + 1];
      if (cur.isNight && nxt.date === nextDay(cur.date)) {
        issues.push({
          type: 'consecutive',
          level: 'warning',
          nurseName: cur.nurseName,
          date: nxt.date,
          message: `${cur.nurseName} ${cur.date} 夜班后次日（${nxt.date}）继续排班，休息时间不足`,
        });
      }
    }
    void nurseId;
  }
  return issues;
}

/** 周工时：某护士在 [weekStart, weekStart+6] 内累计工时（分钟）。 */
export function weeklyWorkMinutes(
  assignments: ScheduleAssignment[],
  nurseId: string,
  weekStart: string,
): number {
  let total = 0;
  for (const a of assignments) {
    if (a.nurseId !== nurseId) continue;
    if (withinWeek(a.date, weekStart)) {
      total += (a.hours || 0) * 60;
    }
  }
  return total;
}

function withinWeek(date: string, weekStart: string): boolean {
  const toDays = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d) / 86400000;
  };
  const diff = toDays(date) - toDays(weekStart);
  return diff >= 0 && diff <= 6;
}

/** 周工时超限：返回每位超限护士的问题。 */
export function checkWeeklyHours(assignments: ScheduleAssignment[], weekStart: string): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const nurses = new Map<string, string>();
  for (const a of assignments) nurses.set(a.nurseId, a.nurseName);
  for (const [nurseId, nurseName] of nurses) {
    const mins = weeklyWorkMinutes(assignments, nurseId, weekStart);
    if (mins > WEEKLY_HOURS_LIMIT_MIN) {
      issues.push({
        type: 'weekly_hours',
        level: 'warning',
        nurseName,
        message: `${nurseName} 本周累计工时 ${(mins / 60).toFixed(1)}h，超过 ${WEEKLY_HOURS_LIMIT_MIN / 60}h 上限`,
      });
    }
  }
  return issues;
}

/** 单班覆盖：每个班次每日实配人数 < 应配人数 → 覆盖缺口。 */
export function checkCoverage(
  assignments: ScheduleAssignment[],
  requiredStaff: Record<string, number>,
  dates: string[],
): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  // key: date|shiftName
  const count = new Map<string, number>();
  for (const a of assignments) {
    const k = `${a.date}|${a.shiftName}`;
    count.set(k, (count.get(k) ?? 0) + 1);
  }
  for (const date of dates) {
    for (const [shiftName, req] of Object.entries(requiredStaff)) {
      const actual = count.get(`${date}|${shiftName}`) ?? 0;
      if (actual < req) {
        issues.push({
          type: 'coverage',
          level: 'error',
          date,
          message: `${date} ${shiftName} 应配 ${req} 人，实配 ${actual} 人，覆盖不足`,
        });
      }
    }
  }
  return issues;
}

/** 冲突：同一护士同一日被排 ≥2 个班次（不可能同时上岗）。 */
export function detectConflicts(assignments: ScheduleAssignment[]): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const byNurseDate = new Map<string, ScheduleAssignment[]>();
  for (const a of assignments) {
    const k = `${a.nurseId}|${a.date}`;
    const list = byNurseDate.get(k) ?? [];
    list.push(a);
    byNurseDate.set(k, list);
  }
  for (const list of byNurseDate.values()) {
    if (list.length >= 2) {
      issues.push({
        type: 'conflict',
        level: 'error',
        nurseName: list[0].nurseName,
        date: list[0].date,
        message: `${list[0].nurseName} ${list[0].date} 被排多个班次：${list.map((x) => x.shiftName).join('、')}`,
      });
    }
  }
  return issues;
}

/** 休假联动：approved 休假覆盖该排班日 → 不应排班。 */
export function checkLeaveBlocking(
  assignments: ScheduleAssignment[],
  leaves: LeaveRequest[],
): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const approved = leaves.filter((l) => l.status === 'approved');
  for (const a of assignments) {
    for (const l of approved) {
      if (l.nurseId === a.nurseId && a.date >= l.startDate && a.date <= l.endDate) {
        issues.push({
          type: 'leave',
          level: 'error',
          nurseName: a.nurseName,
          date: a.date,
          message: `${a.nurseName} ${a.date} 处于已批准休假（${l.startDate}~${l.endDate}），不应排班`,
        });
      }
    }
  }
  return issues;
}

/** 汇总全部合规问题（顺序固定，确定性）。 */
export function auditSchedule(
  assignments: ScheduleAssignment[],
  leaves: LeaveRequest[],
  requiredStaff: Record<string, number>,
  dates: string[],
  weekStart: string,
): ComplianceIssue[] {
  return [
    ...checkConsecutiveShifts(assignments),
    ...checkWeeklyHours(assignments, weekStart),
    ...checkCoverage(assignments, requiredStaff, dates),
    ...detectConflicts(assignments),
    ...checkLeaveBlocking(assignments, leaves),
  ].sort((x, y) => {
    const order: Record<ComplianceIssue['type'], number> = {
      conflict: 0,
      coverage: 1,
      leave: 2,
      consecutive: 3,
      weekly_hours: 4,
    };
    return order[x.type] - order[y.type];
  });
}

/* ---------------------------------------------------------------------------
 * 敏感指标
 * ------------------------------------------------------------------------ */

export interface EntryValidation {
  ok: boolean;
  errors: string[];
}

/** 校验：分母>0、分子分母非负、分子≤分母。 */
export function validateIndicatorEntry(numerator: number, denominator: number): EntryValidation {
  const errors: string[] = [];
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    errors.push('分子/分母必须为有效数字');
    return { ok: false, errors };
  }
  if (denominator <= 0) errors.push('分母必须大于 0');
  if (numerator < 0) errors.push('分子不可为负');
  if (denominator < 0) errors.push('分母不可为负');
  if (numerator > denominator && denominator > 0) errors.push('分子不可大于分母');
  return { ok: errors.length === 0, errors };
}

/** 率（%），保留 1 位；分母为 0 → null（待人工录入，不渲染编造数字）。 */
export function calcRate(numerator: number, denominator: number): number | null {
  if (!denominator || denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export type IndicatorStatus = 'good' | 'warning' | 'unknown';

/** 方向判定：high_good 越高越好，low_good 越低越好；无目标值 → unknown。 */
export function evaluateIndicator(
  value: number | null,
  target: number | null | undefined,
  direction: IndicatorDirection,
): IndicatorStatus {
  if (value == null || target == null) return 'unknown';
  if (direction === 'high_good') return value >= target ? 'good' : 'warning';
  return value <= target ? 'good' : 'warning';
}

export interface Quartiles {
  q1: number;
  median: number;
  q3: number;
}

/** 四分位（确定性线性插值，空数组返回全 0）。 */
export function quartiles(values: number[]): Quartiles {
  if (values.length === 0) return { q1: 0, median: 0, q3: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number): number => {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return { q1: at(0.25), median: at(0.5), q3: at(0.75) };
}

/** 月度趋势：末值相对前值的变化百分点（不足 2 点为 0）。 */
export function monthlyTrend(series: { period: string; value: number | null }[]): number {
  const valid = series.filter((s) => s.value != null);
  if (valid.length < 2) return 0;
  const last = valid[valid.length - 1].value as number;
  const prev = valid[valid.length - 2].value as number;
  return Math.round((last - prev) * 10) / 10;
}
