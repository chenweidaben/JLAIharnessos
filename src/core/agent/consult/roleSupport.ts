/**
 * 角色共享支撑工具（契约 §0 roleSupport.ts）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 集中提供 ID / 时间戳生成、证据构造、免责声明附着、角色展示名与
 * 置信度分级等纯函数，供四角色与编排器复用，避免各角色实现漂移。
 */

import { randomUUID } from 'node:crypto';

import type { EvidenceItem, RoleKind } from './types';
import { DISCLAIMER } from './types';

/**
 * 生成标准 RFC 4122 UUID，作为 consult 会话 / 消息 / 草稿 / 审计 / 文档 / 画像主键，
 * 与 consult 六表 uuid 主键与外键列对齐（前缀句柄无法写入 uuid 列，会触发 22P02）。
 * prefix 形参保留仅为调用点兼容，不再进入取值。
 */
export function newId(_prefix = 'id'): string {
  return randomUUID();
}

/** 当前时刻 ISO 8601 字符串 */
export function nowIso(): string {
  return new Date().toISOString();
}

/** 在回复文本末尾常驻附加免责声明（契约 §15-2） */
export function appendDisclaimer(text: string): string {
  return `${text.trimEnd()}\n\n${DISCLAIMER}`;
}

/** 构造标准化证据条目 */
export function makeEvidence(
  kind: EvidenceItem['kind'],
  label: string,
  source: string,
  snippet: string,
): EvidenceItem {
  return { kind, label, source, snippet };
}

/** 角色中文展示名（仅用于审计与展示，不参与状态机判定） */
export function roleDisplayName(role: RoleKind | 'system' | 'user'): string {
  switch (role) {
    case 'supervisor':
      return '分诊主管';
    case 'examiner':
      return '问诊追问';
    case 'doctor':
      return '医师';
    case 'pharmacist':
      return '药师';
    case 'system':
      return '系统';
    case 'user':
      return '用户';
  }
}

/** 置信度分级：high >= 0.85；medium >= 0.6；其余 low（供 SSE meta 事件） */
export function confidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.85) {
    return 'high';
  }
  if (confidence >= 0.6) {
    return 'medium';
  }
  return 'low';
}

/** 文本归一化：去首尾空白、转小写，供关键词匹配使用 */
export function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}
