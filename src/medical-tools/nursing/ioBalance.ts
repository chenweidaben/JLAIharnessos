/**
 * 健澜科技 jlmedaios - 护理出入量平衡引擎（M17-E）
 *
 * 纯函数、确定性、无 I/O、无随机。按时间窗汇总入/出量与平衡，
 * 并按 06-14 / 14-22 / 22-06 三班切分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type IoDirection = 'intake' | 'output';

export interface IoRow {
  direction: IoDirection;
  amountMl: number;
  /** ISO 时间字符串或 epoch ms */
  recordTime: string | number | Date;
}

export interface IoBalance {
  intakeTotal: number;
  outputTotal: number;
  balance: number; // intake - output
}

function toMs(t: string | number | Date): number {
  return new Date(t).getTime();
}

/** 对一组记录求入/出/平衡（ML，四舍五入整数）。 */
export function summarizeIo(rows: IoRow[]): IoBalance {
  let intake = 0;
  let output = 0;
  for (const r of rows ?? []) {
    if (r.direction === 'intake') intake += r.amountMl;
    else output += r.amountMl;
  }
  return {
    intakeTotal: Math.round(intake),
    outputTotal: Math.round(output),
    balance: Math.round(intake - output),
  };
}

/** 24h 窗口平衡：默认含记录在 [now-24h, now]。 */
export function summarize24h(rows: IoRow[], now: Date = new Date()): IoBalance {
  const cutoff = now.getTime() - 24 * 3600 * 1000;
  const inWindow = (rows ?? []).filter((r) => {
    const t = toMs(r.recordTime);
    return t >= cutoff && t <= now.getTime();
  });
  return summarizeIo(inWindow);
}

export type Shift = 'day' | 'evening' | 'night'; // 06-14 day / 14-22 evening / 22-06 night

/** 按小时切班次（本地小时）。 */
export function shiftOf(date: Date): Shift {
  const h = date.getHours();
  if (h >= 6 && h < 14) return 'day';
  if (h >= 14 && h < 22) return 'evening';
  return 'night';
}

export interface ShiftBalance extends IoBalance {
  shift: Shift;
}

/** 三班分别汇总。 */
export function summarizeByShift(rows: IoRow[]): Record<Shift, IoBalance> {
  const groups: Record<Shift, IoRow[]> = { day: [], evening: [], night: [] };
  for (const r of rows ?? []) groups[shiftOf(new Date(r.recordTime))].push(r);
  return {
    day: summarizeIo(groups.day),
    evening: summarizeIo(groups.evening),
    night: summarizeIo(groups.night),
  };
}
