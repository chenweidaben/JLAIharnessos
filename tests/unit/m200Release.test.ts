/**
 * 健澜科技 jlmedaios - M200 发布纯函数单测（M200-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildM200ReleaseReport,
  buildM200Timeline,
  generateReleaseNotes,
  type MilestoneHistory,
} from '../../src/bff/aggregators/m200ReleaseAggregator';

describe('generateReleaseNotes', () => {
  it('生成发行说明', () => {
    const notes = generateReleaseNotes('v2.77.0-M200');
    expect(notes.length).toBeGreaterThan(3);
    expect(notes[0]).toContain('v2.77.0-M200');
  });
});

describe('buildM200Timeline', () => {
  it('生成时间线', () => {
    const history: MilestoneHistory[] = [
      { milestone: 'M183', description: '初始版本' },
      { milestone: 'M200', description: '里程碑发布' },
    ];
    const t = buildM200Timeline(history);
    expect(t.items.length).toBe(2);
    expect(t.items[0]).toContain('M183');
  });
});

describe('buildM200ReleaseReport', () => {
  it('生成版本概览', () => {
    const r = buildM200ReleaseReport();
    expect(r.version).toContain('M200');
  });

  it('生成功能统计', () => {
    const r = buildM200ReleaseReport();
    expect(r.modules).toBeGreaterThan(0);
  });

  it('生成性能统计', () => {
    const r = buildM200ReleaseReport();
    expect(r.p99Ms).toBeGreaterThan(0);
  });

  it('生成回顾', () => {
    const r = buildM200ReleaseReport();
    expect(r.retrospective.keyAchievements.length).toBeGreaterThan(0);
  });

  it('生成路线图', () => {
    const r = buildM200ReleaseReport();
    expect(r.roadmap.length).toBeGreaterThan(0);
  });
});
