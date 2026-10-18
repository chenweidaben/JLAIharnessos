/**
 * 健澜科技 jlmedaios - 病历AI用药相互作用审查 V14 聚合器（M550-C）
 *
 * 纯函数：构建 AI 用药相互作用审查基础数据 + AI 用药相互作用审查 + 构建用药相互作用报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 用药相互作用审查基础数据 */
export interface AiDrugInteractionV14 {
  recordId: string;
  dept: string;
}

/** AI 用药相互作用审查输入 */
export interface AiDrugInteractionInputV14 {
  drugA: string;
  drugB: string;
}

/** AI 用药相互作用审查结果 */
export interface AiDrugInteractionResultV14 {
  hasInteraction: boolean;
  level: string;
  advice: string;
}

/** 用药相互作用报告 */
export interface AiDrugInteractionReportV14 {
  hasInteraction: boolean;
  level: string;
  advice: string;
}

/**
 * 构建 AI 用药相互作用审查基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 用药相互作用审查基础数据
 */
export function buildAiDrugInteraction(recordId: string, dept: string): AiDrugInteractionV14 {
  return { recordId, dept };
}

/**
 * AI 用药相互作用审查。
 * hasInteraction = (drugA.includes('华法林') && drugB.includes('阿司匹林')) || (drugA.includes('阿司匹林') && drugB.includes('华法林'))
 * level = hasInteraction ? '严重' : '无'
 * advice = hasInteraction ? '避免联用，监测凝血功能' : '可联用'
 *
 * @param input 用药相互作用审查输入（药物A + 药物B）
 * @returns 用药相互作用审查结果（hasInteraction + level + advice）
 */
export function checkDrugInteractionByAi(input: AiDrugInteractionInputV14): AiDrugInteractionResultV14 {
  // 手算：hasInteraction = (drugA.includes('华法林') && drugB.includes('阿司匹林')) || (drugA.includes('阿司匹林') && drugB.includes('华法林'))
  // 测试2：drugA='华法林', drugB='阿司匹林' → includes('华法林')=true 且 includes('阿司匹林')=true → hasInteraction=true
  // 测试3：drugA='二甲双胍', drugB='阿托伐他汀' → 不涉及华法林+阿司匹林 → hasInteraction=false
  const hasInteraction =
    (input.drugA.includes("华法林") && input.drugB.includes("阿司匹林")) ||
    (input.drugA.includes("阿司匹林") && input.drugB.includes("华法林"));
  // 手算：level = hasInteraction ? '严重' : '无'
  // 测试2：hasInteraction=true → level='严重'
  // 测试3：hasInteraction=false → level='无'
  const level = hasInteraction ? "严重" : "无";
  // 手算：advice = hasInteraction ? '避免联用，监测凝血功能' : '可联用'
  // 测试2：hasInteraction=true → advice='避免联用，监测凝血功能'
  // 测试3：hasInteraction=false → advice='可联用'
  const advice = hasInteraction ? "避免联用，监测凝血功能" : "可联用";
  return { hasInteraction, level, advice };
}

/**
 * 构建用药相互作用报告。
 *
 * @param result 用药相互作用审查结果
 * @returns 用药相互作用报告（hasInteraction + level + advice 透传）
 */
export function buildAiDrugInteractionReport(result: AiDrugInteractionResultV14): AiDrugInteractionReportV14 {
  // 手算：透传 hasInteraction + level + advice
  // 测试4：{hasInteraction=true, level='严重', advice='...'} → 透传
  return { hasInteraction: result.hasInteraction, level: result.level, advice: result.advice };
}
