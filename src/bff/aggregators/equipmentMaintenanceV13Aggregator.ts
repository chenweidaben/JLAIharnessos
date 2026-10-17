/**
 * 健澜科技 jlmedaios - 医疗设备维保到期提醒 V13 纯函数（M313-C）
 *
 * checkMaintenanceDueV13 / classifyMaintenanceUrgencyV13 / detectOverdueMaintenanceV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医疗设备 */
export interface MedicalDeviceV13 {
  deviceId: string;
  name: string;
  nextMaintenance: string;
}

/** 设备维保结果 */
export interface DeviceMaintenanceResultV13 {
  deviceId: string;
  name: string;
  daysLeft: number;
}

/**
 * 到期天数计算（纯函数）：nextMaintenance - today，天数差。
 *
 * @param device 设备
 * @param today 今天 YYYY-MM-DD
 * @returns 剩余天数（负数=超期）
 */
export function checkMaintenanceDueV13(device: MedicalDeviceV13, today: string): number {
  const next = new Date(device.nextMaintenance).getTime();
  const now = new Date(today).getTime();
  return Math.round((next - now) / (1000 * 60 * 60 * 24));
}

/**
 * 分级（纯函数）：≤30 红 / 31-60 橙 / 61-90 蓝 / >90 绿。
 *
 * @param daysLeft 剩余天数
 * @returns 分级
 */
export function classifyMaintenanceUrgencyV13(daysLeft: number): string {
  if (daysLeft <= 30) return "红";
  if (daysLeft <= 60) return "橙";
  if (daysLeft <= 90) return "蓝";
  return "绿";
}

/**
 * 超期告警（纯函数）：daysLeft < 0 → 超期。
 *
 * @param devices 设备列表
 * @param today 今天
 * @returns 超期设备
 */
export function detectOverdueMaintenanceV13(
  devices: MedicalDeviceV13[],
  today: string,
): DeviceMaintenanceResultV13[] {
  return devices
    .map((d) => ({ deviceId: d.deviceId, name: d.name, daysLeft: checkMaintenanceDueV13(d, today) }))
    .filter((r) => r.daysLeft < 0);
}
