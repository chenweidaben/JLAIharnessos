/**
 * 健澜科技 jlmedaios - 系统帮助中心聚合器单测（M125-D，演示就绪）
 *
 * 覆盖：
 *  1. 内容生成：buildHelpContent 返回结构完整、文章数与展平列表一致；
 *  2. 角色过滤：doctor / nurse / admin / newbie 可见分节符合 audience 规则，未知角色回退 doctor；
 *  3. 搜索功能：searchHelp 命中标题/标签/正文，空关键字返回空数组。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  buildHelpContent,
  normalizeHelpRole,
  searchHelp,
  HELP_SECTIONS,
  type HelpRole,
} from '@/bff/aggregators/helpCenterAggregator.js';

const NOW = '2026-01-01T00:00:00.000Z';

describe('帮助中心 - 内容生成', () => {
  it('应返回结构完整的 HelpContent，且文章总数与展平列表一致', () => {
    const c = buildHelpContent('doctor', NOW);
    expect(c.role).toBe('doctor');
    expect(c.generatedAt).toBe(NOW);
    expect(c.sections.length).toBeGreaterThan(0);
    expect(c.articles.length).toBe(c.totalArticles);
    expect(c.totalArticles).toBe(c.sections.reduce((n, s) => n + s.articles.length, 0));
  });

  it('内容盘应包含全部五个分节', () => {
    const ids = HELP_SECTIONS.map((s) => s.id).sort();
    expect(ids).toEqual(
      [
        'sec-admin',
        'sec-doctor',
        'sec-faq',
        'sec-nurse',
        'sec-onboarding',
      ].sort(),
    );
  });
});

describe('帮助中心 - 角色过滤', () => {
  it('doctor 可见：入职指南 + 医生手册 + FAQ，不可见护士/管理员手册', () => {
    const c = buildHelpContent('doctor', NOW);
    const ids = c.sections.map((s) => s.id);
    expect(ids).toContain('sec-onboarding');
    expect(ids).toContain('sec-doctor');
    expect(ids).toContain('sec-faq');
    expect(ids).not.toContain('sec-nurse');
    expect(ids).not.toContain('sec-admin');
  });

  it('nurse 可见：入职指南 + 护士手册 + FAQ，不可见医生/管理员手册', () => {
    const c = buildHelpContent('nurse', NOW);
    const ids = c.sections.map((s) => s.id);
    expect(ids).toContain('sec-nurse');
    expect(ids).toContain('sec-onboarding');
    expect(ids).toContain('sec-faq');
    expect(ids).not.toContain('sec-doctor');
    expect(ids).not.toContain('sec-admin');
  });

  it('admin 可见：入职指南 + 管理员手册 + FAQ，不可见医生/护士手册', () => {
    const c = buildHelpContent('admin', NOW);
    const ids = c.sections.map((s) => s.id);
    expect(ids).toContain('sec-admin');
    expect(ids).toContain('sec-onboarding');
    expect(ids).toContain('sec-faq');
    expect(ids).not.toContain('sec-doctor');
    expect(ids).not.toContain('sec-nurse');
  });

  it('newbie 仅可见全员开放分节（入职指南 + FAQ）', () => {
    const c = buildHelpContent('newbie', NOW);
    const ids = c.sections.map((s) => s.id);
    expect(ids).toContain('sec-onboarding');
    expect(ids).toContain('sec-faq');
    expect(ids).not.toContain('sec-doctor');
    expect(ids).not.toContain('sec-nurse');
    expect(ids).not.toContain('sec-admin');
  });

  it('未知/空角色应归一化为 doctor', () => {
    expect(normalizeHelpRole(undefined)).toBe<HelpRole>('doctor');
    expect(normalizeHelpRole('')).toBe<HelpRole>('doctor');
    expect(normalizeHelpRole('ghost')).toBe<HelpRole>('doctor');
    expect(normalizeHelpRole(' NURSE ')).toBe<HelpRole>('nurse');
    expect(buildHelpContent('ghost', NOW).role).toBe('doctor');
  });
});

describe('帮助中心 - 搜索功能', () => {
  it('空/空白关键字应返回空数组', () => {
    const c = buildHelpContent('doctor', NOW);
    expect(searchHelp('', c)).toEqual([]);
    expect(searchHelp('   ', c)).toEqual([]);
  });

  it('应命中标题（处方）并带所属分节上下文', () => {
    const c = buildHelpContent('doctor', NOW);
    const hits = searchHelp('处方', c);
    expect(hits.length).toBeGreaterThan(0);
    // 定位到处方文章本身（入职指南正文也含“处方”，需按文章 id 精确断言）
    const top = hits.find((h) => h.article.id === 'doc-prescription');
    expect(top).toBeDefined();
    expect(top!.hitOn).toBe('title');
    expect(top!.article.title).toContain('处方');
    expect(top!.sectionId).toBe('sec-doctor');
    expect(top!.sectionTitle).toBe('医生操作手册');
  });

  it('应命中标签与正文（交班），且大小写不敏感', () => {
    const c = buildHelpContent('nurse', NOW);
    const hits = searchHelp('SBAR', c);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.article.id === 'nur-handoff')).toBe(true);
  });

  it('护士角色内容中不应出现仅医生可见的医生手册文章', () => {
    const c = buildHelpContent('nurse', NOW);
    const hits = searchHelp('处方', c);
    expect(hits.every((h) => h.sectionId !== 'sec-doctor')).toBe(true);
  });
});
