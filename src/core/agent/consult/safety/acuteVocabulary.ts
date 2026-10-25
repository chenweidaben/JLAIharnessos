/**
 * 急症词表与命中检测（契约 §4.1）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 词表以中文为主，匹配前统一做小写归一化；命中即视为急症旁路候选，
 * 最终等级由 safetyGate 评估。词表条目不得删除，可按测试需要扩充。
 */

/** 急症关键词表（契约 §4.1 冻结条目） */
export const ACUTE_KEYWORDS: readonly string[] = [
  '胸痛',
  '胸闷伴大汗',
  '呼吸困难',
  '喘憋',
  '意识丧失',
  '昏迷',
  '意识不清',
  '偏瘫',
  '口角歪斜',
  '言语不清',
  '中风',
  '脑出血',
  '抽搐',
  '惊厥',
  '大出血',
  '呕血',
  '咯血',
  '黑便',
  '便血',
  '严重外伤',
  '头部外伤',
  '窒息',
  '喉头水肿',
  '严重过敏',
  '过敏性休克',
  '自杀',
  '轻生',
  '自伤',
  '孕妇腹痛',
  '阴道出血',
  '胎动消失',
  '高热惊厥',
  '心肌梗死',
  '心跳骤停',
  '面色青紫',
  '休克',
  '剧烈腹痛',
  '中毒',
  '误服药物',
];

/** 急症命中结果 */
export interface AcuteDetectionResult {
  matched: string[];
  isAcute: boolean;
}

/** 文本归一化：去首尾空白、转小写，便于中英文混合匹配 */
function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * 检测文本是否命中急症词表
 *
 * @param text 用户输入文本
 * @returns matched 命中关键词列表（保持词表顺序去重）；isAcute 是否命中
 */
export function detectAcute(text: string): AcuteDetectionResult {
  const normalized = normalize(text);
  if (!normalized) {
    return { matched: [], isAcute: false };
  }
  const matched: string[] = [];
  for (const keyword of ACUTE_KEYWORDS) {
    if (normalized.includes(keyword.toLowerCase()) && !matched.includes(keyword)) {
      matched.push(keyword);
    }
  }
  return { matched, isAcute: matched.length > 0 };
}
