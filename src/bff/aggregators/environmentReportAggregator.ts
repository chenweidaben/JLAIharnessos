/**
 * 健澜科技 jlmedaios - 环境保护纯函数（M220-B）
 *
 * buildEnvironmentReport / assessWasteCompliance / calculateRadiationDose
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估医废合规（纯函数）。
 *
 * @param waste 医废量（吨）
 * @param regulations 法规数
 * @returns 合规率
 */
export function assessWasteCompliance(waste: number, regulations: number): { compliant: boolean; rate: number } {
  const rate = regulations > 0 ? Math.round((waste / regulations) * 10) / 10 : 0;
  return { compliant: rate >= 0.5, rate };
}

/**
 * 计算辐射剂量（纯函数）。
 *
 * @param dose 实际剂量（mSv）
 * @param limit 限值（mSv）
 * @returns 是否超标
 */
export function calculateRadiationDose(dose: number, limit: number): { exceeded: boolean; ratio: number } {
  const ratio = limit > 0 ? Math.round((dose / limit) * 100) / 100 : 0;
  return { exceeded: dose > limit, ratio };
}

/** 环境保护报告输出 */
export interface EnvironmentReport {
  timeRange: string;
  waste: { medical: number; manifest: boolean };
  sewage: { treated: boolean; discharge: number };
  radiation: { safe: boolean };
  occupational: { needlestick: number };
  infection: { environment: number };
  hazmat: { msds: number };
  energy: { saved: number };
  monitoring: { stations: number };
  suggestions: string[];
}

/**
 * 构建环境保护报告。
 *
 * @param timeRange 时间范围
 * @returns 环境保护报告
 */
export function buildEnvironmentReport(timeRange: string): EnvironmentReport {
  return {
    timeRange,
    waste: { medical: 100, manifest: true },
    sewage: { treated: true, discharge: 5000 },
    radiation: { safe: true },
    occupational: { needlestick: 5 },
    infection: { environment: 30 },
    hazmat: { msds: 50 },
    energy: { saved: 100000 },
    monitoring: { stations: 20 },
    suggestions: ['加强医废联单管理', '推进节能减排'],
  };
}
