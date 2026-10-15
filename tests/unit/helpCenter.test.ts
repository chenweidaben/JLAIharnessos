/**
 * 健澜科技 jlmedaios - 系统帮助中心聚合器单测（M147-D，生产就绪）
 *
 * 「知识图谱与患者教育」模块：覆盖帮助生成、角色/分面过滤、搜索与分类。
 *
 * 覆盖：
 *  1. 内容生成：buildHelpCenter 返回结构完整，四类分桶之和 === total；
 *  2. 分类约束：steps 每条恰好 3 步、shortcuts 每条带热键、FAQ ≥ 20 条；
 *  3. 角色过滤：doctor / nurse / admin 可见条目符合 audience 规则，未知角色回退 doctor；
 *  4. 分面过滤：page 指定时仅返回该分面，非法 page 回退 all；
 *  5. 搜索功能：searchHelp 命中标题/标签/正文，空关键字返回空数组，且按角色范围隔离。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  buildHelpCenter,
  normalizeHelpPage,
  normalizeHelpRole,
  searchHelp,
  HELP_ITEMS,
  type HelpRole,
} from '@/bff/aggregators/helpCenterAggregator.js';

const NOW = '2026-01-01T00:00:00.000Z';

describe('帮助中心 - 内容生成', () => {
  it('应返回结构完整的 HelpContent，且四类分桶之和等于 total', () => {
    const c = buildHelpCenter('doctor', undefined, NOW);
    expect(c.role).toBe('doctor');
    expect(c.page).toBe('all');
    expect(c.generatedAt).toBe(NOW);
    expect(c.total).toBe(
      c.features.length + c.steps.length + c.faq.length + c.shortcuts.length,
    );
    expect(c.total).toBeGreaterThan(0);
  });

  it('FAQ 板块应内置 20 条以上真实高频问答', () => {
    const c = buildHelpCenter('all' as HelpRole, undefined, NOW);
    expect(c.faq.length).toBeGreaterThanOrEqual(20);
  });

  it('内容盘四种类别齐备（功能介绍/三步操作/FAQ/快捷键）', () => {
    const cats = new Set(HELP_ITEMS.map((i) => i.category));
    expect(cats.has('features')).toBe(true);
    expect(cats.has('steps')).toBe(true);
    expect(cats.has('faq')).toBe(true);
    expect(cats.has('shortcuts')).toBe(true);
  });
});

describe('帮助中心 - 分类约束', () => {
  it('每个三步操作条目应恰好 3 个步骤', () => {
    const c = buildHelpCenter('doctor', 'steps', NOW);
    for (const s of c.steps) {
      expect(Array.isArray(s.steps)).toBe(true);
      expect(s.steps!.length).toBe(3);
    }
  });

  it('每个快捷键条目应带非空热键说明', () => {
    const c = buildHelpCenter('doctor', 'shortcuts', NOW);
    expect(c.shortcuts.length).toBeGreaterThan(0);
    for (const s of c.shortcuts) {
      expect(typeof s.shortcut).toBe('string');
      expect(s.shortcut!.length).toBeGreaterThan(0);
    }
  });
});

describe('帮助中心 - 角色过滤', () => {
  it('doctor 可见医生操作步骤，不可见仅护士的交班步骤', () => {
    const c = buildHelpCenter('doctor', undefined, NOW);
    const stepIds = c.steps.map((s) => s.id);
    expect(stepIds).toContain('step-admission');
    expect(stepIds).toContain('step-prescription');
    expect(stepIds).not.toContain('step-handoff');
  });

  it('nurse 可见交班步骤，不可见仅医生的入院记录步骤', () => {
    const c = buildHelpCenter('nurse', undefined, NOW);
    const stepIds = c.steps.map((s) => s.id);
    expect(stepIds).toContain('step-handoff');
    expect(stepIds).toContain('step-critical');
    expect(stepIds).not.toContain('step-admission');
    expect(stepIds).not.toContain('step-consult');
  });

  it('admin 可见全员功能与全员 FAQ，但无岗位专属操作步骤', () => {
    const c = buildHelpCenter('admin', undefined, NOW);
    expect(c.features.length).toBeGreaterThan(0);
    // admin 仅见 audience 含 'all' 的 FAQ（岗位专属 FAQ 按权限隔离）
    expect(c.faq.length).toBeGreaterThan(0);
    expect(c.steps.length).toBe(0);
  });

  it('未知/空角色应归一化为 doctor', () => {
    expect(normalizeHelpRole(undefined)).toBe<HelpRole>('doctor');
    expect(normalizeHelpRole('')).toBe<HelpRole>('doctor');
    expect(normalizeHelpRole('ghost')).toBe<HelpRole>('doctor');
    expect(normalizeHelpRole(' NURSE ')).toBe<HelpRole>('nurse');
    expect(buildHelpCenter('ghost', undefined, NOW).role).toBe('doctor');
  });
});

describe('帮助中心 - 分面过滤', () => {
  it('page=faq 时仅返回 FAQ，其余分面置空，total 不变', () => {
    const c = buildHelpCenter('doctor', 'faq', NOW);
    expect(c.page).toBe('faq');
    expect(c.faq.length).toBeGreaterThan(0);
    expect(c.features.length).toBe(0);
    expect(c.steps.length).toBe(0);
    expect(c.shortcuts.length).toBe(0);
    expect(c.total).toBe(
      buildHelpCenter('doctor', undefined, NOW).total,
    );
  });

  it('非法 page 应归一化为 all', () => {
    expect(normalizeHelpPage('bogus')).toBe('all');
    expect(buildHelpCenter('doctor', 'bogus', NOW).page).toBe('all');
  });
});

describe('帮助中心 - 搜索功能', () => {
  it('空/空白关键字应返回空数组', () => {
    expect(searchHelp('', 'doctor')).toEqual([]);
    expect(searchHelp('   ', 'doctor')).toEqual([]);
  });

  it('应命中标题（处方）并带类别上下文', () => {
    const hits = searchHelp('处方', 'doctor');
    expect(hits.length).toBeGreaterThan(0);
    const step = hits.find((h) => h.id === 'step-prescription');
    expect(step).toBeDefined();
    expect(step!.category).toBe('steps');
    expect(step!.title).toContain('处方');
  });

  it('应命中标签（SBAR），且大小写不敏感', () => {
    const hits = searchHelp('SBAR', 'nurse');
    expect(hits.some((h) => h.id === 'step-handoff')).toBe(true);
    expect(hits.some((h) => h.id === 'faq-handoff')).toBe(true);
  });

  it('搜索应按角色范围隔离：doctor 搜不到仅护士的交班条目', () => {
    const hits = searchHelp('交班', 'doctor');
    expect(hits.every((h) => h.id !== 'step-handoff' && h.id !== 'faq-handoff')).toBe(true);
  });

  it('应命中快捷键（电子签名）', () => {
    const hits = searchHelp('电子签名', 'admin');
    expect(hits.some((h) => h.id === 'sc-sign' && h.category === 'shortcuts')).toBe(true);
  });
});
