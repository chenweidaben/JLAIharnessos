/**
 * 确定性意图分类器（契约 §3）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 纯关键词规则 + 历史上下文判定，不联网；置信度 0–1，规则可测、可枚举。
 * 判定顺序固定：急症 -> 退出 -> 问候 -> 追问补充回答 -> 文档上传 -> 用药咨询
 * -> 慢病管理 -> 症状主诉 -> 未知兜底。
 */

import { normalizeText } from './roleSupport';
import { detectAcute } from './safety/acuteVocabulary';
import type { ConsultMessage, IntentKind } from './types';

/** 意图分类结果 */
export interface IntentResult {
  intent: IntentKind;
  confidence: number;
  matched: string[];
}

/** 规则表条目：意图 -> 关键词 -> 基础置信度 */
interface IntentRule {
  intent: IntentKind;
  keywords: readonly string[];
  baseConfidence: number;
}

const GREETING_KEYWORDS = ['你好', '您好', '在吗', 'hi', 'hello'];
const EXIT_KEYWORDS = ['结束', '退出', '再见', '不用了', '关闭会话'];
const DOCUMENT_KEYWORDS = ['上传', '报告', '化验单', '影像', '病历', '检查结果'];
const MEDICATION_KEYWORDS = ['药', '用药', '剂量', '副作用', '过敏', '能否同服', '同服', '处方'];
const CHRONIC_KEYWORDS = ['慢性病', '随访', '血压', '血糖', '长期管理', '复查'];
const SYMPTOM_KEYWORDS = [
  '症状',
  '难受',
  '疼',
  '痛',
  '咳嗽',
  '发热',
  '头晕',
  '乏力',
  '心慌',
  '恶心',
  '呕吐',
  '腹泻',
  '皮疹',
  '头痛',
  '胃痛',
  '胸闷',
  '咽痛',
  '鼻塞',
  '流涕',
  '腹痛',
  '失眠',
  '麻木',
];

/** 顺序敏感的规则表（clarification_answer 依赖历史，单独判定） */
const RULES: IntentRule[] = [
  { intent: 'exit', keywords: EXIT_KEYWORDS, baseConfidence: 0.95 },
  { intent: 'greeting', keywords: GREETING_KEYWORDS, baseConfidence: 0.9 },
  { intent: 'document_upload', keywords: DOCUMENT_KEYWORDS, baseConfidence: 0.85 },
  { intent: 'medication_question', keywords: MEDICATION_KEYWORDS, baseConfidence: 0.85 },
  { intent: 'chronic_management', keywords: CHRONIC_KEYWORDS, baseConfidence: 0.85 },
  { intent: 'symptom_report', keywords: SYMPTOM_KEYWORDS, baseConfidence: 0.8 },
];

/** 计算规则命中关键词与置信度（首命中基础分，每多命中一个关键词加 0.05，封顶 1.0） */
function matchRule(normalized: string, rule: IntentRule): IntentResult | null {
  const matched = rule.keywords.filter((keyword) => normalized.includes(keyword.toLowerCase()));
  if (matched.length === 0) {
    return null;
  }
  const confidence = Math.min(1, rule.baseConfidence + (matched.length - 1) * 0.05);
  return { intent: rule.intent, confidence, matched };
}

/** 判断上一轮是否为 Examiner 追问（history 最后一条为 assistant 且 roleKind=examiner） */
function lastMessageIsExaminerFollowUp(history: ConsultMessage[]): boolean {
  const last = history.at(-1);
  return last?.role === 'assistant' && last?.roleKind === 'examiner';
}

/**
 * 分类用户消息意图
 *
 * @param text 用户输入文本
 * @param history 历史消息（升序），用于识别追问补充回答
 */
export function classifyIntent(text: string, history: ConsultMessage[]): IntentResult {
  const normalized = normalizeText(text);
  if (!normalized) {
    return { intent: 'unknown', confidence: 0.3, matched: [] };
  }

  // 1. 急症旁路意图优先
  const acute = detectAcute(text);
  if (acute.isAcute) {
    return { intent: 'acute_emergency', confidence: 0.98, matched: acute.matched };
  }

  // 2. 退出 / 问候 / 文档 / 用药 / 慢病 / 症状 顺序匹配
  for (const rule of RULES) {
    const result = matchRule(normalized, rule);
    if (result) {
      // 3. 追问上下文：上一轮 Examiner 追问后，补充回答归为 clarification_answer
      if (result.intent === 'symptom_report' && lastMessageIsExaminerFollowUp(history)) {
        return { intent: 'clarification_answer', confidence: 0.85, matched: result.matched };
      }
      return result;
    }
  }

  // 4. 无关键词命中但处于追问上下文 -> 补充回答
  if (lastMessageIsExaminerFollowUp(history)) {
    return { intent: 'clarification_answer', confidence: 0.7, matched: [] };
  }

  // 5. 未知兜底
  return { intent: 'unknown', confidence: 0.3, matched: [] };
}
