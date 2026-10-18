/**
 * 健澜科技 jlmedaios - 医德医风质量管理 V13 纯函数（M438-A，行风廉洁与职业道德建设组）
 *
 * computeMedicalEthicsEvaluationPassRateV13 / computeMedicalEthicsPatientSatisfactionRateV13 / computeMedicalEthicsComplaintResolutionTimelinessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医德医风质量管理记录 */
export interface MedicalEthicsQualityMgmtRecordV13 {
  qualifiedEvaluation: number;
  totalEvaluation: number;
  satisfiedPatients: number;
  surveyedPatients: number;
  timelyResolved: number;
  totalComplaints: number;
}

/**
 * 医德考评合格率（纯函数）：合格考评人数/考评总人数×100，保留 2 位小数。
 *
 * @param records 医德医风质量管理记录列表
 * @returns 医德考评合格率百分比
 */
export function computeMedicalEthicsEvaluationPassRateV13(records: MedicalEthicsQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalEvaluation, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedEvaluation, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 患者满意度（纯函数）：满意患者数/调查患者总数×100，保留 2 位小数。
 *
 * @param records 医德医风质量管理记录列表
 * @returns 患者满意度百分比
 */
export function computeMedicalEthicsPatientSatisfactionRateV13(records: MedicalEthicsQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surveyedPatients, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.satisfiedPatients, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}

/**
 * 投诉处理及时率（纯函数）：及时处理投诉数/投诉总数×100，保留 2 位小数。
 *
 * @param records 医德医风质量管理记录列表
 * @returns 投诉处理及时率百分比
 */
export function computeMedicalEthicsComplaintResolutionTimelinessRateV13(records: MedicalEthicsQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalComplaints, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyResolved, 0);
  return Math.round((timely / total) * 10000) / 100;
}
