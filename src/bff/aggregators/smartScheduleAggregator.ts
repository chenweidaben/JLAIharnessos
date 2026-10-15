/**
 * 健澜科技 jlmedaios - 医院智能排班聚合器（M152-C · AI 能力深化）
 *
 * 【AI 能力深化】在传统「护士长手排表」之上，把科室排班建模为带公平性约束的
 *  贪心均衡问题：纯函数 optimizeSchedule 一次生成一个日期区间内的白班 / 夜班
 *  落位；getScheduleConflict 对任意排班网格做合规复核。两者均为纯函数，
 *  不触碰时钟 / IO，便于单测与回归。
 *
 * 硬约束：
 *   1) 每人每周（ISO week）≤ maxWorkdaysPerWeek（默认 5）个工作日；
 *   2) 夜班后必休 1 天（次日不排任何班次）；
 *   3) 主任医师（attending）每周至少覆盖 1 个白班；
 *   4) 科室不缺岗：每日白班 ≥ minDayStaff、夜班 ≥ minNightStaff；
 *   5) 夜班均衡：同一周内任意两人夜班数 max - min ≤ 1。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export type ShiftType = 'day' | 'night';
export type StaffRole = 'attending' | 'resident' | 'intern';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
}

export interface ScheduleConstraints {
  /** 排班员工池（主任 / 主治 / 住院医师 / 护士）。 */
  staff: StaffMember[];
  /** 每人每周最大工作日（默认 5）。 */
  maxWorkdaysPerWeek?: number;
  /** 每日白班最少在岗（默认 2）。 */
  minDayStaff?: number;
  /** 每日夜班最少在岗（默认 1）。 */
  minNightStaff?: number;
  /** 主任医师每周至少覆盖 1 个白班（默认 true）。 */
  requireAttendingDay?: boolean;
}

export interface ShiftAssignment {
  staffId: string;
  staffName: string;
  role: StaffRole;
  /** YYYY-MM-DD */
  date: string;
  shift: ShiftType;
}

export interface UncoveredSlot {
  date: string;
  shift: ShiftType;
  required: number;
  actual: number;
}

export interface ScheduleMetrics {
  totalShifts: number;
  /** 任意一周内夜班数 max - min（天）。应 ≤ 1。 */
  nightMaxMinGap: number;
  uncovered: UncoveredSlot[];
}

export interface ScheduleGrid {
  dept: string;
  startDate: string;
  endDate: string;
  assignments: ShiftAssignment[];
  staffNightCounts: Record<string, number>;
  staffWorkdayCounts: Record<string, number>;
  metrics: ScheduleMetrics;
}

export type ConflictType =
  | 'double_shift'        // 同日白班 + 夜班双排
  | 'night_then_work'      // 夜班后次日未休息
  | 'over_workdays'        // 周工作日超限
  | 'no_attending_day'    // 某周无主任白班
  | 'understaffed';       // 某班次缺岗

export interface Conflict {
  type: ConflictType;
  staffId?: string;
  /** YYYY-MM-DD，或 'YYYY-Www' 周键。 */
  date: string;
  message: string;
}

// ---------------------------------------------------------------------------
// 日期工具（纯函数，UTC 日历，不引入新依赖）
// ---------------------------------------------------------------------------

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

function toDateStr(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = `${dt.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${dt.getUTCDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(s: string, n: number): string {
  const dt = parseDate(s);
  dt.setUTCDate(dt.getUTCDate() + n);
  return toDateStr(dt);
}

/** ISO week key：'YYYY-Www'，Monday 起算。 */
function isoWeekKey(s: string): string {
  const dt = parseDate(s);
  const dayNum = (dt.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  dt.setUTCDate(dt.getUTCDate() - dayNum + 3); // 本周周四
  const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const fday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fday + 3);
  const week = 1 + Math.round((dt.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${dt.getUTCFullYear()}-W${`${week}`.padStart(2, '0')}`;
}

function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  // 防御上限：单次最多排 366 天
  for (let i = 0; cur <= end && i < 366; i++) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 纯函数：optimizeSchedule
