/**
 * 健澜科技 jlmedaios - 患者就诊 360° 全视图 V14 聚合器（M465-C）
 *
 * 纯函数：按时间升序排序 + 就诊史聚合统计。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者事件类型 */
export type PatientEventTypeV14 = "visit" | "medication" | "lab" | "imaging" | "diagnosis";

/** 患者事件 */
export interface PatientEventV14 {
  id: string;
  type: PatientEventTypeV14;
  title: string;
  eventTime: string;
}

/** 就诊记录 */
export interface VisitRecordV14 {
  visitId: string;
  dept: string;
  admissionDate: string;
  dischargeDate?: string;
}

/** 就诊史聚合结果 */
export interface VisitHistoryAggregateV14 {
  totalVisits: number;
  latestAdmission?: string;
  departments: string[];
}

/**
 * 按事件时间升序排序。
 *
 * @param events 患者事件列表
 * @returns 排序后的事件列表
 */
export function buildPatientTimeline(events: PatientEventV14[]): PatientEventV14[] {
  return [...events].sort((a, b) => a.eventTime.localeCompare(b.eventTime));
}

/**
 * 聚合就诊史：总就诊次数、最近入院时间、就诊科室去重列表。
 *
 * @param visits 就诊记录列表
 * @returns 聚合结果
 */
export function aggregateVisitHistory(visits: VisitRecordV14[]): VisitHistoryAggregateV14 {
  const totalVisits = visits.length;
  let latestAdmission: string | undefined;
  const deptSet = new Set<string>();
  for (const visit of visits) {
    deptSet.add(visit.dept);
    if (!latestAdmission || visit.admissionDate > latestAdmission) {
      latestAdmission = visit.admissionDate;
    }
  }
  return { totalVisits, latestAdmission, departments: Array.from(deptSet) };
}
