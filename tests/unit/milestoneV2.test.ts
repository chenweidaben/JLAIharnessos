/**
 * 健澜科技 jlmedaios — 【300版本里程碑】里程碑总结聚合器 V2 纯函数单测（M181-A）
 *
 * 覆盖：
 *  - 里程碑关键口径：累计版本 296（即将 300）/ 累计切片 288 / 测试覆盖率 99.5% /
 *    P95 72ms / 路由数 200+ / 迁移数 370+；
 *  - 版本统计：近四版本 v4.94 ~ v4.97，首尾版本与条数正确；
 *  - 功能模块数：模块域清单总数与派生 featureModuleCount 一致，
 *    且本批新增「质量安全 / 运营分析 / 患者体验 / 性能优化」四个模块全部纳入。
 *
 * 仅测纯函数，不触碰 IO / 时钟（generatedAt 统一注入固定值）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  generateMilestoneSummaryV2,
  MILESTONE_V2_LABEL,
  NEXT_MILESTONE_LABEL,
  CUMULATIVE_VERSION_V2,
  CUMULATIVE_SLICES_V2,
  TEST_COVERAGE_PCT_V2,
  P95_LATENCY_MS_V2,
  ROUTE_COUNT_V2,
  MIGRATION_COUNT_V2,
  NEW_MODULES_V2,
} from '../../src/bff/aggregators/milestoneV2Aggregator';

describe('generateMilestoneSummaryV2 【300版本里程碑】', () => {
  it('里程碑关键口径：296 版本（即将 300）/ 288 切片 / 99.5% 覆盖率 / P95 72ms / 200+ 路由 / 370+ 迁移', () => {
    const s = generateMilestoneSummaryV2({ generatedAt: 'NOW' });

    expect(s.milestone).toBe(MILESTONE_V2_LABEL);
    expect(s.cumulativeVersion).toBe(296);
    expect(s.cumulativeVersion).toBe(CUMULATIVE_VERSION_V2);
    // 即将达成 300：当前累计版本距下一里程碑不足 5
    expect(s.cumulativeVersion).toBeLessThan(300);
    expect(s.nextMilestone).toBe(NEXT_MILESTONE_LABEL);
    expect(s.nextMilestone).toBe('300版本');
    expect(s.cumulativeSlices).toBe(288);
    expect(s.cumulativeSlices).toBe(CUMULATIVE_SLICES_V2);
    expect(s.testCoveragePct).toBeCloseTo(99.5, 1);
    expect(s.testCoveragePct).toBe(TEST_COVERAGE_PCT_V2);
    expect(s.p95LatencyMs).toBe(72);
    expect(s.p95LatencyMs).toBe(P95_LATENCY_MS_V2);
    // 路由数 / 迁移数为下限口径
    expect(s.routeCount).toBeGreaterThanOrEqual(200);
    expect(s.routeCount).toBe(ROUTE_COUNT_V2);
    expect(s.migrationCount).toBeGreaterThanOrEqual(370);
    expect(s.migrationCount).toBe(MIGRATION_COUNT_V2);
    expect(s.generatedAt).toBe('NOW');
  });

  it('版本统计：近四版本 v4.94 ~ v4.97，首尾版本与条数正确', () => {
    const s = generateMilestoneSummaryV2();
    expect(s.recentVersions).toHaveLength(4);
    expect(s.recentVersions[0].version).toBe('v4.94');
    expect(s.recentVersions[3].version).toBe('v4.97');
    // 每条版本记录都带说明与里程碑编号
    for (const v of s.recentVersions) {
      expect(v.title.length).toBeGreaterThan(0);
      expect(v.milestone.length).toBeGreaterThan(0);
    }
  });

  it('功能模块数：派生总数与清单长度一致，且四个新模块全部纳入', () => {
    const s = generateMilestoneSummaryV2();
    expect(s.featureModuleCount).toBe(s.featureModules.length);
    // 16 个既有模块域 + 4 个本批新增 = 20
    expect(s.featureModuleCount).toBeGreaterThanOrEqual(20);

    for (const m of NEW_MODULES_V2) {
      expect(s.featureModules).toContain(m);
      expect(s.newModules).toContain(m);
    }
    expect(s.newModules).toHaveLength(4);
  });

  it('确定性：同一输入产出等价总结（不含生成时间字段）', () => {
    const a = generateMilestoneSummaryV2({ generatedAt: 'T1' });
    const b = generateMilestoneSummaryV2({ generatedAt: 'T2' });
    // 剔除时间后，其余口径完全一致
    const { generatedAt: _gaA, ...restA } = a;
    const { generatedAt: _gaB, ...restB } = b;
    expect(restA).toEqual(restB);
  });
});
