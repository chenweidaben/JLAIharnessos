/**
 * 安全等级评估与急症旁路判定（契约 §4.2）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 评估顺序固定：先命中急症词表 -> acute；再匹配高危但非急危重表述 -> caution；
 * 其余 normal。编排器在进入角色编排前必须先调用本模块，急症优先旁路。
 */

import type { SafetyLevel } from '../types';
import { detectAcute } from './acuteVocabulary';

/** 高危但非急危重表述：长期慢性病急性加重、症状持续不缓解等，需谨慎提示 */
const CAUTION_KEYWORDS: readonly string[] = [
  '加重',
  '恶化',
  '持续不缓解',
  '反复发作',
  '血压偏高',
  '发热不退',
  '疼痛持续',
  '症状反复',
  '近期明显消瘦',
  '夜间憋醒',
  '下肢水肿',
];

/** 安全评估结果 */
export interface SafetyVerdict {
  level: SafetyLevel;
  matched: string[];
}

/**
 * 评估文本安全等级
 *
 * @param text 用户输入文本
 * @returns level: acute / caution / normal；matched 命中关键词列表
 */
export function evaluateSafety(text: string): SafetyVerdict {
  const acute = detectAcute(text);
  if (acute.isAcute) {
    return { level: 'acute', matched: acute.matched };
  }

  const normalized = text.trim().toLowerCase();
  const cautionMatched: string[] = [];
  for (const keyword of CAUTION_KEYWORDS) {
    if (normalized.includes(keyword.toLowerCase()) && !cautionMatched.includes(keyword)) {
      cautionMatched.push(keyword);
    }
  }
  if (cautionMatched.length > 0) {
    return { level: 'caution', matched: cautionMatched };
  }

  return { level: 'normal', matched: [] };
}