// ---------------------------------------------------------------------------

/**
 * AI 能力深化：贪心 + 夜班均衡。
 *  1) 先排夜班——每晚选「本周夜班最少」者，天然把夜班摊平；
 *  2) 再排白班——优先主任（保证白班覆盖），其余按本周工作日最少者；
 *  3) 任意已排夜班者次日强制休（不进任何候选池）。
 */
export function optimizeSchedule(
  dept: string,
  startDate: string,
  endDate: string,
  constraints: ScheduleConstraints,
): ScheduleGrid {
  const staff = constraints.staff ?? [];
  const maxWork = constraints.maxWorkdaysPerWeek ?? 5;
  const minDay = constraints.minDayStaff ?? 2;
  const minNight = constraints.minNightStaff ?? 1;
  const requireAttending = constraints.requireAttendingDay ?? true;

  const assignments: ShiftAssignment[] = [];
  // 状态表
  const workedOn = new Map<string, Set<string>>();            // staffId -> dates
  const nightOn = new Map<string, Set<string>>();           // staffId -> dates(夜班)
  const workByWeek = new Map<string, Map<string, number>>(); // staffId -> weekKey -> count
  const nightByWeek = new Map<string, Map<string, number>>();

  const staffById = new Map(staff.map((s) => [s.id, s]));

  const bump = (table: Map<string, Map<string, number>>, staffId: string, week: string) => {
    if (!table.has(staffId)) table.set(staffId, new Map());
    const m = table.get(staffId)!;
    m.set(week, (m.get(week) ?? 0) + 1);
  };
  const count = (table: Map<string, Map<string, number>>, staffId: string, week: string) =>
    table.get(staffId)?.get(week) ?? 0;

  const dates = eachDate(startDate, endDate);

  for (const date of dates) {
    const week = isoWeekKey(date);
    const yesterday = addDays(date, -1);

    // 已休（昨天夜班）→ 今天不可排
    const mustRestToday = new Set(
      staff.filter((s) => nightOn.get(s.id)?.has(yesterday)).map((s) => s.id),
    );
    // 今天已被排的
    const takenToday = new Set<string>();

    // ---- 1) 夜班：选本周夜班最少者 ----
    const nightPool = staff
      .filter((s) => !mustRestToday.has(s.id))
      .filter((s) => !workedOn.get(s.id)?.has(date))
      .filter((s) => count(workByWeek, s.id, week) < maxWork)
      .sort((a, b) => {
        const na = count(nightByWeek, a.id, week);
        const nb = count(nightByWeek, b.id, week);
        if (na !== nb) return na - nb;
        const wa = count(workByWeek, a.id, week);
        const wb = count(workByWeek, b.id, week);
        if (wa !== wb) return wa - wb;
        return a.id.localeCompare(b.id);
      });

    const nightPick = nightPool.slice(0, Math.max(0, minNight));
    for (const s of nightPick) {
      assignments.push({ staffId: s.id, staffName: s.name, role: s.role, date, shift: 'night' });
      if (!workedOn.has(s.id)) workedOn.set(s.id, new Set());
      workedOn.get(s.id)!.add(date);
      if (!nightOn.has(s.id)) nightOn.set(s.id, new Set());
      nightOn.get(s.id)!.add(date);
      bump(workByWeek, s.id, week);
      bump(nightByWeek, s.id, week);
      takenToday.add(s.id);
    }

    // ---- 2) 白班：优先主任（本周尚无主任白班时），其余按本周工作日最少者 ----
    const attendingCoveredThisWeek = assignments.some(
      (a) => a.shift === 'day' && a.role === 'attending' && isoWeekKey(a.date) === week,
    );
    const dayPool = staff
      .filter((s) => !mustRestToday.has(s.id))
      .filter((s) => !takenToday.has(s.id))
      .filter((s) => !workedOn.get(s.id)?.has(date))
      .filter((s) => count(workByWeek, s.id, week) < maxWork)
      .sort((a, b) => {
        const aAtt = a.role === 'attending' ? 0 : 1;
        const bAtt = b.role === 'attending' ? 0 : 1;
        // 若本周尚无主任白班，把主任顶到最前
        if (requireAttending && !attendingCoveredThisWeek && aAtt !== bAtt) return aAtt - bAtt;
        const wa = count(workByWeek, a.id, week);
        const wb = count(workByWeek, b.id, week);
        if (wa !== wb) return wa - wb;
        return a.id.localeCompare(b.id);
      });

    const dayPick = dayPool.slice(0, Math.max(0, minDay));
    for (const s of dayPick) {
      assignments.push({ staffId: s.id, staffName: s.name, role: s.role, date, shift: 'day' });
      if (!workedOn.has(s.id)) workedOn.set(s.id, new Set());
      workedOn.get(s.id)!.add(date);
      bump(workByWeek, s.id, week);
    }
  }

  // ---- 汇总 ----
  const staffNightCounts: Record<string, number> = {};
  const staffWorkdayCounts: Record<string, number> = {};
  for (const s of staff) {
    staffNightCounts[s.id] = nightOn.get(s.id)?.size ?? 0;
    let wd = 0;
    for (const [, n] of workByWeek.get(s.id) ?? []) wd += n;
    staffWorkdayCounts[s.id] = wd;
  }

  const metrics = buildMetrics(assignments, staff, constraints);
  return { dept, startDate, endDate, assignments, staffNightCounts, staffWorkdayCounts, metrics };
}

