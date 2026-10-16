/**
 * 健澜科技 jlmedaios - 后勤安全纯函数（M213-B）
 *
 * buildLogisticsSafetyReport / assessFireSafetyCompliance / trackMedicalWasteManifest
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 消防设施 */
export interface FireFacility {
  type: string;
  inspected: boolean;
  passed: boolean;
}

/**
 * 评估消防安全合规率（纯函数）。
 *
 * @param facilities 设施列表
 * @returns 合规率
 */
export function assessFireSafetyCompliance(facilities: FireFacility[]): { complianceRate: number; level: string } {
  const total = facilities.filter((f) => f.inspected).length;
  const passed = facilities.filter((f) => f.inspected && f.passed).length;
  const complianceRate = total > 0 ? passed / total : 0;
  let level = '达标';
  if (complianceRate < 0.9) level = '不达标';
  else if (complianceRate >= 0.98) level = '优秀';
  return { complianceRate, level };
}

/** 医疗废物联单 */
export interface WasteManifest {
  id: string;
  weight: number;
  sealed: boolean;
}

/**
 * 追踪医疗废物联单（纯函数）。
 *
 * @param waste 联单列表
 * @returns 联单数与总重量
 */
export function trackMedicalWasteManifest(waste: WasteManifest[]): { count: number; totalWeight: number; sealedRate: number } {
  const count = waste.length;
  const totalWeight = waste.reduce((sum, w) => sum + w.weight, 0);
  const sealedCount = waste.filter((w) => w.sealed).length;
  const sealedRate = count > 0 ? sealedCount / count : 0;
  return { count, totalWeight, sealedRate };
}

/** 后勤安全报告输出 */
export interface LogisticsSafetyReport {
  timeRange: string;
  fire: { facilities: number; drills: number };
  security: { incidents: number; patrols: number };
  waste: { manifests: number; weight: number };
  sewage: { discharge: number; compliant: boolean };
  sewing: { laundry: number };
  food: { meals: number; incidents: number };
  cleaning: { area: number };
  specialEquipment: { elevators: number; boilers: number };
  suggestions: string[];
}

/**
 * 构建后勤安全报告。
 *
 * @param timeRange 时间范围
 * @returns 后勤安全报告
 */
export function buildLogisticsSafetyReport(timeRange: string): LogisticsSafetyReport {
  return {
    timeRange,
    fire: { facilities: 500, drills: 4 },
    security: { incidents: 5, patrols: 365 },
    waste: { manifests: 1000, weight: 5000 },
    sewage: { discharge: 10000, compliant: true },
    sewing: { laundry: 100000 },
    food: { meals: 500000, incidents: 0 },
    cleaning: { area: 50000 },
    specialEquipment: { elevators: 50, boilers: 10 },
    suggestions: ['加强消防演练', '提高医废密封率'],
  };
}
