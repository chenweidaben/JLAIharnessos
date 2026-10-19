/**
 * 健澜科技 jlmedaios - 病历AI药品相互作用明细审查 V14 聚合器（M565-C，-detail 后缀避让 emrAiDrugInteractionV14）
 *
 * 纯函数：构建 AI 药品相互作用明细审查基础数据 + AI 药品相互作用明细审查 + 构建药品相互作用明细审查报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 药品相互作用明细审查基础数据 */
export interface AiDrugInteractionDetailV14 {
  recordId: string;
  dept: string;
}

/** AI 药品相互作用明细审查输入 */
export interface AiDrugInteractionDetailInputV14 {
  drugA: string;
  drugB: string;
}

/** AI 药品相互作用明细审查结果 */
export interface AiDrugInteractionDetailResultV14 {
  level: string;
  suggestion: string;
}

/** 药品相互作用明细审查报告 */
export interface AiDrugInteractionDetailReportV14 {
  level: string;
  suggestion: string;
}

/**
 * 构建 AI 药品相互作用明细审查基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 药品相互作用明细审查基础数据
 */
export function buildAiDrugInteractionDetail(recordId: string, dept: string): AiDrugInteractionDetailV14 {
  return { recordId, dept };
}

/**
 * AI 药品相互作用明细审查。
 * level = (drugA.includes('华法林') && drugB.includes('阿司匹林')) ? '严重'
 *   : (drugA.includes('奥美拉唑') && drugB.includes('地高辛')) ? '中度'
 *   : '轻微'
 * suggestion = level === '严重' ? '禁止联用，需调整方案'
 *   : level === '中度' ? '监测血药浓度'
 *   : '可联用，注意观察'
 *
 * @param input 药品相互作用明细审查输入（药品A + 药品B）
 * @returns 药品相互作用明细审查结果（level + suggestion）
 */
export function detailDrugInteractionByAi(input: AiDrugInteractionDetailInputV14): AiDrugInteractionDetailResultV14 {
  // 手算：level = (drugA.includes('华法林') && drugB.includes('阿司匹林')) ? '严重'
  //   : (drugA.includes('奥美拉唑') && drugB.includes('地高辛')) ? '中度' : '轻微'
  // 测试2：drugA='华法林钠片'.includes('华法林')=true, drugB='阿司匹林肠溶片'.includes('阿司匹林')=true
  //   → 严重分支 → '严重'
  // 测试3：drugA='维生素C片', drugB='钙片' → 两分支均 false → '轻微'
  const level = (input.drugA.includes("华法林") && input.drugB.includes("阿司匹林"))
    ? "严重"
    : (input.drugA.includes("奥美拉唑") && input.drugB.includes("地高辛"))
      ? "中度"
      : "轻微";
  // 手算：suggestion = level === '严重' ? '禁止联用，需调整方案'
  //   : level === '中度' ? '监测血药浓度' : '可联用，注意观察'
  // 测试2：level='严重' → '禁止联用，需调整方案'
  // 测试3：level='轻微' → '可联用，注意观察'
  const suggestion = level === "严重" ? "禁止联用，需调整方案" : level === "中度" ? "监测血药浓度" : "可联用，注意观察";
  return { level, suggestion };
}

/**
 * 构建药品相互作用明细审查报告。
 *
 * @param result 药品相互作用明细审查结果
 * @returns 药品相互作用明细审查报告（level + suggestion 透传）
 */
export function buildAiDrugInteractionDetailReport(result: AiDrugInteractionDetailResultV14): AiDrugInteractionDetailReportV14 {
  // 手算：透传 level + suggestion
  // 测试4：{level='严重', suggestion='禁止联用，需调整方案'} → 透传
  return { level: result.level, suggestion: result.suggestion };
}
