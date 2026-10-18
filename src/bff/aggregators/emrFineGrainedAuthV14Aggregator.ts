/**
 * 健澜科技 jlmedaios - 病历权限细粒度控制 V14 聚合器（M528-D，M528 收官）
 *
 * 纯函数：构建细粒度权限基础数据 + 字段级权限检查 + 构建权限报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 细粒度权限基础数据 */
export interface FineGrainedAuthV14 {
  role: string;
  dept: string;
}

/** 字段级权限检查输入 */
export interface FineGrainedAuthInputV14 {
  role: string;
  allowedFields: string[];
  requestedFields: string[];
}

/** 字段级权限检查结果 */
export interface FineGrainedAuthResultV14 {
  granted: boolean;
  deniedFields: string[];
}

/** 权限报告 */
export interface FineGrainedAuthReportV14 {
  granted: boolean;
  deniedCount: number;
}

/**
 * 构建细粒度权限基础数据。
 *
 * @param role 角色
 * @param dept 科室
 * @returns 细粒度权限基础数据
 */
export function buildFineGrainedAuth(role: string, dept: string): FineGrainedAuthV14 {
  return { role, dept };
}

/**
 * 字段级权限检查。
 * granted = requestedFields 全部在 allowedFields 中；
 * deniedFields = requestedFields 中不在 allowedFields 的项。
 *
 * @param input 权限检查输入（角色 + 允许字段列表 + 请求字段列表）
 * @returns 检查结果（granted + deniedFields）
 */
export function checkFieldLevelPermission(input: FineGrainedAuthInputV14): FineGrainedAuthResultV14 {
  // 手算：deniedFields = requestedFields 中不在 allowedFields 的项
  // 测试2：requestedFields=['姓名','诊断'], allowedFields=['姓名','诊断','用药'] → deniedFields=[]
  // 测试3：requestedFields=['姓名','身份证号'], allowedFields=['姓名','诊断','用药'] → deniedFields=['身份证号']
  const deniedFields = input.requestedFields.filter((f) => !input.allowedFields.includes(f));
  // 手算：granted = deniedFields.length === 0
  // 测试2：deniedFields=[] → granted=true
  // 测试3：deniedFields=['身份证号'] → granted=false
  const granted = deniedFields.length === 0;
  return { granted, deniedFields };
}

/**
 * 构建权限报告。
 *
 * @param result 权限检查结果（granted + deniedCount）
 * @returns 权限报告（granted + deniedCount 透传）
 */
export function buildFineGrainedAuthReport(result: { granted: boolean; deniedCount: number }): FineGrainedAuthReportV14 {
  // 手算：透传 granted + deniedCount
  // 测试4：{granted:false, deniedCount:1} → granted=false, deniedCount=1
  return { granted: result.granted, deniedCount: result.deniedCount };
}
