/**
 * 健澜科技 jlmedaios - 院感控制（细节）V13 纯函数（M418-C，detail 避让旧版 handHygieneCompliance/ICUInfectionRate/infectionReportMgmt 等院感系列）
 *
 * computeHandHygieneComplianceRateV13 / computeEnvironmentalSurfaceSamplingPassRateV13 / computeMedicalWasteDisposalPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 院感控制（细节）记录 */
export interface InfectionControlDetailRecordV13 {
  compliant: number;
  shouldExecuteTotal: number;
  sampleQualified: number;
  sampleTotal: number;
  disposalCompliant: number;
  disposalTotal: number;
}

/**
 * 手卫生依从率（纯函数）：依从次数/应执行次数×100，保留 2 位小数。
 *
 * @param records 院感控制（细节）记录列表
 * @returns 手卫生依从率百分比
 */
export function computeHandHygieneComplianceRateV13(records: InfectionControlDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldExecuteTotal, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliant, 0);
  return Math.round((compliant / total) * 10000) / 100;
}

/**
 * 环境物表采样合格率（纯函数）：合格样本数/采样总数×100，保留 2 位小数。
 *
 * @param records 院感控制（细节）记录列表
 * @returns 环境物表采样合格率百分比
 */
export function computeEnvironmentalSurfaceSamplingPassRateV13(records: InfectionControlDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.sampleTotal, 0);
  if (total === 0) return 0;
  const sampleQualified = records.reduce((acc, r) => acc + r.sampleQualified, 0);
  return Math.round((sampleQualified / total) * 10000) / 100;
}

/**
 * 医疗废物处置合格率（纯函数）：合规处置次数/处置总次数×100，保留 2 位小数。
 *
 * @param records 院感控制（细节）记录列表
 * @returns 医疗废物处置合格率百分比
 */
export function computeMedicalWasteDisposalPassRateV13(records: InfectionControlDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.disposalTotal, 0);
  if (total === 0) return 0;
  const disposalCompliant = records.reduce((acc, r) => acc + r.disposalCompliant, 0);
  return Math.round((disposalCompliant / total) * 10000) / 100;
}
