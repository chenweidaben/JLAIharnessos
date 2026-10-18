/**
 * 健澜科技 jlmedaios - 医生质控个人档案 V14 聚合器（M542-C）
 *
 * 纯函数：构建医生档案基础数据 + 医生档案加载 + 构建档案报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医生档案基础数据 */
export interface QcDoctorProfileV14 {
  doctorId: string;
  doctorName: string;
}

/** 医生档案加载输入 */
export interface QcDoctorProfileInputV14 {
  doctorId: string;
  totalRecords: number;
  defectCount: number;
  avgScore: number;
}

/** 医生档案加载结果 */
export interface QcDoctorProfileResultV14 {
  doctorId: string;
  defectRate: number;
  level: string;
}

/** 档案报告 */
export interface QcDoctorProfileReportV14 {
  doctorId: string;
  defectRate: number;
  level: string;
}

/**
 * 构建医生档案基础数据。
 *
 * @param doctorId 医生ID
 * @param doctorName 医生姓名
 * @returns 医生档案基础数据
 */
export function buildQcDoctorProfile(doctorId: string, doctorName: string): QcDoctorProfileV14 {
  return { doctorId, doctorName };
}

/**
 * 医生档案加载。
 * defectRate = totalRecords>0 ? Math.round(defectCount/totalRecords*1000)/10 : 0
 * level = defectRate<=5 ? '优秀' : defectRate<=15 ? '合格' : '需改进'
 *
 * @param input 加载输入（医生ID + 总病历数 + 缺陷数 + 平均分）
 * @returns 加载结果（doctorId + defectRate + level）
 */
export function loadQcDoctorProfile(input: QcDoctorProfileInputV14): QcDoctorProfileResultV14 {
  // 手算：defectRate = totalRecords>0 ? Math.round(defectCount/totalRecords*1000)/10 : 0
  // 测试2：totalRecords=200, defectCount=8 → 8/200*1000=0.04*1000=40 → Math.round(40)/10=40/10=4.0
  // 测试3：totalRecords=100, defectCount=20 → 20/100*1000=0.2*1000=200 → Math.round(200)/10=200/10=20.0
  const defectRate = input.totalRecords > 0 ? Math.round((input.defectCount / input.totalRecords) * 1000) / 10 : 0;
  // 手算：level = defectRate<=5 ? '优秀' : defectRate<=15 ? '合格' : '需改进'
  // 测试2：defectRate=4.0 → 4.0<=5 → '优秀'
  // 测试3：defectRate=20.0 → 20.0>15 → '需改进'
  const level = defectRate <= 5 ? "优秀" : defectRate <= 15 ? "合格" : "需改进";
  return { doctorId: input.doctorId, defectRate, level };
}

/**
 * 构建档案报告。
 *
 * @param result 加载结果
 * @returns 档案报告（doctorId + defectRate + level 透传）
 */
export function buildQcDoctorProfileReport(result: QcDoctorProfileResultV14): QcDoctorProfileReportV14 {
  // 手算：透传 doctorId + defectRate + level
  // 测试4：{doctorId='D001', defectRate=4.0, level='优秀'} → doctorId='D001', defectRate=4.0, level='优秀'
  return { doctorId: result.doctorId, defectRate: result.defectRate, level: result.level };
}
