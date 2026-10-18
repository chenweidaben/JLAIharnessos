/**
 * 健澜科技 jlmedaios - 病历 NLP 时间关系提取 V14 聚合器（M531-C）
 *
 * 纯函数：构建时间关系提取基础数据 + 时间关系提取 + 构建时间关系报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 时间关系提取基础数据 */
export interface NlpTimeRelationV14 {
  recordId: string;
  dept: string;
}

/** 时间关系提取输入 */
export interface NlpTimeRelationInputV14 {
  eventA: string;
  eventB: string;
  relationType: "之前" | "之后" | "同时";
}

/** 时间关系提取结果 */
export interface NlpTimeRelationResultV14 {
  relation: string;
  daysDiff: number;
}

/** 时间关系提取报告 */
export interface NlpTimeRelationReportV14 {
  relation: string;
  daysDiff: number;
}

/**
 * 构建时间关系提取基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 时间关系提取基础数据
 */
export function buildNlpTimeRelation(recordId: string, dept: string): NlpTimeRelationV14 {
  return { recordId, dept };
}

/**
 * 时间关系提取。
 * relation = relationType；daysDiff = relationType === '同时' ? 0 : 1。
 *
 * @param input 提取输入（事件A + 事件B + 关系类型）
 * @returns 提取结果（relation + daysDiff）
 */
export function extractTimeRelation(input: NlpTimeRelationInputV14): NlpTimeRelationResultV14 {
  // 手算：relation = relationType
  // 测试2：relationType='之前' → relation='之前'
  // 测试3：relationType='同时' → relation='同时'
  const relation = input.relationType;
  // 手算：daysDiff = relationType === '同时' ? 0 : 1
  // 测试2：relationType='之前' ≠ '同时' → daysDiff=1
  // 测试3：relationType='同时' → daysDiff=0
  const daysDiff = input.relationType === "同时" ? 0 : 1;
  return { relation, daysDiff };
}

/**
 * 构建时间关系报告。
 *
 * @param result 提取结果
 * @returns 时间关系报告（relation + daysDiff 透传）
 */
export function buildNlpTimeRelationReport(result: NlpTimeRelationResultV14): NlpTimeRelationReportV14 {
  // 手算：透传 relation + daysDiff
  // 测试4：{relation:'之前', daysDiff:1} → relation='之前', daysDiff=1
  return { relation: result.relation, daysDiff: result.daysDiff };
}
