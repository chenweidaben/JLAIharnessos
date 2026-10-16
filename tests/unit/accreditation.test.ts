/**
 * 健澜科技 jlmedaios - 等级评审纯函数单测（M205-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessAccreditationReadiness,
  buildAccreditationReport,
  generateRectificationPlan,
  type AccreditationFinding,
  type ChecklistItem,
} from '../../src/bff/aggregators/accreditationAggregator';

describe('assessAccreditationReadiness', () => {
  it('全部就绪 → ready', () => {
    const list: ChecklistItem[] = [
      { item: '制度', ready: true },
      { item: '预案', ready: true },
    ];
    const r = assessAccreditationReadiness(list);
    expect(r.ready).toBe(true);
    expect(r.readyRate).toBe(1);
  });

  it('多项未就绪 → 未就绪', () => {
    const list: ChecklistItem[] = [
      { item: '制度', ready: true },
      { item: '预案', ready: false },
      { item: '培训', ready: false },
    ];
    const r = assessAccreditationReadiness(list);
    expect(r.ready).toBe(false);
    expect(r.missing.length).toBe(2);
  });
});

describe('generateRectificationPlan', () => {
  it('生成整改动作', () => {
    const findings: AccreditationFinding[] = [
      { clause: 'CQI-01', severity: 'high', description: 'PDCA 记录不全' },
      { clause: 'CQI-02', severity: 'low', description: '台账格式不规范' },
    ];
    const r = generateRectificationPlan(findings);
    expect(r.total).toBe(2);
    expect(r.highPriority).toBe(1);
    expect(r.actions.length).toBe(2);
  });
});

describe('buildAccreditationReport', () => {
  it('生成三级评审数据', () => {
    const r = buildAccreditationReport('1y');
    expect(r.tertiary.coreClauses).toBeGreaterThan(0);
  });

  it('生成电子病历数据', () => {
    const r = buildAccreditationReport('1y');
    expect(r.emr.level).toBeGreaterThan(0);
  });

  it('生成整改数据', () => {
    const r = buildAccreditationReport('1y');
    expect(r.rectification.cycles).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildAccreditationReport('1y');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
