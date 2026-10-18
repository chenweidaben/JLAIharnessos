/**
 * 健澜科技 jlmedaios - 质控 AI 知识问答 V14 聚合器（M499-D）
 *
 * 纯函数：AI 知识问答 + 问答报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 问答结果 */
export interface QaResultV14 {
  answer: string;
  source: string;
}

/** 问答报告 */
export interface QaReportV14 {
  question: string;
  answer: string;
  source: string;
}

/**
 * AI 知识问答（按关键词匹配返回预设答案）。
 *
 * @param question 用户问题
 * @returns 问答结果（answer + source）
 */
export function answerQuestion(question: string): QaResultV14 {
  // 手算问答逻辑：按问题关键词匹配返回预设答案
  if (question.includes("甲级病历")) {
    return {
      answer: "甲级病历是指评分≥90分的病历，代表书写质量优秀。",
      source: "病历书写规范",
    };
  }
  if (question.includes("时限")) {
    return {
      answer: "病历书写时限要求：入院病历应在24小时内完成，首次病程记录应在8小时内完成。",
      source: "病历书写规范",
    };
  }
  if (question.includes("扣分")) {
    return {
      answer: "质控扣分标准：缺主诉扣5分，缺现病史扣10分，超时限扣15分。",
      source: "病历质控标准",
    };
  }
  return {
    answer: "抱歉，暂未找到相关答案。请尝试其他问题。",
    source: "知识库",
  };
}

/**
 * 构建问答报告。
 *
 * @param result 问答结果
 * @param question 原始问题
 * @returns 问答报告（question + answer + source）
 */
export function buildQaReport(result: QaResultV14, question: string): QaReportV14 {
  return {
    question,
    answer: result.answer,
    source: result.source,
  };
}
