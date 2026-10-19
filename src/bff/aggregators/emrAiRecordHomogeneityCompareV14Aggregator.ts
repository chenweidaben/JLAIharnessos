/**
 * 健澜科技 jlmedaios - 病历AI病历同质化对比 V14 聚合器（M553-D，M553 收官）
 *
 * 纯函数：构建 AI 病历同质化对比基础数据 + AI 病历同质化对比 + 构建同质化对比报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 病历同质化对比基础数据 */
export interface AiRecordHomogeneityCompareV14 {
  recordId: string;
  dept: string;
}

/** AI 病历同质化对比输入 */
export interface AiRecordHomogeneityCompareInputV14 {
  deptARecords: number;
  deptBRecords: number;
  avgLengthA: number;
  avgLengthB: number;
}

/** AI 病历同质化对比结果 */
export interface AiRecordHomogeneityCompareResultV14 {
  similarityPct: number;
  level: string;
}

/** 同质化对比报告 */
export interface AiRecordHomogeneityCompareReportV14 {
  similarityPct: number;
  level: string;
}

/**
 * 构建 AI 病历同质化对比基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 病历同质化对比基础数据
 */
export function buildAiRecordHomogeneityCompare(recordId: string, dept: string): AiRecordHomogeneityCompareV14 {
  return { recordId, dept };
}

/**
 * AI 病历同质化对比。
 * similarityPct = Math.round((1 - |avgLengthA - avgLengthB| / Math.max(avgLengthA, avgLengthB)) * 1000) / 10
 * level = similarityPct >= 80 ? '高度同质' : similarityPct >= 60 ? '基本同质' : '差异较大'
 *
 * @param input 同质化对比输入（A科室病历数 + B科室病历数 + A科室平均字数 + B科室平均字数）
 * @returns 同质化对比结果（similarityPct + level）
 */
export function compareRecordHomogeneityByAi(input: AiRecordHomogeneityCompareInputV14): AiRecordHomogeneityCompareResultV14 {
  // 手算：similarityPct = Math.round((1 - |avgLengthA - avgLengthB| / Math.max(avgLengthA, avgLengthB)) * 1000) / 10
  // 测试2：avgLengthA=500, avgLengthB=520
  //   |500-520|/520 = 20/520 = 0.0384615...
  //   1 - 0.0384615 = 0.9615385
  //   Math.round(0.9615385*1000)/10 = Math.round(961.5385)/10 = 962/10 = 96.2
  //   （注：规格原写 96.0，实际公式计算为 96.2，已修正）
  // 测试3：avgLengthA=800, avgLengthB=400
  //   |800-400|/800 = 400/800 = 0.5
  //   1 - 0.5 = 0.5
  //   Math.round(0.5*1000)/10 = Math.round(500)/10 = 500/10 = 50.0
  const similarityPct =
    Math.round((1 - Math.abs(input.avgLengthA - input.avgLengthB) / Math.max(input.avgLengthA, input.avgLengthB)) * 1000) / 10;
  // 手算：level = similarityPct >= 80 ? '高度同质' : similarityPct >= 60 ? '基本同质' : '差异较大'
  // 测试2：similarityPct=96.2 >= 80 → level='高度同质'
  // 测试3：similarityPct=50.0 < 60 → level='差异较大'
  const level = similarityPct >= 80 ? "高度同质" : similarityPct >= 60 ? "基本同质" : "差异较大";
  return { similarityPct, level };
}

/**
 * 构建同质化对比报告。
 *
 * @param result 同质化对比结果
 * @returns 同质化对比报告（similarityPct + level 透传）
 */
export function buildAiRecordHomogeneityCompareReport(result: AiRecordHomogeneityCompareResultV14): AiRecordHomogeneityCompareReportV14 {
  // 手算：透传 similarityPct + level
  // 测试4：{similarityPct=96.2, level='高度同质'} → 透传
  return { similarityPct: result.similarityPct, level: result.level };
}
