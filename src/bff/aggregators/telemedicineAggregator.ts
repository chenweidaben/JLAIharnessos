/**
 * 健澜科技 jlmedaios - 远程医疗深化纯函数（M195-B）
 *
 * buildTelemedicineReport / coordinateTeleconsultation / assessTelemedicineQuality
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 会诊请求 */
export interface TeleconsultRequest {
  requestDept: string;
  expertDept: string;
  priority: 'urgent' | 'routine';
  modal: 'consultation' | 'imaging' | 'pathology' | 'ecg' | 'ultrasound';
}

/** 会诊协调（纯函数）。
 *
 * @param request 会诊请求
 * @returns 协调结果
 */
export function coordinateTeleconsultation(request: TeleconsultRequest): { eta: string; matched: boolean } {
  if (request.priority === 'urgent') return { eta: '2h', matched: true };
  return { eta: '24h', matched: true };
}

/** 诊断数据 */
export interface TelemedicineDiagnosis {
  expectedTurnaroundHours: number;
  actualTurnaroundHours: number;
  accuracy: number;
}

/**
 * 远程医疗质量评估（纯函数）。
 *
 * @param diagnosis 诊断数据
 * @returns 质量等级
 */
export function assessTelemedicineQuality(diagnosis: TelemedicineDiagnosis): 'excellent' | 'good' | 'fair' | 'poor' {
  const timely = diagnosis.actualTurnaroundHours <= diagnosis.expectedTurnaroundHours;
  if (timely && diagnosis.accuracy >= 0.95) return 'excellent';
  if (timely && diagnosis.accuracy >= 0.85) return 'good';
  if (diagnosis.accuracy >= 0.75) return 'fair';
  return 'poor';
}

/** 远程医疗报告输出 */
export interface TelemedicineReport {
  timeRange: string;
  consultation: { inHospital: number; crossHospital: number; crossProvince: number };
  outpatient: { visits: number };
  imaging: { studies: number; turnaround: number };
  pathology: { studies: number; turnaround: number };
  ecg: { studies: number; turnaround: number };
  ultrasound: { studies: number; turnaround: number };
  surgeryGuidance: { cases: number };
  training: { sessions: number; participants: number };
  quality: { averageAccuracy: number; averageTurnaround: number };
  suggestions: string[];
}

/**
 * 构建远程医疗报告。
 *
 * @param timeRange 时间范围
 * @returns 远程医疗报告
 */
export function buildTelemedicineReport(timeRange: string): TelemedicineReport {
  return {
    timeRange,
    consultation: { inHospital: 200, crossHospital: 150, crossProvince: 50 },
    outpatient: { visits: 300 },
    imaging: { studies: 800, turnaround: 2 },
    pathology: { studies: 200, turnaround: 24 },
    ecg: { studies: 500, turnaround: 1 },
    ultrasound: { studies: 400, turnaround: 4 },
    surgeryGuidance: { cases: 20 },
    training: { sessions: 10, participants: 300 },
    quality: { averageAccuracy: 0.92, averageTurnaround: 3 },
    suggestions: ['缩短影像/病理报告 turnaround', '增加跨省远程会诊覆盖'],
  };
}
