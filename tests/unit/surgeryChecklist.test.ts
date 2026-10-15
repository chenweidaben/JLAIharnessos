/**
 * 健澜科技 jlmedaios - 手术安全核查表纯函数单测
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  CHECKLIST_PHASES,
  defaultChecklist,
} from '../../src/bff/aggregators/surgeryChecklistAggregator';
import type { SafetyChecklistPhase } from '../../src/db/repositories/safetyChecklistRepo';

const PHASES: SafetyChecklistPhase[] = ['pre_op', 'anesthesia', 'pre_incision', 'post_op'];

describe('CHECKLIST_PHASES', () => {
  it('固定覆盖四个阶段且顺序正确', () => {
    expect(CHECKLIST_PHASES.map((p) => p.phase)).toEqual(PHASES);
    for (const p of CHECKLIST_PHASES) expect(p.title.length).toBeGreaterThan(0);
  });
});

describe('defaultChecklist', () => {
  it('每个阶段都返回核查项，且默认全部未勾选', () => {
    for (const phase of PHASES) {
      const items = defaultChecklist(phase);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i) => i.checked === false)).toBe(true);
      expect(items.every((i) => i.required === true)).toBe(true);
    }
  });

  it('同一阶段的 item key 不重复且非空', () => {
    for (const phase of PHASES) {
      const items = defaultChecklist(phase);
      const keys = items.map((i) => i.key);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys.every((k) => k.length > 0)).toBe(true);
    }
  });

  it('不同阶段产出相互独立（修改返回值不影响下次）', () => {
    const a = defaultChecklist('pre_op');
    a[0].checked = true;
    const b = defaultChecklist('pre_op');
    expect(b[0].checked).toBe(false);
  });

  it('未知阶段抛错', () => {
    expect(() => defaultChecklist('not_a_phase' as SafetyChecklistPhase)).toThrow();
  });
});
