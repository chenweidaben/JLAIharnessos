/**
 * 健澜科技 jlmedaios - 急诊留观展示工具（M74-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export const TRIAGE_LABEL: Record<string, string> = {
  I: 'I 级 危',
  II: 'II 级 急',
  III: 'III 级 急症',
  IV: 'IV 级 非急症',
  V: 'V 级 非急',
};

export const DISPOSITION_LABEL: Record<string, string> = {
  admitted: '收住院',
  discharged: '离院',
  transferred: '转科',
  left_ama: '自动离院',
};

export function hoursSince(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
}
