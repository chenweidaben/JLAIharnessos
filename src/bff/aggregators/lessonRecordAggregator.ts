/**
 * 健澜科技 jlmedaios - M115-B 经验/教训主动录入聚合器
 *
 * 依据宪法第七章（全角色 Personal Agent）：员工主动把一次真实工作场景的
 *   「场景 → 决策 → 结局 → 教训」手工沉淀为决策记忆
 *   （medmuse.staff_decision_memory，context.source='manual'），让个人经验库
 *   在 Agent 自动捕获之外，形成「我复盘、我录入、我召回」的自增长闭环。
 *
 * 设计要点：
 *  - validateLessonInput / parseTags 均为纯函数：不打库、不修改入参、不抛错，
 *    null / undefined / 空串一律兜底，便于单测与前端侧本地复用；
 *  - 校验结果只回 { valid, errors }，errors 为字段级 { field, message } 数组，
 *    路由层据此把第一个错误映射为 400 响应体；
 *  - 标签清洗兼容「字符串（中英分隔符）」与「字符串数组」两种入参：
 *    trim → 去空 → 去重保序 → 限量，输出确定可快照；
 *  - 本模块只处理录入侧的结构化字段，不落患者直接标识符。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { StaffDecisionOutcome } from './staffMuseAggregator';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 录入结局三态（复用 staffMuseAggregator 口径，与 DB CHECK 一致） */
export type LessonOutcome = StaffDecisionOutcome;

/**
 * 前端提交的原始录入体（字段全部按 unknown 接收，纯函数侧逐一收敛类型）。
 *  - scenario 场景描述（必填）
 *  - decision 我的决策（必填）
 *  - outcome  结果：success 成功 / failure 失败 / mixed 混合（必填）
 *  - lesson   教训心得（选填，空串落 null）
 *  - tags     关联标签：逗号/顿号分隔字符串 或 字符串数组（选填）
 */
export interface LessonInput {
  scenario?: unknown;
  decision?: unknown;
  outcome?: unknown;
  lesson?: unknown;
  tags?: unknown;
}

/** 字段级校验错误 */
export interface FieldError {
  field: string;
  message: string;
}

/** 校验结果：valid 为 false 时 errors 非空 */
export interface LessonValidation {
  valid: boolean;
  errors: FieldError[];
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

/** 合法结局集合（与 medmuse.staff_decision_memory.outcome CHECK 一致） */
export const LESSON_OUTCOMES: readonly LessonOutcome[] = ['success', 'failure', 'mixed'];

/** 字段长度上限（防止正文被滥用为日志区） */
const MAX_SCENARIO = 500;
const MAX_DECISION = 500;
const MAX_LESSON = 2000;

/** 标签上限：单标签字符数 / 单次录入标签个数 */
const MAX_TAG_LEN = 30;
const MAX_TAGS = 20;

/** 标签字符串分隔符：中英文逗号、顿号、分号、空白换行 */
const TAG_SPLIT_RE = /[,，、;；\s]+/;

/* ------------------------------------------------------------------ */
/* 纯函数                                                              */
/* ------------------------------------------------------------------ */

/**
 * toTrimmedText：把 unknown 收敛为 trim 后的纯字符串；非字符串或空值返回 ''。
 * 空值兜底：null / undefined / 数字 / 对象一律 String() 后 trim，避免抛错。
 */
function toTrimmedText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

/**
 * parseTags：清洗关联标签。
 *
 * 口径：
 *  - null / undefined / 空串 → []（空值兜底，不抛错）；
 *  - 字符串按 逗号/顿号/分号/空白 切分（兼容中英文分隔符）；
 *  - 数组入参逐项 trim；
 *  - 逐项 trim → 丢弃空项 → 按首次出现顺序去重 → 单标签超长截断 → 限量 20 个。
 *
 * 纯函数：返回新数组，不修改入参 tags。
 *
 * @param tags 标签入参（字符串 / 字符串数组 / null / undefined）
 */
export function parseTags(tags: unknown): string[] {
  let items: unknown[];
  if (tags == null) {
    items = [];
  } else if (typeof tags === 'string') {
    items = tags.split(TAG_SPLIT_RE);
  } else if (Array.isArray(tags)) {
    items = tags;
  } else {
    // 非字符串、非数组：降级为「字符串化后再切分」，绝不抛错
    items = String(tags).split(TAG_SPLIT_RE);
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of items) {
    const tag = toTrimmedText(raw).slice(0, MAX_TAG_LEN);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
    if (result.length >= MAX_TAGS) break;
  }
  return result;
}

/**
 * validateLessonInput：校验一次「经验/教训主动录入」请求体。
 *
 * 校验口径：
 *  - scenario 场景描述：必填，trim 非空，≤ 500 字；
 *  - decision 我的决策：必填，trim 非空，≤ 500 字；
 *  - outcome 结果：必填，且必须为 success / failure / mixed 之一；
 *  - lesson 教训心得：选填；提供时须为字符串且 ≤ 2000 字；
 *  - tags 关联标签：选填；提供时须为字符串或字符串数组（否则视为格式错误）；
 *  - 入参本身为 null / undefined / 非对象：整体记一条 _ 级错误。
 *
 * 纯函数：不修改入参 input，所有字段缺失 / 空值均兜底收集错误，不抛错。
 *
 * @param input 前端提交的原始录入体
 */
export function validateLessonInput(input: LessonInput | null | undefined): LessonValidation {
  const errors: FieldError[] = [];

  if (input == null || typeof input !== 'object') {
    errors.push({ field: '_', message: '录入内容不能为空' });
    return { valid: false, errors };
  }

  // 场景描述：必填
  const scenario = toTrimmedText(input.scenario);
  if (!scenario) {
    errors.push({ field: 'scenario', message: '场景描述不能为空' });
  } else if (scenario.length > MAX_SCENARIO) {
    errors.push({ field: 'scenario', message: `场景描述不能超过 ${MAX_SCENARIO} 字` });
  }

  // 我的决策：必填
  const decision = toTrimmedText(input.decision);
  if (!decision) {
    errors.push({ field: 'decision', message: '我的决策不能为空' });
  } else if (decision.length > MAX_DECISION) {
    errors.push({ field: 'decision', message: `我的决策不能超过 ${MAX_DECISION} 字` });
  }

  // 结果：必填且三态之一
  const outcome = toTrimmedText(input.outcome);
  if (!outcome) {
    errors.push({ field: 'outcome', message: '请选择结果（成功 / 失败 / 混合）' });
  } else if (!LESSON_OUTCOMES.includes(outcome as LessonOutcome)) {
    errors.push({ field: 'outcome', message: '结果必须为 成功 / 失败 / 混合 之一' });
  }

  // 教训心得：选填，但给了就必须是合法字符串且不超长
  if (input.lesson != null && input.lesson !== '') {
    if (typeof input.lesson !== 'string') {
      errors.push({ field: 'lesson', message: '教训心得必须为文本' });
    } else if (input.lesson.trim().length > MAX_LESSON) {
      errors.push({ field: 'lesson', message: `教训心得不能超过 ${MAX_LESSON} 字` });
    }
  }

  // 关联标签：选填，仅接受字符串或数组
  if (input.tags != null && input.tags !== '') {
    if (typeof input.tags !== 'string' && !Array.isArray(input.tags)) {
      errors.push({ field: 'tags', message: '关联标签须为文本或标签数组' });
    }
  }

  return { valid: errors.length === 0, errors };
}
