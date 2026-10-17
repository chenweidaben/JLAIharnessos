/**
 * 健澜科技 jlmedaios - 抗菌药物管理（细节）V13 纯函数（M414-C，detail 避让旧版 antibioticUseDensityV13）
 *
 * computeSpecialLevelAntibioticConsultationRateV13 / computeAntibioticTherapeuticUseSubmissionRateV13 / computeClassIIncisionProphylacticAntibioticPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 抗菌药物管理（细节）记录 */
export interface AntibioticMgmtDetailRecordV13 {
  consulted: number;
  specialUseTotal: number;
  submitted: number;
  therapeuticTotal: number;
  qualified: number;
  prophylacticTotal: number;
}

/**
 * 特殊使用级抗菌药物会诊率（纯函数）：已会诊例数/特殊使用级抗菌药物使用总数×100，保留 2 位小数。
 *
 * @param records 抗菌药物管理（细节）记录列表
 * @returns 特殊使用级抗菌药物会诊率百分比
 */
export function computeSpecialLevelAntibioticConsultationRateV13(records: AntibioticMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.specialUseTotal, 0);
  if (total === 0) return 0;
  const consulted = records.reduce((acc, r) => acc + r.consulted, 0);
  return Math.round((consulted / total) * 10000) / 100;
}

/**
 * 抗菌药物治疗性使用送检率（纯函数）：已送检例数/治疗性使用总数×100，保留 2 位小数。
 *
 * @param records 抗菌药物管理（细节）记录列表
 * @returns 抗菌药物治疗性使用送检率百分比
 */
export function computeAntibioticTherapeuticUseSubmissionRateV13(records: AntibioticMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.therapeuticTotal, 0);
  if (total === 0) return 0;
  const submitted = records.reduce((acc, r) => acc + r.submitted, 0);
  return Math.round((submitted / total) * 10000) / 100;
}

/**
 * Ⅰ类切口预防使用抗菌药物合格率（纯函数）：合格例数/Ⅰ类切口预防用药总数×100，保留 2 位小数。
 *
 * @param records 抗菌药物管理（细节）记录列表
 * @returns Ⅰ类切口预防使用抗菌药物合格率百分比
 */
export function computeClassIIncisionProphylacticAntibioticPassRateV13(records: AntibioticMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.prophylacticTotal, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}
