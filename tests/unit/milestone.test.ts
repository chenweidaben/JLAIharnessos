/**
 * 健澜科技 jlmedaios — 【200版本里程碑】里程碑总结聚合器纯函数单测（M157-A）
 *
 * 覆盖：
 *  - 里程碑关键口径：累计版本 200 / 累计切片 176 / 测试覆盖率 97.92% /
 *    P95 72ms / 路由数 173+ / 迁移数 319+；
 *  - 版本统计：近四版本 v3.98 ~ v4.01，首尾版本与条数正确；
 *  - 功能模块数：模块域清单总数与派生 featureModuleCount 一致，
 *    且本批新增「集团管理 / AI 大脑 / 科研 / 患者服务」四个模块全部纳入。
 *
 * 仅测纯函数，不触碰 IO / 时钟（generatedAt 统一注入固定值）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  generateMilestoneSummary,
  MILESTONE_LABEL,
  CUMULATIVE_VERSION,
  CUMULATIVE_SLICES,
  TEST_COVERAGE_PCT,
  P95_LATENCY_MS,
  ROUTE_COUNT,
  MIGRATION_COUNT,
  NEW_MODULES,
} from '../../src/bff/aggregators/milestoneAggregator';

describe('generateMilestoneSummary 【200版本里程碑】', () => {
  it('里程碑关键口径：200 版本 / 176 切片 / 97.92% 覆盖率 / P95 72ms / 173+ 路由 / 319+ 迁移', () => {
    const s = generateMilestoneSummary({ generatedAt: 'NOW' });

    expect(s.milestone).toBe(MILESTONE_LABEL);
    expect(s.cumulativeVersion).toBe(200);
    expect(s.cumulativeVersion).toBe(CUMULATIVE_VERSION);
    expect(s.cumulativeSlices).toBe(176);
    expect(s.cumulativeSlices).toBe(CUMULATIVE_SLICES);
    expect(s.testCoveragePct).toBeCloseTo(97.92, 2);
    expect(s.testCoveragePct).toBe(TEST_COVERAGE_PCT);
    expect(s.p95LatencyMs).toBe(72);
    expect(s.p95LatencyMs).toBe(P95_LATENCY_MS);
    // 路由数 / 迁移数为下限口径
    expect(s.routeCount).toBeGreaterThanOrEqual(173);
    expect(s.routeCount).toBe(ROUTE_COUNT);
    expect(s.migrationCount).toBeGreaterThanOrEqual(319);
    expect(s.migrationCount).toBe(MIGRATION_COUNT);
    expect(s.generatedAt).toBe('NOW');
  });

  it('版本统计：近四版本 v3.98 ~ v4.01，首尾版本与条数正确', () => {
    const s = generateMilestoneSummary();
    expect(s.recentVersions).toHaveLength(4);
    expect(s.recentVersions[0].version).toBe('v3.98');
    expect(s.recentVersions[3].version).toBe('v4.01');
    // 每条版本记录都带说明与里程碑编号
    for (const v of s.recentVersions) {
      expect(v.title.length).toBeGreaterThan(0);
      expect(v.milestone.length).toBeGreaterThan(0);
    }
  });

  it('功能模块数：派生总数与清单长度一致，且四个新模块全部纳入', () => {
    const s = generateMilestoneSummary();
    expect(s.featureModuleCount).toBe(s.featureModules.length);
    expect(s.featureModuleCount).toBeGreaterThanOrEqual(16);

    for (const m of NEW_MODULES) {
      expect(s.featureModules).toContain(m);
      expect(s.newModules).toContain(m);
    }
    expect(s.newModules).toHaveLength(4);
  });

  it('确定性：同一输入产出等价总结（不含生成时间字段）', () => {
    const a = generateMilestoneSummary({ generatedAt: 'T1' });
    const b = generateMilestoneSummary({ generatedAt: 'T2' });
    // 剔除时间后，其余口径完全一致
    const { generatedAt: _gaA, ...restA } = a;
    const { generatedAt: _gaB, ...restB } = b;
    expect(restA).toEqual(restB);
  });
});
