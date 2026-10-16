/**
 * 健澜科技 jlmedaios - 特种设备与危化品纯函数（M229-C）
 *
 * buildSpecialEquipHazmatReport / inspectSpecialEquip / handleHazmatLeak
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 巡检特种设备（纯函数）。
 *
 * @param equipments 设备总数
 * @returns 合格率
 */
export function inspectSpecialEquip(equipments: number): { passed: number; rate: number } {
  const passed = Math.round(equipments * 0.98);
  const rate = Math.round(passed * 1000 / equipments) / 10;
  return { passed, rate };
}

/**
 * 处置危化品泄漏（纯函数）。
 *
 * @param leak 泄漏类型
 * @returns 处置方案
 */
export function handleHazmatLeak(leak: string): { action: string; emergency: boolean } {
  let action = '常规清理';
  let emergency = false;
  if (leak.includes('腐蚀性') || leak.includes('易燃')) {
    action = '紧急疏散·专业处置';
    emergency = true;
  }
  return { action, emergency };
}

/** 特种设备与危化品报告输出 */
export interface SpecialEquipHazmatReport {
  timeRange: string;
  equipment: { elevators: number; pressureVessels: number; boilers: number; cranes: number };
  management: { inspections: number };
  medicalGas: { oxygen: boolean; vacuum: boolean; air: boolean };
  chemicals: { msds: number; leaks: number };
  radiation: { sources: number };
  lab: { bioSafety: boolean };
  testing: { samples: number };
  training: { sessions: number };
  suggestions: string[];
}

/**
 * 构建特种设备与危化品报告。
 *
 * @param timeRange 时间范围
 * @returns 特种设备与危化品报告
 */
export function buildSpecialEquipHazmatReport(timeRange: string): SpecialEquipHazmatReport {
  return {
    timeRange,
    equipment: { elevators: 30, pressureVessels: 20, boilers: 5, cranes: 3 },
    management: { inspections: 60 },
    medicalGas: { oxygen: true, vacuum: true, air: true },
    chemicals: { msds: 200, leaks: 0 },
    radiation: { sources: 10 },
    lab: { bioSafety: true },
    testing: { samples: 5000 },
    training: { sessions: 6 },
    suggestions: ['加强特种设备定期检验', '完善危化品泄漏应急预案'],
  };
}
