/**
 * 健澜科技 jlmedaios - 院感控制 V3 纯函数（M256-B）
 *
 * buildInfectionControlV3Report / calculateInfectionRateV3 / assessMRSAControlV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算感染率 V3（纯函数）。
 *
 * @param cases 感染例数
 * @param patientDays 住院床日
 * @returns 感染率
 */
export function calculateInfectionRateV3(cases: number, patientDays: number): { rate: number; perThousand: number; adequate: boolean } {
  const rate = Math.round((cases / Math.max(patientDays, 1)) * 10000) / 100;
  const perThousand = Math.round((cases / Math.max(patientDays, 1)) * 1000);
  return { rate, perThousand, adequate: perThousand <= 5 };
}

/**
 * 评估 MRSA 防控 V3（纯函数）。
 *
 * @param mdros 多重耐药菌
 * @param isolation 隔离
 * @returns 防控
 */
export function assessMRSAControlV3(mdros: { mrsa: number; vre: number; cre: number; crab: number }, isolation: number): { total: number; isolationRate: number; adequate: boolean } {
  const total = mdros.mrsa + mdros.vre + mdros.cre + mdros.crab;
  const isolationRate = Math.round((isolation / Math.max(total, 1)) * 100);
  return { total, isolationRate, adequate: isolationRate >= 95 };
}

/** 院感控制 V3 报告输出 */
export interface InfectionControlV3Report {
  timeRange: string;
  handHygiene: { compliance: number; correctness: number; facility: number; education: number; atp: number };
  target: { icu: number; nicu: number; or: number; hd: number; rate: number; perPatientDays: number };
  mdro: { mrsa: number; vre: number; cre: number; crab: number; contactIsolation: number; environment: number; screening: number };
  antibiotic: { ddd: number; use: number; intensity: number; sendRate: number; specialTier: number; consult: number; ams: number };
  ssi: { monitor: number; preventionBundle: number; preop: number; postop: number; followup: number; rate: number };
  catheter: { clabsi: number; cauti: number; vap: number; bundles: number; lineRate: number; perThousand: number };
  environment: { air: number; surface: number; handDisinfectant: number; uv: number; cleanRoom: number; microbe: number };
  outbreak: { identification: number; epidemiology: number; control: number; report: number; review: number; clusterAlert: number };
  suggestions: string[];
}

/**
 * 构建院感控制 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 院感控制 V3 报告
 */
export function buildInfectionControlV3Report(timeRange: string): InfectionControlV3Report {
  return {
    timeRange,
    handHygiene: { compliance: 95, correctness: 90, facility: 100, education: 100, atp: 95 },
    target: { icu: 10, nicu: 5, or: 2, hd: 3, rate: 2.5, perPatientDays: 2.5 },
    mdro: { mrsa: 50, vre: 30, cre: 20, crab: 40, contactIsolation: 135, environment: 100, screening: 200 },
    antibiotic: { ddd: 40, use: 30, intensity: 40, sendRate: 80, specialTier: 10, consult: 50, ams: 90 },
    ssi: { monitor: 5000, preventionBundle: 95, preop: 100, postop: 90, followup: 85, rate: 1.5 },
    catheter: { clabsi: 5, cauti: 8, vap: 3, bundles: 95, lineRate: 2, perThousand: 3 },
    environment: { air: 100, surface: 200, handDisinfectant: 1000, uv: 50, cleanRoom: 20, microbe: 100 },
    outbreak: { identification: 2, epidemiology: 2, control: 2, report: 2, review: 2, clusterAlert: 1 },
    suggestions: ["降低导管相关感染", "提升手卫生依从性"],
  };
}
