/**
 * 健澜科技 jlmedaios - 复诊号源推荐纯函数（M62-A）
 *
 * 从号源列表选最近工作日且有余量者；冲突判定。纯函数无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface SlotOption {
  scheduleId: string;
  appointmentDate: string; // YYYY-MM-DD
  department: string;
  remaining: number; // total_quota - booked_count
}

function dayOfWeek(dateStr: string): number {
  const d = new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return -1;
  return d.getDay(); // 0 Sun, 6 Sat
}

/** 优先最近工作日（周一~周五）且有余量的号源；无余量过滤掉。 */
export function pickSuggestedSchedule(slots: SlotOption[], suggestedDate: string): SlotOption | null {
  const available = (slots ?? []).filter((s) => s.remaining > 0);
  if (available.length === 0) return null;
  const target = new Date(suggestedDate).getTime();
  const score = (s: SlotOption): number => {
    const t = new Date(s.appointmentDate).getTime();
    if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
    const dist = Math.abs(t - target);
    const weekend = dayOfWeek(s.appointmentDate) === 0 || dayOfWeek(s.appointmentDate) === 6 ? 1 : 0;
    return dist + weekend * (7 * 24 * 3600 * 1000);
  };
  return available.slice().sort((a, b) => score(a) - score(b))[0];
}

/** 已有 booked 预约与新日期是否冲突（同日期视为重复）。 */
export function isConflict(existingBookedDate: string | null, newDate: string): boolean {
  if (!existingBookedDate) return false;
  return existingBookedDate === newDate;
}
