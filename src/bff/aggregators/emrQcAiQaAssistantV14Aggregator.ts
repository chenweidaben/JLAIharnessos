/**
 * 健澜科技 jlmedaios - 质控 AI 智能问答助手 V14 聚合器（M508-D，M508 收官）
 *
 * 纯函数：AI 智能问答 + 问答报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 问答结果 */
export interface AiQaAssistantV14 {
  answer: string;
  confidence: number;
}

/** 问答报告 */
export interface AiQaReportV14 {
  question: string;
  answer: string;
  confidence: number;
}

/**
 * AI 智能问答（根据问题关键词返回预设答案和置信度分数）。
 *
 * @param question 问题
 * @returns 问答结果（answer + confidence）
 */
export function askQuestion(question: string): AiQaAssistantV14 {
  // 手算问答：根据问题关键词返回预设答案和置信度分数
  if (question.includes("签名")) {
    return { answer: "病历签名要求：主治医师及以上职称医师签署，电子签名需符合《电子签名法》。", confidence: 92 };
  }
  if (question.includes("缺陷") || question.includes("分级")) {
    return { answer: "缺陷分级标准：致命缺陷(BLOCK)、严重缺陷(MAJOR)、一般缺陷(MINOR)、提示缺陷(INFO)。", confidence: 88 };
  }
  if (question.includes("流程") || question.includes("质控")) {
    return { answer: "质控流程：科室初检→质控科复检→专家评审→整改反馈→归档。", confidence: 85 };
  }
  return { answer: "抱歉，我暂时无法回答该问题，请咨询质控科或参考《病历质量管理规范》。", confidence: 70 };
}

/**
 * 构建问答报告。
 *
 * @param question 问题
 * @param result 问答结果
 * @returns 问答报告（question + answer + confidence）
 */
export function buildQaReport(question: string, result: AiQaAssistantV14): AiQaReportV14 {
  return {
    question,
    answer: result.answer,
    confidence: result.confidence,
  };
}
