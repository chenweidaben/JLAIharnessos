/**
 * 长期画像记忆：事实读写与合并（契约 §7）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 事实键例：allergy / chronic_condition / drug_intolerance / preferred_language。
 * DEMO_MODE 下由 sessionRuntime 进程内 Map 承载；非 DEMO 由后续 BFF 仓储分片
 * 落 consult.profile_memory。本模块只做纯函数合并，不直接访问数据库。
 */

import { newId, nowIso } from '../roleSupport';
import type { ConsultProfileMemory, ProfileFact } from '../types';

/** 创建空白画像记忆 */
export function createProfileMemory(
  userId: string,
  threadId: string | null = null,
): ConsultProfileMemory {
  return {
    id: newId('profile'),
    userId,
    threadId,
    facts: [],
    updatedAt: nowIso(),
  };
}

/** 读取画像事实列表（按录入顺序返回） */
export function listFacts(profile: ConsultProfileMemory): ProfileFact[] {
  return [...profile.facts];
}

/**
 * 合并事实：同键以 updatedAt 更新者为准；保留既有顺序，新事实追加末尾
 *
 * @param existing 既有事实列表
 * @param updates 待合并事实列表
 */
export function mergeFacts(existing: ProfileFact[], updates: ProfileFact[]): ProfileFact[] {
  const merged: ProfileFact[] = [];
  const indexByKey = new Map<string, number>();

  for (const fact of existing) {
    indexByKey.set(fact.key, merged.length);
    merged.push({ ...fact });
  }

  for (const fact of updates) {
    const index = indexByKey.get(fact.key);
    if (index === undefined) {
      indexByKey.set(fact.key, merged.length);
      merged.push({ ...fact });
    } else if (fact.updatedAt >= merged[index].updatedAt) {
      merged[index] = { ...fact };
    }
  }

  return merged;
}

/** 向画像写入 / 更新单条事实，返回新的画像对象（不可变更新） */
export function upsertFact(profile: ConsultProfileMemory, fact: ProfileFact): ConsultProfileMemory {
  return {
    ...profile,
    facts: mergeFacts(profile.facts, [fact]),
    updatedAt: nowIso(),
  };
}

/** 慢性病关键词到事实值的确定性映射 */
const CHRONIC_PATTERNS: readonly { keyword: string; value: string }[] = [
  { keyword: '高血压', value: '高血压' },
  { keyword: '糖尿病', value: '糖尿病' },
  { keyword: '冠心病', value: '冠心病' },
  { keyword: '哮喘', value: '哮喘' },
  { keyword: '慢性阻塞性肺疾病', value: '慢性阻塞性肺疾病' },
  { keyword: '慢阻肺', value: '慢性阻塞性肺疾病' },
  { keyword: '慢性肾病', value: '慢性肾病' },
];

/** 常见药物过敏关键词清单（确定性演示抽取，不做医学诊断） */
const ALLERGY_DRUG_KEYWORDS: readonly string[] = [
  '青霉素',
  '头孢',
  '磺胺',
  '阿司匹林',
  '布洛芬',
  '链霉素',
];

/**
 * 从用户文本确定性抽取画像事实（DEMO 规则快照，不联网、不做医学结论）
 *
 * @param text 用户输入文本
 * @param source 事实来源标注（如 threadId）
 */
export function extractFactsFromText(text: string, source: string): ProfileFact[] {
  const facts: ProfileFact[] = [];
  const normalized = text.trim();
  const updatedAt = nowIso();

  if (/过敏|过敏史/.test(normalized)) {
    const matchedDrug = ALLERGY_DRUG_KEYWORDS.find((drug) => normalized.includes(drug));
    facts.push({
      key: 'allergy',
      value: matchedDrug
        ? `对${matchedDrug}过敏（待医师核实）`
        : '存在药物 / 物质过敏史（待医师核实）',
      source,
      updatedAt,
    });
  }

  for (const pattern of CHRONIC_PATTERNS) {
    if (normalized.includes(pattern.keyword)) {
      facts.push({
        key: 'chronic_condition',
        value: pattern.value,
        source,
        updatedAt,
      });
      break;
    }
  }

  if (/不耐受|不能服用|服用后不适/.test(normalized)) {
    facts.push({
      key: 'drug_intolerance',
      value: '存在药物不耐受情况（待医师核实）',
      source,
      updatedAt,
    });
  }

  if (/英语|英文|English/i.test(normalized)) {
    facts.push({ key: 'preferred_language', value: 'en', source, updatedAt });
  }

  return facts;
}
