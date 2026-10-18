/**
 * 健澜科技 jlmedaios - 模板医生个人偏好 V14 聚合器（M524-C）
 *
 * 纯函数：构建医生偏好基础数据 + 获取医生偏好 + 构建偏好报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医生偏好基础数据 */
export interface DoctorPrefV14 {
  doctorName: string;
  dept: string;
}

/** 偏好输入 */
export interface DoctorPrefInputV14 {
  doctorName: string;
  frequentTemplates: string[];
  defaultTemplate: string;
}

/** 偏好结果 */
export interface DoctorPrefResultV14 {
  favoriteCount: number;
  hasDefault: boolean;
}

/** 偏好报告 */
export interface DoctorPrefReportV14 {
  favoriteCount: number;
  defaultHint: string;
}

/**
 * 构建医生偏好基础数据。
 *
 * @param doctorName 医生姓名
 * @param dept 科室
 * @returns 医生偏好基础数据
 */
export function buildDoctorPref(doctorName: string, dept: string): DoctorPrefV14 {
  return { doctorName, dept };
}

/**
 * 获取医生偏好。
 * favoriteCount = frequentTemplates.length；hasDefault = defaultTemplate !== ''。
 *
 * @param input 偏好输入（医生姓名 + 常用模板列表 + 默认模板）
 * @returns 偏好结果（favoriteCount + hasDefault）
 */
export function getDoctorPreference(input: DoctorPrefInputV14): DoctorPrefResultV14 {
  // 手算：favoriteCount = frequentTemplates.length
  // 测试2：frequentTemplates=['入院记录模板','出院小结模板'] → favoriteCount=2
  // 测试3：frequentTemplates=['手术记录模板'] → favoriteCount=1
  const favoriteCount = input.frequentTemplates.length;
  // 手算：hasDefault = defaultTemplate !== ''
  // 测试2：defaultTemplate='入院记录模板'非空 → hasDefault=true
  // 测试3：defaultTemplate=''空字符串 → hasDefault=false
  const hasDefault = input.defaultTemplate.trim().length > 0;
  return { favoriteCount, hasDefault };
}

/**
 * 构建偏好报告。
 * hasDefault=true → defaultHint='已设置默认模板'；否则 defaultHint='未设置默认模板'。
 *
 * @param result 偏好结果
 * @returns 偏好报告（favoriteCount + defaultHint）
 */
export function buildDoctorPrefReport(result: DoctorPrefResultV14): DoctorPrefReportV14 {
  // 手算：hasDefault=true → defaultHint='已设置默认模板'
  // 测试4：hasDefault=true → defaultHint='已设置默认模板'
  const defaultHint = result.hasDefault ? "已设置默认模板" : "未设置默认模板";
  return { favoriteCount: result.favoriteCount, defaultHint };
}
