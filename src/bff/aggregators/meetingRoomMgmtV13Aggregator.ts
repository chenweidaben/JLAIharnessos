/**
 * 健澜科技 jlmedaios - 会议室管理 V13 纯函数（M437-D，M437 收官，后勤保障与环境管理深化组）
 *
 * computeMeetingRoomUtilizationRateV13 / computeMeetingRoomBookingTimelinessRateV13 / computeMeetingRoomEquipmentCompletenessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 会议室管理记录 */
export interface MeetingRoomMgmtRecordV13 {
  usedHours: number;
  availableHours: number;
  timelyBooking: number;
  shouldBooking: number;
  intactEquipment: number;
  totalEquipment: number;
}

/**
 * 会议室使用率（纯函数）：已使用小时数/可用小时总数×100，保留 2 位小数。
 *
 * @param records 会议室管理记录列表
 * @returns 会议室使用率百分比
 */
export function computeMeetingRoomUtilizationRateV13(records: MeetingRoomMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.availableHours, 0);
  if (total === 0) return 0;
  const used = records.reduce((acc, r) => acc + r.usedHours, 0);
  return Math.round((used / total) * 10000) / 100;
}

/**
 * 预订及时率（纯函数）：及时预订次数/应预订次数×100，保留 2 位小数。
 *
 * @param records 会议室管理记录列表
 * @returns 预订及时率百分比
 */
export function computeMeetingRoomBookingTimelinessRateV13(records: MeetingRoomMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldBooking, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyBooking, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 设备完好率（纯函数）：完好设备数/设备总数×100，保留 2 位小数。
 *
 * @param records 会议室管理记录列表
 * @returns 设备完好率百分比
 */
export function computeMeetingRoomEquipmentCompletenessRateV13(records: MeetingRoomMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalEquipment, 0);
  if (total === 0) return 0;
  const intact = records.reduce((acc, r) => acc + r.intactEquipment, 0);
  return Math.round((intact / total) * 10000) / 100;
}
