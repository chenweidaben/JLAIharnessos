/**
 * 健澜科技 jlmedaios - 员工净流失率 V13 纯函数（M330-C）
 *
 * countResignationsV13 / countNewHiresV13 / computeNetTurnoverRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 人事变动记录 */
export interface TurnoverRecordV13 {
  eventType: "resignation" | "new_hire";
}

/**
 * 本月离职人数（纯函数）：计数。
 *
 * @param records 人事变动记录
 * @returns 离职人数
 */
export function countResignationsV13(records: TurnoverRecordV13[]): number {
  return records.filter((r) => r.eventType === "resignation").length;
}

/**
 * 本月入职人数（纯函数）：计数。
 *
 * @param records 人事变动记录
 * @returns 入职人数
 */
export function countNewHiresV13(records: TurnoverRecordV13[]): number {
  return records.filter((r) => r.eventType === "new_hire").length;
}

/**
 * 净流失率（纯函数）：(入职-离职)/总人数×100，负值=净流失。
 *
 * @param resignations 离职人数
 * @param newHires 入职人数
 * @param total 总人数
 * @returns 净流失率百分比
 */
export function computeNetTurnoverRateV13(resignations: number, newHires: number, total: number): number {
  if (total === 0) return 0;
  return Math.round(((newHires - resignations) / total) * 100);
}
