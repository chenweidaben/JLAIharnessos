/**
 * 健澜科技 jlmedaios - 手术排程冲突检测 V13 纯函数（M312-C）
 *
 * detectSurgeonConflictV13 / detectRoomConflictV13 / detectBackToBackGapV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手术时段 */
export interface SurgerySlotV13 {
  surgeryId: string;
  surgeonId: string;
  roomId: string;
  startMin: number;
  endMin: number;
}

/** 冲突对 */
export interface ConflictPairV13 {
  a: string;
  b: string;
  reason: string;
}

/**
 * 判断时间段是否重叠（纯函数）：a.start < b.end && b.start < a.end。
 *
 * @param a 时段 a
 * @param b 时段 b
 * @returns 是否重叠
 */
function overlap(a: { startMin: number; endMin: number }, b: { startMin: number; endMin: number }): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

/**
 * 医生时间冲突（纯函数）：同 surgeonId 时间段重叠。
 *
 * @param surgeries 手术列表
 * @returns 冲突对
 */
export function detectSurgeonConflictV13(surgeries: SurgerySlotV13[]): ConflictPairV13[] {
  const pairs: ConflictPairV13[] = [];
  for (let i = 0; i < surgeries.length; i++) {
    for (let j = i + 1; j < surgeries.length; j++) {
      if (
        surgeries[i].surgeonId === surgeries[j].surgeonId &&
        overlap(surgeries[i], surgeries[j])
      ) {
        pairs.push({
          a: surgeries[i].surgeryId,
          b: surgeries[j].surgeryId,
          reason: `医生 ${surgeries[i].surgeonId} 时间重叠`,
        });
      }
    }
  }
  return pairs;
}

/**
 * 手术室时间冲突（纯函数）：同 roomId 时间段重叠。
 *
 * @param surgeries 手术列表
 * @returns 冲突对
 */
export function detectRoomConflictV13(surgeries: SurgerySlotV13[]): ConflictPairV13[] {
  const pairs: ConflictPairV13[] = [];
  for (let i = 0; i < surgeries.length; i++) {
    for (let j = i + 1; j < surgeries.length; j++) {
      if (
        surgeries[i].roomId === surgeries[j].roomId &&
        overlap(surgeries[i], surgeries[j])
      ) {
        pairs.push({
          a: surgeries[i].surgeryId,
          b: surgeries[j].surgeryId,
          reason: `手术室 ${surgeries[i].roomId} 时间重叠`,
        });
      }
    }
  }
  return pairs;
}

/**
 * 连台间隔检测（纯函数）：按 startMin 排序后相邻手术间隔 < minGapMin → 告警。
 *
 * @param surgeries 手术列表
 * @param minGapMin 最小间隔（分钟）
 * @returns 告警对
 */
export function detectBackToBackGapV13(
  surgeries: SurgerySlotV13[],
  minGapMin: number,
): ConflictPairV13[] {
  const sorted = [...surgeries].sort((a, b) => a.startMin - b.startMin);
  const alerts: ConflictPairV13[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].startMin - sorted[i].endMin;
    if (gap < minGapMin) {
      alerts.push({
        a: sorted[i].surgeryId,
        b: sorted[i + 1].surgeryId,
        reason: `连台间隔 ${gap}min < ${minGapMin}min`,
      });
    }
  }
  return alerts;
}
