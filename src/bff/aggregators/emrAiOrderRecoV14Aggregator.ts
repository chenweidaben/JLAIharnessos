/**
 * 健澜科技 jlmedaios - 病历AI医嘱推荐 V14 聚合器（M546-B）
 *
 * 纯函数：构建 AI 医嘱推荐基础数据 + AI 医嘱推荐 + 构建医嘱报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 医嘱推荐基础数据 */
export interface AiOrderRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 医嘱推荐输入 */
export interface AiOrderRecoInputV14 {
  diagnosis: string;
}

/** AI 医嘱推荐结果 */
export interface AiOrderRecoResultV14 {
  orders: string[];
  count: number;
}

/** 医嘱报告 */
export interface AiOrderRecoReportV14 {
  orders: string[];
  count: number;
}

/**
 * 构建 AI 医嘱推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 医嘱推荐基础数据
 */
export function buildAiOrderReco(recordId: string, dept: string): AiOrderRecoV14 {
  return { recordId, dept };
}

/**
 * AI 医嘱推荐。
 * orders = diagnosis.includes('心梗') ? ['阿司匹林100mg qd','他汀20mg qn','硝酸甘油0.5mg prn'] : ['对症治疗医嘱']
 * count = orders.length
 *
 * @param input 医嘱推荐输入（诊断）
 * @returns 医嘱推荐结果（orders + count）
 */
export function recommendOrderByAi(input: AiOrderRecoInputV14): AiOrderRecoResultV14 {
  // 手算：orders = diagnosis.includes('心梗') ? ['阿司匹林100mg qd','他汀20mg qn','硝酸甘油0.5mg prn'] : ['对症治疗医嘱']
  // 测试2：diagnosis='急性心梗' → 含'心梗' → orders=['阿司匹林100mg qd','他汀20mg qn','硝酸甘油0.5mg prn']
  // 测试3：diagnosis='上感' → 不含'心梗' → orders=['对症治疗医嘱']
  const orders = input.diagnosis.includes("心梗")
    ? ["阿司匹林100mg qd", "他汀20mg qn", "硝酸甘油0.5mg prn"]
    : ["对症治疗医嘱"];
  // 手算：count = orders.length
  // 测试2：orders.length = 3
  // 测试3：orders.length = 1
  const count = orders.length;
  return { orders, count };
}

/**
 * 构建医嘱报告。
 *
 * @param result 医嘱推荐结果
 * @returns 医嘱报告（orders + count 透传）
 */
export function buildAiOrderRecoReport(result: AiOrderRecoResultV14): AiOrderRecoReportV14 {
  // 手算：透传 orders + count
  // 测试4：{orders=[3条], count=3} → 透传
  return { orders: result.orders, count: result.count };
}
