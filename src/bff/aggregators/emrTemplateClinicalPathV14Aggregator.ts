/**
 * 健澜科技 jlmedaios - 临床路径模板联动 V14 聚合器（M525-A）
 *
 * 纯函数：构建临床路径联动基础数据 + 临床路径模板联动 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 临床路径联动基础数据 */
export interface ClinicalPathLinkV14 {
  pathName: string;
  templateName: string;
}

/** 联动输入 */
export interface ClinicalPathLinkInputV14 {
  pathSteps: string[];
  requiredTemplates: string[];
  usedTemplates: string[];
}

/** 联动结果 */
export interface ClinicalPathLinkResultV14 {
  matchedCount: number;
  missingCount: number;
  coverage: number;
}

/** 联动报告 */
export interface ClinicalPathLinkReportV14 {
  matchedCount: number;
  coverage: number;
}

/**
 * 构建临床路径联动基础数据。
 *
 * @param pathName 路径名
 * @param templateName 模板名
 * @returns 临床路径联动基础数据
 */
export function buildClinicalPathLink(pathName: string, templateName: string): ClinicalPathLinkV14 {
  return { pathName, templateName };
}

/**
 * 临床路径模板联动。
 * matchedCount = usedTemplates 中同时在 requiredTemplates 的项数；missingCount = requiredTemplates 中不在 usedTemplates 的项数；
 * coverage = Math.round(matchedCount/requiredTemplates.length*1000)/10 保留 1 位小数，分母不能为 0。
 *
 * @param input 联动输入（路径步骤 + 必需模板 + 已用模板）
 * @returns 联动结果（matchedCount + missingCount + coverage）
 */
export function linkClinicalPathTemplate(input: ClinicalPathLinkInputV14): ClinicalPathLinkResultV14 {
  // 手算：matchedCount = usedTemplates 中同时在 requiredTemplates 的项数
  // 测试2：required=['入院记录','手术记录','出院小结'], used=['入院记录','手术记录','出院小结'] → matched=3
  // 测试3：required=['入院记录','手术记录','出院小结'], used=['入院记录'] → matched=1
  const requiredSet = new Set(input.requiredTemplates);
  const usedSet = new Set(input.usedTemplates);
  let matchedCount = 0;
  for (const t of input.usedTemplates) {
    if (requiredSet.has(t)) {
      matchedCount++;
    }
  }
  // 手算：missingCount = requiredTemplates 中不在 usedTemplates 的项数
  // 测试2：missing=0
  // 测试3：missing=['手术记录','出院小结'] → missingCount=2
  let missingCount = 0;
  for (const t of input.requiredTemplates) {
    if (!usedSet.has(t)) {
      missingCount++;
    }
  }
  // 手算：coverage = Math.round(matchedCount/requiredTemplates.length*1000)/10 保留 1 位小数
  // 测试2：3/3*1000 = 1000 → Math.round(1000)/10 = 100.0
  // 测试3：1/3*1000 = 333.333... → Math.round(333.333)/10 = 333/10 = 33.3
  const requiredLength = input.requiredTemplates.length;
  const coverage = requiredLength > 0
    ? Math.round((matchedCount / requiredLength) * 1000) / 10
    : 0;
  return { matchedCount, missingCount, coverage };
}

/**
 * 构建联动报告。
 *
 * @param result 联动结果
 * @returns 联动报告（matchedCount + coverage）
 */
export function buildClinicalPathLinkReport(result: ClinicalPathLinkResultV14): ClinicalPathLinkReportV14 {
  // 手算：透传 matchedCount + coverage
  // 测试4：{matchedCount:1, missingCount:2, coverage:33.3} → matchedCount=1, coverage=33.3
  return { matchedCount: result.matchedCount, coverage: result.coverage };
}
