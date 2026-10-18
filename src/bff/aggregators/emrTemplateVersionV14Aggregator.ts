/**
 * 健澜科技 jlmedaios - 病历模板版本管理 V14 聚合器（M539-D）
 *
 * 纯函数：构建模板版本基础数据 + 版本列表 + 构建版本报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 模板版本基础数据 */
export interface TemplateVersionV14 {
  templateName: string;
  dept: string;
}

/** 版本项 */
export interface TemplateVersionItemV14 {
  version: string;
  updatedAt: string;
}

/** 版本列表输入 */
export interface TemplateVersionInputV14 {
  versions: TemplateVersionItemV14[];
}

/** 版本列表结果 */
export interface TemplateVersionResultV14 {
  versionCount: number;
  latestVersion: string;
}

/** 版本报告 */
export interface TemplateVersionReportV14 {
  versionCount: number;
  latestVersion: string;
}

/**
 * 构建模板版本基础数据。
 *
 * @param templateName 模板名
 * @param dept 科室
 * @returns 模板版本基础数据
 */
export function buildTemplateVersion(templateName: string, dept: string): TemplateVersionV14 {
  return { templateName, dept };
}

/**
 * 版本列表。
 * versionCount = versions.length
 * latestVersion = versions.length > 0 ? versions[0].version : '无版本'
 *
 * @param input 列表输入（版本数组）
 * @returns 列表结果（versionCount + latestVersion）
 */
export function listTemplateVersion(input: TemplateVersionInputV14): TemplateVersionResultV14 {
  // 手算：versionCount = versions.length
  // 测试2：versions=[v2.0, v1.0] → versionCount=2
  // 测试3：versions=[] → versionCount=0
  const versionCount = input.versions.length;
  // 手算：latestVersion = versions.length > 0 ? versions[0].version : '无版本'
  // 测试2：versions[0].version='v2.0' → latestVersion='v2.0'
  // 测试3：versions=[] → latestVersion='无版本'
  const latestVersion = input.versions.length > 0 ? input.versions[0]?.version ?? "无版本" : "无版本";
  return { versionCount, latestVersion };
}

/**
 * 构建版本报告。
 *
 * @param result 列表结果
 * @returns 版本报告（versionCount + latestVersion 透传）
 */
export function buildTemplateVersionReport(result: TemplateVersionResultV14): TemplateVersionReportV14 {
  // 手算：透传 versionCount + latestVersion
  // 测试4：{versionCount=2, latestVersion='v2.0'} → versionCount=2, latestVersion='v2.0'
  return { versionCount: result.versionCount, latestVersion: result.latestVersion };
}
