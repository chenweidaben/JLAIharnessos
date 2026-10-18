/**
 * 健澜科技 jlmedaios - 病历缺陷自动分发 V14 聚合器（M521-C）
 *
 * 纯函数：构建缺陷分发基础数据 + 自动分发 + 构建分发报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 缺陷分发基础数据 */
export interface DefectAutoRouteV14 {
  defectId: string;
  dept: string;
  defectType: string;
}

/** 处理人 */
export interface DefectHandlerV14 {
  type: string;
  handler: string;
}

/** 分发结果 */
export interface DefectRouteResultV14 {
  routedTo: string;
  matched: boolean;
}

/** 分发报告 */
export interface DefectRouteReportV14 {
  routedTo: string;
  matched: boolean;
}

/**
 * 构建缺陷分发基础数据。
 *
 * @param defectId 缺陷ID
 * @param dept 科室
 * @param defectType 缺陷类型
 * @returns 缺陷分发基础数据
 */
export function buildDefectAutoRoute(defectId: string, dept: string, defectType: string): DefectAutoRouteV14 {
  return { defectId, dept, defectType };
}

/**
 * 自动分发。
 * handlers 中 type 匹配 defect.defectType 即 routedTo=handler.handler, matched=true；无匹配→routedTo='质控办', matched=false。
 *
 * @param defect 缺陷分发基础数据
 * @param handlers 处理人列表
 * @returns 分发结果（routedTo + matched）
 */
export function routeDefect(defect: DefectAutoRouteV14, handlers: DefectHandlerV14[]): DefectRouteResultV14 {
  // 手算检查：handlers 中 type 匹配 defect.defectType 即 routedTo=handler.handler
  for (const h of handlers) {
    if (h.type === defect.defectType) {
      return { routedTo: h.handler, matched: true };
    }
  }
  // 手算：无匹配→routedTo='质控办', matched=false
  return { routedTo: "质控办", matched: false };
}

/**
 * 构建分发报告。
 *
 * @param result 分发结果
 * @returns 分发报告（routedTo + matched）
 */
export function buildDefectAutoRouteReport(result: DefectRouteResultV14): DefectRouteReportV14 {
  return { routedTo: result.routedTo, matched: result.matched };
}
