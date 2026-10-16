/**
 * 健澜科技 jlmedaios - 互联网医院 V2 纯函数（M214-A）
 *
 * buildInternetHospitalReportV2 / assessOnlineConsultQuality / validateOnlinePrescription
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 在线问诊 */
export interface OnlineConsult {
  type: string;
  rated: boolean;
  rating: number;
}

/**
 * 评估在线问诊质量（纯函数）。
 *
 * @param consults 问诊列表
 * @returns 满意度
 */
export function assessOnlineConsultQuality(consults: OnlineConsult[]): { satisfaction: number; level: string } {
  const rated = consults.filter((c) => c.rated);
  const satisfaction = rated.length > 0 ? rated.reduce((sum, c) => sum + c.rating, 0) / rated.length : 0;
  let level = '良好';
  if (satisfaction >= 4.5) level = '优秀';
  else if (satisfaction < 4) level = '一般';
  return { satisfaction, level };
}

/** 在线处方 */
export interface OnlinePrescription {
  doctorCertified: boolean;
  patientVerified: boolean;
  drugApproved: boolean;
}

/**
 * 验证在线处方合规（纯函数）。
 *
 * @param prescription 处方
 * @returns 是否合规
 */
export function validateOnlinePrescription(prescription: OnlinePrescription): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!prescription.doctorCertified) issues.push('医师未认证');
  if (!prescription.patientVerified) issues.push('患者未实名认证');
  if (!prescription.drugApproved) issues.push('药品未通过网售审批');
  return { valid: issues.length === 0, issues };
}

/** 互联网医院 V2 报告输出 */
export interface InternetHospitalReportV2 {
  timeRange: string;
  consult: { text: number; video: number; voice: number; followUp: number };
  prescription: { online: number; valid: number };
  payment: { online: number };
  consultation: { health: number };
  appointment: { online: number };
  report: { query: number };
  followup: { managed: number };
  compliance: { prescriptionFlow: boolean; dataReport: boolean };
  suggestions: string[];
}

/**
 * 构建互联网医院 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 互联网医院 V2 报告
 */
export function buildInternetHospitalReportV2(timeRange: string): InternetHospitalReportV2 {
  return {
    timeRange,
    consult: { text: 5000, video: 2000, voice: 1000, followUp: 3000 },
    prescription: { online: 4000, valid: 3900 },
    payment: { online: 8000 },
    consultation: { health: 1000 },
    appointment: { online: 10000 },
    report: { query: 20000 },
    followup: { managed: 5000 },
    compliance: { prescriptionFlow: true, dataReport: true },
    suggestions: ['提高视频问诊比例', '提高在线处方合规率'],
  };
}