// ---------------------------------------------------------------------------
// 指标
// ---------------------------------------------------------------------------

function buildMetrics(
  assignments: ShiftAssignment[],
  staff: StaffMember[],
  constraints: ScheduleConstraints,
): ScheduleMetrics {
  const minDay = constraints.minDayStaff ?? 2;
  const minNight = constraints.minNightStaff ?? 1;

  // 按 date × shift 计数
  const byCell = new Map<string, number>();
  // 按 week × staff × shift
  const nightByStaffWeek = new Map<string, Map<string, number>>();
  const dates = new Set<string>();

  for (const a of assignments) {
    dates.add(a.date);
    byCell.set(`${a.date}|${a.shift}`, (byCell.get(`${a.date}|${a.shift}`) ?? 0) + 1);
    const week = isoWeekKey(a.date);
    if (a.shift === 'night') {
      if (!nightByStaffWeek.has(week)) nightByStaffWeek.set(week, new Map());
      const m = nightByStaffWeek.get(week)!;
      m.set(a.staffId, (m.get(a.staffId) ?? 0) + 1);
    }
  }

  const uncovered: UncoveredSlot[] = [];
  for (const date of [...dates].sort()) {
    for (const shift of ['day', 'night'] as ShiftType[]) {
      const need = shift === 'day' ? minDay : minNight;
      const actual = byCell.get(`${date}|${shift}`) ?? 0;
      if (actual < need) uncovered.push({ date, shift, required: need, actual });
    }
  }

  // 夜班 max-min gap（按周）
  let gap = 0;
  for (const [, m] of nightByStaffWeek) {
    // 所有员工都参与比较（0 也算）
    const counts = staff.map((s) => m.get(s.id) ?? 0);
    const mx = Math.max(...counts, 0);
    const mn = Math.min(...counts, 0);
    gap = Math.max(gap, mx - mn);
  }

  return { totalShifts: assignments.length, nightMaxMinGap: gap, uncovered };
}

// ---------------------------------------------------------------------------
// 纯函数：getScheduleConflict
// ---------------------------------------------------------------------------

/**
 * 对任意排班网格做合规复核（可用于「优化结果」或「人工手排表」）。
 * 入参 constraints 与 optimizeSchedule 同构（staff / minDay / minNight / ...）。
 */
