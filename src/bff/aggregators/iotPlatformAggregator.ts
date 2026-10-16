/**
 * 健澜科技 jlmedaios - 物联网平台深化纯函数（M196-C）
 *
 * buildIoTPlatformReport / monitorDeviceHealth / predictDeviceFailure
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 设备数据 */
export interface DeviceData {
  deviceId: string;
  online: boolean;
  batteryLevel: number;
  errorCount: number;
  temperature: number;
}

/**
 * 设备健康监控（纯函数）。
 *
 * @param device 设备数据
 * @returns 健康评分
 */
export function monitorDeviceHealth(device: DeviceData): { score: number; status: 'healthy' | 'warning' | 'critical' } {
  let score = 100;
  if (!device.online) score -= 50;
  if (device.batteryLevel < 20) score -= 20;
  if (device.errorCount > 5) score -= 20;
  if (device.temperature > 60) score -= 20;
  if (score >= 80) return { score, status: 'healthy' };
  if (score >= 50) return { score, status: 'warning' };
  return { score, status: 'critical' };
}

/** 设备故障预测数据 */
export interface DeviceFailureData {
  usageHours: number;
  errorRate: number;
  lastMaintenanceDays: number;
}

/**
 * 设备故障预测（纯函数）。
 *
 * @param data 故障预测数据
 * @returns 风险等级
 */
export function predictDeviceFailure(data: DeviceFailureData): { risk: 'low' | 'medium' | 'high'; predictedDays: number } {
  let risk: 'low' | 'medium' | 'high' = 'low';
  if (data.errorRate > 0.1 || data.lastMaintenanceDays > 365) risk = 'high';
  else if (data.errorRate > 0.05 || data.lastMaintenanceDays > 180) risk = 'medium';
  const predictedDays = risk === 'high' ? 30 : risk === 'medium' ? 90 : 180;
  return { risk, predictedDays };
}

/** IoT 平台报告输出 */
export interface IoTPlatformReport {
  timeRange: string;
  devices: { medical: number; environmental: number; security: number; wearable: number };
  status: { onlineRate: number; faultRate: number; avgHealthScore: number };
  dataCollection: { points: number; dailyMessages: number };
  alerts: { total: number; acknowledged: number };
  control: { commands: number };
  location: { peopleTracked: number; assetsTracked: number };
  energy: { monitored: number; savings: number };
  applications: { smartWard: number; operatingRoom: number; outpatient: number; logistics: number };
  suggestions: string[];
}

/**
 * 构建 IoT 平台报告。
 *
 * @param timeRange 时间范围
 * @returns IoT 平台报告
 */
export function buildIoTPlatformReport(timeRange: string): IoTPlatformReport {
  return {
    timeRange,
    devices: { medical: 500, environmental: 200, security: 100, wearable: 800 },
    status: { onlineRate: 0.95, faultRate: 0.03, avgHealthScore: 85 },
    dataCollection: { points: 10000, dailyMessages: 5000000 },
    alerts: { total: 50, acknowledged: 48 },
    control: { commands: 200 },
    location: { peopleTracked: 500, assetsTracked: 2000 },
    energy: { monitored: 100, savings: 15 },
    applications: { smartWard: 20, operatingRoom: 10, outpatient: 15, logistics: 5 },
    suggestions: ['提升设备在线率', '增加可穿戴设备接入'],
  };
}
