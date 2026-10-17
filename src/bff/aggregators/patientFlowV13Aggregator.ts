/**
 * 健澜科技 jlmedaios - 患者流量 V13 纯函数（M364-C）
 *
 * computeOutpatientEmergencyVisitsV13 / computeDischargedPatientsV13 / computeSurgeryCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者流量记录 */
export interface PatientFlowRecordV13 {
  outpatientEmergencyVisits: number;
  dischargedPatients: number;
  surgeryCount: number;
}

/**
 * 门急诊人次（纯函数）：求和。
 *
 * @param records 患者流量记录列表
 * @returns 门急诊人次
 */
export function computeOutpatientEmergencyVisitsV13(records: PatientFlowRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.outpatientEmergencyVisits, 0);
}

/**
 * 出院人数（纯函数）：求和。
 *
 * @param records 患者流量记录列表
 * @returns 出院人数
 */
export function computeDischargedPatientsV13(records: PatientFlowRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.dischargedPatients, 0);
}

/**
 * 手术人数（纯函数）：求和。
 *
 * @param records 患者流量记录列表
 * @returns 手术人数
 */
export function computeSurgeryCountV13(records: PatientFlowRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.surgeryCount, 0);
}
