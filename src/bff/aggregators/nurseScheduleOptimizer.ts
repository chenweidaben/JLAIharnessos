/**
 * 健澜科技 jlmedaios - 护士智能排班优化纯函数（M184-A）
 *
 * optimizeNurseSchedule：
 *   - 床护比约束：每班次护士数 ≥ patientCount / BED_NURSE_RATIO
 *   - 夜班轮值公平：同一护士连续夜班 ≤ MAX_CONSECUTIVE_NIGHTS
 *   - 休假不超编：offToday 的护士不计入在岗
 *   - 输出排班方案 + 冲突检测 + 人力缺口
 *
 * 与 M152-C 的 optimizeSchedule（医生周排班）互补，本模块面向护士日排班。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 床护比：每 8 张床配 1 名白班护士 */
export const BED_NURSE_RATIO = 8;
/** 夜班覆盖率（相对白班需求） */
export const NIGHT_SHIFT_COVERAGE = 0.6;
/** 同一护士连续夜班上限 */
export const MAX_CONSECUTIVE_NIGHTS = 3;

/** 护士信息 */
export interface NurseStaff {
  staffId: string;
  staffName: string;
  /** 当前已连续夜班天数（公平性约束） */
  consecutiveNights?: number;
  /** 当日休假 */
  offToday?: boolean;
}

/** 单个班次排班结果 */
export interface NurseShiftAssignment {
  shiftType: 'day' | 'evening' | 'night';
  assigned: string[];
  required: number;
  gap: number;
}

/** 冲突告警 */
export interface NurseScheduleConflict {
  type: 'over_assigned' | 'consecutive_night' | 'off_duty_assigned';
  staffId: string;
  message: string;
}

/** 排班方案 */
export interface NurseSchedulePlan {
  dept: string;
  date: string;
  shifts: NurseShiftAssignment[];
  conflicts: NurseScheduleConflict[];
  totalRequired: number;
  totalAssigned: number;
  feasible: boolean;
}

/**
 * 优化护士单日排班方案。
 *
 * @param dept 科室
 * @param date 日期 YYYY-MM-DD
 * @param staffList 可用护士列表
 * @param patientCount 当日在院患者数
 * @returns 排班方案（含冲突与缺口）
 */
export function optimizeNurseSchedule(
  dept: string,
  date: string,
  staffList: NurseStaff[],
  patientCount: number,
): NurseSchedulePlan {
  const onDuty = staffList.filter((s) => !s.offToday);

  const dayRequired = Math.max(1, Math.ceil(patientCount / BED_NURSE_RATIO));
  const eveningRequired = Math.max(
    1,
    Math.ceil((patientCount / BED_NURSE_RATIO) * NIGHT_SHIFT_COVERAGE),
  );
  const nightRequired = Math.max(
    1,
    Math.ceil((patientCount / BED_NURSE_RATIO) * NIGHT_SHIFT_COVERAGE),
  );

  const conflicts: NurseScheduleConflict[] = [];

  // 白班：前 dayRequired 个在岗护士
  const dayAssigned = onDuty.slice(0, dayRequired).map((s) => s.staffId);
  // 中班：接下来 eveningRequired 个
  const eveningStart = dayRequired;
  const eveningAssigned = onDuty
    .slice(eveningStart, eveningStart + eveningRequired)
    .map((s) => s.staffId);
  // 夜班：从未被白班/中班占用的护士中，选连续夜班数 < MAX 的
  const occupied = new Set([...dayAssigned, ...eveningAssigned]);
  const nightCandidates = onDuty.filter(
    (s) => !occupied.has(s.staffId) && (s.consecutiveNights ?? 0) < MAX_CONSECUTIVE_NIGHTS,
  );
  const nightAssigned = nightCandidates.slice(0, nightRequired).map((s) => s.staffId);

  // 冲突检测
  for (const s of staffList) {
    if (s.offToday && dayAssigned.includes(s.staffId)) {
      conflicts.push({
        type: 'off_duty_assigned',
        staffId: s.staffId,
        message: `${s.staffName} 当日休假却被排白班`,
      });
    }
    if (
      (s.consecutiveNights ?? 0) >= MAX_CONSECUTIVE_NIGHTS &&
      nightAssigned.includes(s.staffId)
    ) {
      conflicts.push({
        type: 'consecutive_night',
        staffId: s.staffId,
        message: `${s.staffName} 已连续夜班 ${s.consecutiveNights} 天，不应再排夜班`,
      });
    }
  }

  // 超编检测：同一护士同时被排多个班
  const allAssigned = [...dayAssigned, ...eveningAssigned, ...nightAssigned];
  const seen = new Set<string>();
  for (const id of allAssigned) {
    if (seen.has(id)) {
      conflicts.push({
        type: 'over_assigned',
        staffId: id,
        message: `护士 ${id} 被同时排多个班次`,
      });
    }
    seen.add(id);
  }

  const shifts: NurseShiftAssignment[] = [
    {
      shiftType: 'day',
      assigned: dayAssigned,
      required: dayRequired,
      gap: Math.max(0, dayRequired - dayAssigned.length),
    },
    {
      shiftType: 'evening',
      assigned: eveningAssigned,
      required: eveningRequired,
      gap: Math.max(0, eveningRequired - eveningAssigned.length),
    },
    {
      shiftType: 'night',
      assigned: nightAssigned,
      required: nightRequired,
      gap: Math.max(0, nightRequired - nightAssigned.length),
    },
  ];

  const totalRequired = dayRequired + eveningRequired + nightRequired;
  const totalAssigned =
    dayAssigned.length + eveningAssigned.length + nightAssigned.length;

  return {
    dept,
    date,
    shifts,
    conflicts,
    totalRequired,
    totalAssigned,
    feasible: totalAssigned >= totalRequired && conflicts.length === 0,
  };
}
