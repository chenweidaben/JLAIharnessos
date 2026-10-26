/**
 * 健澜AI原生医院操作系统OS - bff/agents/outpatient/intentClassifier.ts
 *
 * 门诊意图分流（4.2.3 intent-classify 节点）：规则信号 + 可选模型判定占位。
 * 初诊 initial / 复诊 follow-up / 复诊续方 renewal / 检验解读 lab-review；
 * renewal 与 lab-review 文书流映射到 follow-up，并在 reasons 标注。
 *
 * 纯函数，不接模型服务；模型判定由调用方注入 `modelJudge`，缺省走规则口径。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FactSnapshot } from '@/security/ai/types.js';
import type { DialogueSegment, EncounterKind, IntentClass } from './types.js';

/** 意图分类结果 */
export interface IntentClassification {
  intent: IntentClass;
  encounterKind: EncounterKind;
  confidence: number;
  reasons: string[];
}

/** 续方关键词（复诊续方） */
const RENEWAL_PATTERN = /续方|开药|配药|续药|慢病药|开点药|长期处方/;
/** 检验解读关键词 */
const LAB_REVIEW_PATTERN = /化验单|检验报告|检查结果|报告解读|指标|复查报告|影像报告/;
/** 复诊关键词 */
const FOLLOW_UP_PATTERN = /复诊|上次|既往|吃药后|复查|随访|回来看看/;
/** 初诊关键词 */
const INITIAL_PATTERN = /首诊|第一次|以前没看过|初次就诊|头一回/;

/** 模型判定占位签名：注入后由模型返回意图，规则作为兜底 */
export type IntentModelJudge = (text: string) => IntentClass;

function combineText(segments: DialogueSegment[]): string {
  return segments
    .map((segment) => segment.text)
    .filter(Boolean)
    .join('。');
}

/**
 * 分类门诊意图：
 * 1. 模型判定优先（注入时）；2. 规则信号按续方 → 检验解读 → 复诊 → 初诊顺序命中；
 * 3. 事实快照存在既往诊断 / 用药时倾向复诊；4. 缺省按初诊处理并标注低置信。
 */
export function classifyIntent(input: {
  dialogue: DialogueSegment[];
  facts?: FactSnapshot;
  modelJudge?: IntentModelJudge;
}): IntentClassification {
  const text = combineText(input.dialogue);
  const reasons: string[] = [];

  // 模型判定占位：注入后优先采用，规则信号作为解释补充
  if (input.modelJudge) {
    const judged = input.modelJudge(text);
    if (['initial', 'follow-up', 'renewal', 'lab-review'].includes(judged)) {
      reasons.push(`模型判定意图：${judged}`);
      return {
        intent: judged,
        encounterKind: mapEncounterKind(judged),
        confidence: 0.75,
        reasons,
      };
    }
    reasons.push('模型判定结果非法，回退规则口径');
  }

  if (RENEWAL_PATTERN.test(text)) {
    reasons.push('命中续方关键词，按复诊续方处理（文书流归入复诊）');
    return { intent: 'renewal', encounterKind: 'follow-up', confidence: 0.85, reasons };
  }
  if (LAB_REVIEW_PATTERN.test(text)) {
    reasons.push('命中检验 / 报告解读关键词，按检验解读处理（文书流归入复诊）');
    return { intent: 'lab-review', encounterKind: 'follow-up', confidence: 0.85, reasons };
  }
  if (FOLLOW_UP_PATTERN.test(text)) {
    reasons.push('命中复诊关键词，按复诊处理');
    return { intent: 'follow-up', encounterKind: 'follow-up', confidence: 0.82, reasons };
  }
  if (INITIAL_PATTERN.test(text)) {
    reasons.push('命中初诊关键词，按初诊处理');
    return { intent: 'initial', encounterKind: 'initial', confidence: 0.82, reasons };
  }

  // 事实快照兜底：存在既往诊断或用药倾向复诊
  const hasHistory =
    (input.facts?.diagnoses?.length ?? 0) > 0 || (input.facts?.medications?.length ?? 0) > 0;
  if (hasHistory) {
    reasons.push('事实快照存在既往诊断 / 用药，按复诊处理');
    return { intent: 'follow-up', encounterKind: 'follow-up', confidence: 0.68, reasons };
  }

  reasons.push('未命中明确意图信号，缺省按初诊处理（低置信，需医师确认）');
  return { intent: 'initial', encounterKind: 'initial', confidence: 0.6, reasons };
}

/** 意图到就诊类型映射：续方 / 检验解读 / 复诊均归入复诊文书流 */
function mapEncounterKind(intent: IntentClass): EncounterKind {
  return intent === 'initial' ? 'initial' : 'follow-up';
}
