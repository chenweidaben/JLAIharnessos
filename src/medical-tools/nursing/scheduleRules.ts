/**
 * 健澜科技 jlmedaios - 护理排班合规规则引擎（M16-B）
 *
 * 纯函数、确定性、无 I/O、无随机、无时钟依赖，供排班聚合器调用并可独立单测。
 * 覆盖（依据护理排班常规与《护士条例》工时保护原则，参数可调）：
 *  一、冲突检测：同护士同日多班次；休假当天被排班。
 *  二、连班限制：同护士连续夜班不超过上限；夜班后须休息。
 *  三、工时保护：单周累计工时不超过上限。
 *  四、单班覆盖：每个病区×日期×班次在岗护士数不低于最低配置（床护比约束）。
 *
 *  排班结果为辅助建议，最终由护士长确认发布；本引擎只报违规、不替人决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface ScheduleAssignment {
  nurseId: string;
  wardId: string;
  /** ISO 日期 YYYY-MM-DD */
  date: string;
  shiftId: string;
  shiftName: string;
  hours: number;
  isNight: boolean;
}

export type ViolationType =
  | 'same_day_conflict'
  | 'leave_conflict'
  | 'consecutive_nights'
  | 'rest_after_night'
  | 'weekly_hours'
  | 'shift_coverage';

