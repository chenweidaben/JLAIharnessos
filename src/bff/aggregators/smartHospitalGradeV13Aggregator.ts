/**
 * 健澜科技 jlmedaios - 智慧医院分级 V13 纯函数（M395-A，避让旧版 smartHospitalRatingV13）
 *
 * computeSmartServiceGradeLevelV13 / computeSmartMedicalGradeLevelV13 / computeSmartManagementGradeLevelV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 智慧医院分级等级 */
export interface SmartHospitalGradeLevelV13 {
  level: number;
  score: number;
}

/** 智慧医院分级记录 */
export interface SmartHospitalGradeRecordV13 {
  serviceLevel: number;
  serviceScore: number;
  medicalLevel: number;
  medicalScore: number;
  managementLevel: number;
  managementScore: number;
}

/**
 * 智慧服务分级等级（纯函数）：返回平均等级与平均得分。
 *
 * @param records 智慧医院分级记录列表
 * @returns 智慧服务分级等级 {level, score}
 */
export function computeSmartServiceGradeLevelV13(records: SmartHospitalGradeRecordV13[]): SmartHospitalGradeLevelV13 {
  if (records.length === 0) return { level: 0, score: 0 };
  const avgLevel = Math.round(records.reduce((acc, r) => acc + r.serviceLevel, 0) / records.length);
  const avgScore = Math.round((records.reduce((acc, r) => acc + r.serviceScore, 0) / records.length) * 100) / 100;
  return { level: avgLevel, score: avgScore };
}

/**
 * 智慧医疗分级等级（纯函数）：返回平均等级与平均得分。
 *
 * @param records 智慧医院分级记录列表
 * @returns 智慧医疗分级等级 {level, score}
 */
export function computeSmartMedicalGradeLevelV13(records: SmartHospitalGradeRecordV13[]): SmartHospitalGradeLevelV13 {
  if (records.length === 0) return { level: 0, score: 0 };
  const avgLevel = Math.round(records.reduce((acc, r) => acc + r.medicalLevel, 0) / records.length);
  const avgScore = Math.round((records.reduce((acc, r) => acc + r.medicalScore, 0) / records.length) * 100) / 100;
  return { level: avgLevel, score: avgScore };
}

/**
 * 智慧管理分级等级（纯函数）：返回平均等级与平均得分。
 *
 * @param records 智慧医院分级记录列表
 * @returns 智慧管理分级等级 {level, score}
 */
export function computeSmartManagementGradeLevelV13(records: SmartHospitalGradeRecordV13[]): SmartHospitalGradeLevelV13 {
  if (records.length === 0) return { level: 0, score: 0 };
  const avgLevel = Math.round(records.reduce((acc, r) => acc + r.managementLevel, 0) / records.length);
  const avgScore = Math.round((records.reduce((acc, r) => acc + r.managementScore, 0) / records.length) * 100) / 100;
  return { level: avgLevel, score: avgScore };
}