export function getScheduleConflict(
  schedule: { assignments: ShiftAssignment[]; constraints: ScheduleConstraints },
): Conflict[] {
  const { assignments, constraints } = schedule;
  const maxWork = constraints.maxWorkdaysPerWeek ?? 5;
  const minDay = constraints.minDayStaff ?? 2;
  const minNight = constraints.minNightStaff ?? 1;
  const requireAttending = constraints.requireAttendingDay ?? true;
  const staffIds = new Set((constraints.staff ?? []).map((s) => s.id));

  const out: Conflict[] = [];

  // (staff, date) -> shifts
  const cell = new Map<string, ShiftType[]>();
  const byDateShift = new Map<string, number>();
  const workByStaffWeek = new Map<string, Map<string, number>>();
  const attendingDayWeeks = new Set<string>();

  for (const a of assignments) {
    const k = `${a.staffId}|${a.date}`;
    if (!cell.has(k)) cell.set(k, []);
    cell.get(k)!.push(a.shift);

    const dk = `${a.date}|${a.shift}`;
    byDateShift.set(dk, (byDateShift.get(dk) ?? 0) + 1);

    const week = isoWeekKey(a.date);
    if (!workByStaffWeek.has(a.staffId)) workByStaffWeek.set(a.staffId, new Map());
    const m = workByStaffWeek.get(a.staffId)!;
    m.set(week, (m.get(week) ?? 0) + 1);

    if (requireAttending && a.role === 'attending' && a.shift === 'day') {
      attendingDayWeeks.add(week);
    }
  }

  // 1) 双排 / 夜班后必休
  for (const a of assignments) {
    const shifts = cell.get(`${a.staffId}|${a.date}`) ?? [];
    if (shifts.includes('day') && shifts.includes('night')) {
      out.push({
        type: 'double_shift',
        staffId: a.staffId,
        date: a.date,
        message: `员工 ${a.staffId} 在 ${a.date} 同时排了白班与夜班`,
      });
    }
    if (a.shift === 'night') {
      const next = addDays(a.date, 1);
      const workedTomorrow = assignments.some((b) => b.staffId === a.staffId && b.date === next);
      if (workedTomorrow) {
        out.push({
          type: 'night_then_work',
          staffId: a.staffId,
          date: a.date,
          message: `员工 ${a.staffId} ${a.date} 夜班后，次日 ${next} 未休息`,
        });
      }
    }
  }

  // 2) 周工作日超限
  for (const [staffId, m] of workByStaffWeek) {
    for (const [week, n] of m) {
      if (n > maxWork) {
        out.push({
          type: 'over_workdays',
          staffId,
          date: week,
          message: `员工 ${staffId} 在 ${week} 工作 ${n} 天，超过上限 ${maxWork}`,
        });
      }
    }
  }

  // 3) 主任白班覆盖：找到所有出现过的周
  const weeks = new Set<string>();
  for (const a of assignments) weeks.add(isoWeekKey(a.date));
  if (requireAttending) {
    for (const w of weeks) {
      if (!attendingDayWeeks.has(w)) {
        out.push({
          type: 'no_attending_day',
          date: w,
          message: `周 ${w} 无主任医师白班覆盖`,
        });
      }
    }
  }

  // 4) 缺岗：枚举所有出现过的 date × shift
  const dates = new Set<string>();
  for (const a of assignments) dates.add(a.date);
  for (const date of dates) {
    for (const shift of ['day', 'night'] as ShiftType[]) {
      const need = shift === 'day' ? minDay : minNight;
      const actual = byDateShift.get(`${date}|${shift}`) ?? 0;
      if (actual < need) {
        out.push({
          type: 'understaffed',
          date,
          message: `${date} ${shift === 'day' ? '白班' : '夜班'} 在岗 ${actual} 人，缺 ${need - actual} 人`,
        });
      }
    }
  }

  // 5) 引用了不在 staff 池的员工（数据完整性）
  for (const a of assignments) {
    if (staffIds.size > 0 && !staffIds.has(a.staffId)) {
      out.push({
        type: 'understaffed',
        staffId: a.staffId,
        date: a.date,
        message: `员工 ${a.staffId} 不在科室员工池内`,
      });
    }
  }

  return out;
}
