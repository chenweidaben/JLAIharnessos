/**
 * 健澜AI原生医院操作系统OS - bff/agents/outpatient/dialogueNormalizer.ts
 *
 * 对话归一节点（4.2.3 dialogue-normalize，code 节点）：
 * 去口语化、术语展示归一、时间线排序、相对时间解析、缺失要素挂起标记。
 * 纯函数离线实现；不改变医学事实，仅做展示层归一与要素链检查。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FactSnapshot } from '@/security/ai/types.js';
import type {
  DialogueSegment,
  EncounterKind,
  NormalizedDialogue,
  NormalizedSegment,
  TimelineEvent,
} from './types.js';

/** 口语填充词表（纯展示层去除，不改写医学事实） */
const FILLER_WORDS = ['嗯', '啊', '呃', '哦', '那个', '就是', '然后', '这个', '怎么说呢', '好像', '大概', '其实', '对吧', '是吧'];

/** 术语同义词字典（仅展示归一；不据此做诊断改写） */
const TERM_SYNONYMS: ReadonlyArray<[RegExp, string]> = [
  [/血压高/g, '高血压'],
  [/头疼/g, '头痛'],
  [/拉肚子/g, '腹泻'],
  [/发烧/g, '发热'],
  [/咳嗽不止/g, '咳嗽'],
  [/心慌/g, '心悸'],
  [/头晕头昏/g, '头晕'],
];

/** 初诊必备章节关键词与中文标签 */
const INITIAL_SECTIONS: ReadonlyArray<[string, RegExp]> = [
  ['主诉', /主诉|主要不适/],
  ['现病史', /现病史|发病以来|症状出现/],
  ['既往史', /既往史|既往|以前得过|过敏史/],
  ['查体', /查体|体格检查|查体所见/],
  ['辅助检查', /辅助检查|化验|检验|影像|检查结果/],
];

/** 复诊必备章节关键词与中文标签 */
const FOLLOW_UP_SECTIONS: ReadonlyArray<[string, RegExp]> = [
  ['诊疗经过', /诊疗经过|治疗经过|上次治疗/],
  ['病情变化', /病情变化|好转|加重|缓解/],
  ['查体', /查体|体格检查|查体所见/],
  ['辅助检查', /辅助检查|化验|检验|影像|检查结果/],
  ['诊断调整', /诊断调整|调整诊断|诊断变更/],
  ['后续处理', /后续处理|处理意见|下一步/],
];

/** 无法解析的模糊时间表述 */
const UNPARSEABLE_TIME_PATTERN = /很久以前|好些天前|有一阵子/;

function stripFillers(text: string): string {
  let result = text;
  for (const filler of FILLER_WORDS) {
    result = result.split(filler).join('');
  }
  return result.replace(/[，,。.；;！!？?\s]{2,}/g, '，').trim();
}

function normalizeTerms(text: string): string {
  let result = text;
  for (const [pattern, replacement] of TERM_SYNONYMS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/** 相对时间词解析为日期偏移（天）；无法识别返回 null */
function relativeOffsetDays(segment: string): number | null {
  if (/昨天/.test(segment)) return -1;
  if (/前天/.test(segment)) return -2;
  if (/今天|本周/.test(segment)) return 0;
  if (/三天前/.test(segment)) return -3;
  if (/一周前|上周/.test(segment)) return -7;
  if (/两周前/.test(segment)) return -14;
  return null;
}

function shiftDate(base: Date, days: number): Date {
  const shifted = new Date(base.getTime());
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function missingRequiredSections(kind: EncounterKind, combined: string): string[] {
  const sections = kind === 'initial' ? INITIAL_SECTIONS : FOLLOW_UP_SECTIONS;
  const missing: string[] = [];
  for (const [label, pattern] of sections) {
    if (!pattern.test(combined)) missing.push(label);
  }
  return missing;
}

/**
 * 对话归一：去口语化、术语归一、时间线排序、缺失要素挂起。
 * `facts.encounterDate` 缺省取当前时间；`encounterKind` 提供时执行必备章节检查。
 */
export function normalizeDialogue(
  segments: DialogueSegment[],
  facts?: { encounterDate?: string; facts?: FactSnapshot; encounterKind?: EncounterKind },
): NormalizedDialogue {
  const base = facts?.encounterDate ? new Date(facts.encounterDate) : new Date();
  const baseDate = Number.isNaN(base.getTime()) ? new Date() : base;

  const normalizedSegments: NormalizedSegment[] = segments.map((segment) => {
    const normalizedText = normalizeTerms(stripFillers(segment.text));
    return {
      speaker: segment.speaker,
      text: segment.text,
      order: segment.order,
      normalizedText,
      sourceSegment: segment.order,
    };
  });

  const timeline: TimelineEvent[] = [];
  const missingElements: string[] = [];

  for (const segment of normalizedSegments) {
    const offset = relativeOffsetDays(segment.normalizedText);
    if (offset !== null) {
      timeline.push({
        date: toDateString(shiftDate(baseDate, offset)),
        summary: segment.normalizedText.slice(0, 80),
        sourceSegment: segment.order,
      });
    } else if (UNPARSEABLE_TIME_PATTERN.test(segment.normalizedText)) {
      missingElements.push(`时间表述无法解析：${segment.normalizedText.slice(0, 40)}`);
    }
  }

  timeline.sort((a, b) => a.date.localeCompare(b.date));

  if (facts?.encounterKind) {
    const combined = normalizedSegments.map((s) => s.normalizedText).join('。');
    missingElements.push(...missingRequiredSections(facts.encounterKind, combined));
  }

  return { segments: normalizedSegments, timeline, missingElements };
}
