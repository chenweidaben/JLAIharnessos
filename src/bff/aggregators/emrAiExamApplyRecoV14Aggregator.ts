/**
 * 健澜科技 jlmedaios - 病历AI检查申请智能推荐 V14 聚合器（M561-A）
 *
 * 纯函数：构建 AI 检查申请智能推荐基础数据 + AI 检查申请智能推荐 + 构建检查申请智能推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 检查申请智能推荐基础数据 */
export interface AiExamApplyRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 检查申请智能推荐输入 */
export interface AiExamApplyRecoInputV14 {
  diagnosis: string;
  symptom: string;
}

/** AI 检查申请智能推荐结果 */
export interface AiExamApplyRecoResultV14 {
  examName: string;
  urgency: string;
}

/** 检查申请智能推荐报告 */
export interface AiExamApplyRecoReportV14 {
  examName: string;
  urgency: string;
}

/**
 * 构建 AI 检查申请智能推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 检查申请智能推荐基础数据
 */
export function buildAiExamApplyReco(recordId: string, dept: string): AiExamApplyRecoV14 {
  return { recordId, dept };
}

/**
 * AI 检查申请智能推荐。
 * examName = diagnosis.includes('心梗') ? '心电图+心肌酶谱'
 *   : symptom.includes('腹痛') ? '腹部B超' : '血常规+胸部X光'
 * urgency = diagnosis.includes('心梗') ? '紧急' : '常规'
 *
 * @param input 检查申请智能推荐输入（诊断 + 症状）
 * @returns 检查申请智能推荐结果（examName + urgency）
 */
export function recommendExamApplyByAi(input: AiExamApplyRecoInputV14): AiExamApplyRecoResultV14 {
  // 手算：examName = diagnosis.includes('心梗') ? '心电图+心肌酶谱'
  //   : symptom.includes('腹痛') ? '腹部B超' : '血常规+胸部X光'
  // 测试2：diagnosis='急性心梗' → includes('心梗')=true → '心电图+心肌酶谱'
  // 测试3：diagnosis='上呼吸道感染', symptom='咳嗽'
  //   → includes('心梗')=false；'咳嗽'.includes('腹痛')=false → '血常规+胸部X光'
  const examName = input.diagnosis.includes("心梗")
    ? "心电图+心肌酶谱"
    : input.symptom.includes("腹痛")
      ? "腹部B超"
      : "血常规+胸部X光";
  // 手算：urgency = diagnosis.includes('心梗') ? '紧急' : '常规'
  // 测试2：diagnosis='急性心梗' → includes('心梗')=true → '紧急'
  // 测试3：diagnosis='上呼吸道感染' → includes('心梗')=false → '常规'
  const urgency = input.diagnosis.includes("心梗") ? "紧急" : "常规";
  return { examName, urgency };
}

/**
 * 构建检查申请智能推荐报告。
 *
 * @param result 检查申请智能推荐结果
 * @returns 检查申请智能推荐报告（examName + urgency 透传）
 */
export function buildAiExamApplyRecoReport(result: AiExamApplyRecoResultV14): AiExamApplyRecoReportV14 {
  // 手算：透传 examName + urgency
  // 测试4：{examName='心电图+心肌酶谱', urgency='紧急'} → 透传
  return { examName: result.examName, urgency: result.urgency };
}
