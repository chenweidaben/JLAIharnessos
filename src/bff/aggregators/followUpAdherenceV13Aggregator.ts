/**
 * 健澜科技 jlmedaios - 出院随访依从性 V13 纯函数（M316-A）
 *
 * computeFollowUpRatesV13 / identifyLostToFollowUpV13 / computeFollowUpAdherenceScoreV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 随访患者 */
export interface FollowUpPatientV13 {
  patientId: string;
  dept: string;
  shouldFollowUp: boolean;
  isFollowedUp: boolean;
}

/** 随访比例结果 */
export interface FollowUpRatesV13 {
  shouldRate: number;
  followedRate: number;
  lostRate: number;
}

/**
 * 随访比例（纯函数）：应随访/已随访/失访比例×100。
 *
 * @param patients 患者列表
 * @returns 比例
 */
export function computeFollowUpRatesV13(patients: FollowUpPatientV13[]): FollowUpRatesV13 {
  const total = patients.length;
  if (total === 0) return { shouldRate: 0, followedRate: 0, lostRate: 0 };
  const should = patients.filter((p) => p.shouldFollowUp).length;
  const followed = patients.filter((p) => p.shouldFollowUp && p.isFollowedUp).length;
  const lost = should - followed;
  return {
    shouldRate: Math.round((should / total) * 100),
    followedRate: Math.round((followed / total) * 100),
    lostRate: Math.round((lost / total) * 100),
  };
}

/**
 * 失访高风险患者列表（纯函数）：应随访未随访。
 *
 * @param patients 患者列表
 * @returns 失访患者 ID 列表
 */
export function identifyLostToFollowUpV13(patients: FollowUpPatientV13[]): string[] {
  return patients.filter((p) => p.shouldFollowUp && !p.isFollowedUp).map((p) => p.patientId);
}

/**
 * 依从性总分（纯函数）：已随访/应随访×100。
 *
 * @param patients 患者列表
 * @returns 依从性百分比
 */
export function computeFollowUpAdherenceScoreV13(patients: FollowUpPatientV13[]): number {
  const should = patients.filter((p) => p.shouldFollowUp).length;
  if (should === 0) return 0;
  const followed = patients.filter((p) => p.shouldFollowUp && p.isFollowedUp).length;
  return Math.round((followed / should) * 100);
}
