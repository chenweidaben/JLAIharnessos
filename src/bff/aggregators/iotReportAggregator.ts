/**
 * 健澜科技 jlmedaios - 物联网纯函数（M215-C）
 *
 * buildIoTReport / assessIoTConnectivity / predictEquipmentFailure
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估物联网设备在线率（纯函数）。
 *
 * @param devices 总设备
 * @param online 在线设备
 * @returns 在线率
 */
export function assessIoTConnectivity(devices: number, online: number): { rate: number; level: string } {
  const rate = devices > 0 ? online / devices : 0;
  let level = '达标';
  if (rate >= 0.98) level = '优秀';
  else if (rate < 0.9) level = '不达标';
  return { rate, level };
}

/** 传感器数据 */
export interface SensorData {
  vibration: number;
  temperature: number;
}

/**
 * 预测设备故障（纯函数）。
 *
 * @param sensors 传感器数据
 * @returns 故障概率
 */
export function predictEquipmentFailure(sensors: SensorData): { probability: number; alert: boolean } {
  const probability = Math.min(1, (sensors.vibration / 10) * 0.6 + (sensors.temperature / 100) * 0.4);
  return { probability, alert: probability >= 0.7 };
}

/** 物联网报告输出 */
export interface IoTReport {
  timeRange: string;
  deviceOnboarding: { medical: number; environment: number; wearable: number; location: number; security: number };
  smartWard: { beds: number };
  smartPharmacy: { cabinets: number };
  energy: { meters: number };
  rtls: { people: number; assets: number; infantAntiTheft: number };
  environment: { sensors: number };
  predictive: { maintenance: number };
  edge: { mqtt: boolean };
  suggestions: string[];
}

/**
 * 构建物联网报告。
 *
 * @param timeRange 时间范围
 * @returns 物联网报告
 */
export function buildIoTReport(timeRange: string): IoTReport {
  return {
    timeRange,
    deviceOnboarding: { medical: 500, environment: 200, wearable: 300, location: 100, security: 150 },
    smartWard: { beds: 1000 },
    smartPharmacy: { cabinets: 50 },
    energy: { meters: 500 },
    rtls: { people: 2000, assets: 500, infantAntiTheft: 50 },
    environment: { sensors: 300 },
    predictive: { maintenance: 20 },
    edge: { mqtt: true },
    suggestions: ['提高设备在线率', '扩展预测性维护'],
  };
}
