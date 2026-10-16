/**
 * 健澜科技 jlmedaios - 互联网医院深化纯函数 V2（M195-A）
 *
 * buildInternetHospitalReportV2 / classifyOnlineConsultation / predictInternetHospitalTrend
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 患者数据 */
export interface OnlinePatient {
  hasPreviousDiagnosis: boolean;
  isChronicDisease: boolean;
  symptomDuration: number;
}

/** 在线问诊分类（纯函数）。
 *
 * @param patient 患者数据
 * @returns 类型：复诊/初诊/慢病管理
 */
export function classifyOnlineConsultation(patient: OnlinePatient): 'followup' | 'first_visit' | 'chronic_management' {
  if (patient.isChronicDisease) return 'chronic_management';
  if (patient.hasPreviousDiagnosis && patient.symptomDuration > 7) return 'followup';
  return 'first_visit';
}

/** 趋势数据 */
export interface TrendData {
  mau: number;
  growthRate: number;
}

/**
 * 互联网医院趋势预测（纯函数）。
 *
 * @param data 趋势数据
 * @returns 预测结果
 */
export function predictInternetHospitalTrend(data: TrendData): { nextMonthMAU: number; growth: string } {
  const nextMonthMAU = Math.round(data.mau * (1 + data.growthRate));
  const growth = data.growthRate > 0.1 ? 'high' : data.growthRate > 0.05 ? 'medium' : 'low';
  return { nextMonthMAU, growth };
}

/** 互联网医院报告输出 */
export interface InternetHospitalReportV2 {
  timeRange: string;
  consultation: { text: number; video: number; phone: number; satisfaction: number };
  prescription: { issued: number; compliance: number };
  payment: { onlinePaid: number; onlineRate: number };
  appointment: { onlineBooked: number };
  reportQuery: { onlineViewed: number };
  healthManagement: { patients: number };
  compliance: { followupRate: number; firstVisitBanned: boolean; prescriptionCompliance: number };
  operations: { mau: number; repurchaseRate: number; retentionRate: number; conversionRate: number };
  suggestions: string[];
}

/**
 * 构建互联网医院报告。
 *
 * @param timeRange 时间范围
 * @returns 互联网医院报告
 */
export function buildInternetHospitalReportV2(timeRange: string): InternetHospitalReportV2 {
  return {
    timeRange,
    consultation: { text: 1500, video: 800, phone: 300, satisfaction: 0.92 },
    prescription: { issued: 2000, compliance: 0.95 },
    payment: { onlinePaid: 3000, onlineRate: 0.75 },
    appointment: { onlineBooked: 2500 },
    reportQuery: { onlineViewed: 4000 },
    healthManagement: { patients: 1500 },
    compliance: { followupRate: 0.85, firstVisitBanned: true, prescriptionCompliance: 0.96 },
    operations: { mau: 50000, repurchaseRate: 0.6, retentionRate: 0.7, conversionRate: 0.15 },
    suggestions: ['提升视频问诊比例', '加强在线处方合规管理'],
  };
}