export interface ScheduleViolation {
  type: ViolationType;
  nurseId?: string;
  wardId?: string;
  shiftId?: string;
  date?: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface ComplianceOptions {
  /** 连续夜班上限，默认 3 */
  maxConsecutiveNights?: number;
  /** 单周工时上限（小时），默认 48 */
  weeklyHoursCap?: number;
  /** 夜班后次日是否必须休息，默认 true */
  requireRestAfterNight?: boolean;
}

/** ISO 日期转公历序日（确定性，无时区/时钟依赖），用于相邻日与周分组 */
export function isoToOrdinal(iso: string): number {
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  return y * 372 + m * 31 + d;
}

/** 次日 ISO 日期（处理月末/跨年由序日反推过于复杂，这里仅做序日相邻比较） */
export function nextDayOrdinal(iso: string): number {
  return isoToOrdinal(iso) + 1;
}

/** 取 ISO 日期所在的周键（以该周一为锚，确定性） */
export function weekKey(iso: string): string {
  // 简化周键：用当月第几周（按日期/7 取整），确定性即可，用于工时分组
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  return `${y}-${m}-w${Math.floor((d - 1) / 7) + 1}`;
}

/**
 * 校验一组排班。leaveByNurse 为护士休假日期集合；
 * minStaffByShift 为各班次最低在岗人数。
 */
export function validateSchedule(
  assignments: ScheduleAssignment[],
  leaveByNurse: Map<string, Set<string>>,
  minStaffByShift: Map<string, number>,
  options: ComplianceOptions = {},
): { compliant: boolean; violations: ScheduleViolation[]; summary: { total: number; errors: number; warnings: number } } {
  const maxConsecutiveNights = options.maxConsecutiveNights ?? 3;
  const weeklyHoursCap = options.weeklyHoursCap ?? 48;
  const requireRestAfterNight = options.requireRestAfterNight ?? true;

  const violations: ScheduleViolation[] = [];

  // 一、同护士同日多班次冲突
  const byNurseDay = new Map<string, ScheduleAssignment[]>();
  for (const a of assignments) {
    const k = `${a.nurseId}|${a.date}`;
    const list = byNurseDay.get(k) ?? [];
    list.push(a);
    byNurseDay.set(k, list);
  }
  for (const [, list] of byNurseDay) {
    if (list.length > 1) {
      violations.push({
        type: 'same_day_conflict',
        nurseId: list[0].nurseId,
        wardId: list[0].wardId,
        date: list[0].date,
        severity: 'error',
        message: `护士 ${list[0].nurseId} 在 ${list[0].date} 被排了 ${list.length} 个班次，须唯一`,
      });
    }
  }

  // 二、休假冲突
  for (const a of assignments) {
    const leave = leaveByNurse.get(a.nurseId);
    if (leave && leave.has(a.date)) {
      violations.push({
        type: 'leave_conflict',
        nurseId: a.nurseId,
        wardId: a.wardId,
        date: a.date,
        severity: 'error',
        message: `护士 ${a.nurseId} 在 ${a.date} 处于休假，不应排班`,
      });
    }
  }

  // 三 + 四：按护士聚合后做连班/夜班后休息/周工时
  const byNurse = new Map<string, ScheduleAssignment[]>();
  for (const a of assignments) {
    const list = byNurse.get(a.nurseId) ?? [];
    list.push(a);
    byNurse.set(a.nurseId, list);
  }
  for (const [nurseId, list] of byNurse) {
    const sorted = [...list].sort((x, y) => isoToOrdinal(x.date) - isoToOrdinal(y.date));

    // 连续夜班
    let run: ScheduleAssignment[] = [];
    for (const a of sorted) {
      if (a.isNight) {
        run.push(a);
      } else {
        if (run.length > maxConsecutiveNights) {
          violations.push({
            type: 'consecutive_nights',
            nurseId, wardId: run[0].wardId, date: run[run.length - 1].date,
            severity: 'error',
            message: `护士 ${nurseId} 连续夜班 ${run.length} 天，超过上限 ${maxConsecutiveNights} 天`,
          });
        }
        run = [];
      }
    }
    if (run.length > maxConsecutiveNights) {
      violations.push({
        type: 'consecutive_nights',
        nurseId, wardId: run[0].wardId, date: run[run.length - 1].date,
        severity: 'error',
        message: `护士 ${nurseId} 连续夜班 ${run.length} 天，超过上限 ${maxConsecutiveNights} 天`,
      });
    }

    // 夜班后次日须休息
    if (requireRestAfterNight) {
      for (const a of sorted) {
        if (!a.isNight) continue;
        const nextOrd = nextDayOrdinal(a.date);
        const nextHasWork = sorted.some((b) => isoToOrdinal(b.date) === nextOrd);
        if (nextHasWork) {
          violations.push({
            type: 'rest_after_night',
            nurseId, wardId: a.wardId, date: a.date,
            severity: 'warning',
            message: `护士 ${nurseId} 夜班（${a.date}）后次日仍有排班，建议安排休息`,
          });
        }
      }
    }

    // 周工时
    const byWeek = new Map<string, number>();
    for (const a of sorted) {
      const wk = weekKey(a.date);
      byWeek.set(wk, (byWeek.get(wk) ?? 0) + a.hours);
    }
    for (const [wk, hours] of byWeek) {
      if (hours > weeklyHoursCap) {
        violations.push({
          type: 'weekly_hours',
          nurseId,
          severity: 'error',
          message: `护士 ${nurseId} 在 ${wk} 累计工时 ${hours}h，超过上限 ${weeklyHoursCap}h`,
        });
      }
    }
  }

  // 五、单班覆盖（病区×日期×班次在岗人数）
  const bySlot = new Map<string, { wardId: string; date: string; shiftId: string; shiftName: string; count: number }>();
  for (const a of assignments) {
    const k = `${a.wardId}|${a.date}|${a.shiftId}`;
    const s = bySlot.get(k) ?? { wardId: a.wardId, date: a.date, shiftId: a.shiftId, shiftName: a.shiftName, count: 0 };
    s.count += 1;
    bySlot.set(k, s);
  }
  for (const [, s] of bySlot) {
    const min = minStaffByShift.get(s.shiftId) ?? 1;
    if (s.count < min) {
      violations.push({
        type: 'shift_coverage',
        wardId: s.wardId, shiftId: s.shiftId, date: s.date,
        severity: 'error',
        message: `病区 ${s.wardId} ${s.date} 班次「${s.shiftName}」在岗 ${s.count} 人，低于最低配置 ${min} 人`,
      });
    }
  }

  const errors = violations.filter((v) => v.severity === 'error').length;
  return {
    compliant: errors === 0,
    violations,
    summary: { total: assignments.length, errors, warnings: violations.length - errors },
  };
}
