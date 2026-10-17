/**
 * 健澜科技 jlmedaios - 手术室利用率 V13 纯函数（M331-B）
 *
 * computeOperatingRoomUtilizationV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手术间 */
export interface OperatingRoomV13 {
  roomName: string;
  usedHours: number;
  availableHours: number;
}

/** 手术间利用率项 */
export interface OperatingRoomUtilizationItemV13 {
  roomName: string;
  utilizationRate: number;
}

/**
 * 手术间利用率（纯函数）：使用时长/可使用时长×100。
 *
 * @param rooms 手术间列表
 * @returns 各手术间利用率
 */
export function computeOperatingRoomUtilizationV13(rooms: OperatingRoomV13[]): OperatingRoomUtilizationItemV13[] {
  return rooms.map((r) => ({
    roomName: r.roomName,
    utilizationRate: r.availableHours === 0 ? 0 : Math.round((r.usedHours / r.availableHours) * 100),
  }));
}
