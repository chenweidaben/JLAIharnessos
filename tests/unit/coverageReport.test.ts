/**
 * 健澜科技 jlmedaios - M150-A 测试覆盖率冲刺报告纯函数单元测试
 *
 * 覆盖：
 *  - 覆盖率统计：generateCoverageReport 的整体 total/covered/rate 与分桶 rate；
 *  - 缺口识别：getCoverageGap 的 gapDelta / modulesBelowTarget / filesNeeded；
 *  - 优先级排序：未覆盖文件按模块严重度 + 行数权重降序（admin/安全域最优先）；
 *  - 确定性种子：createSeededRandom 同 seed 同序列；generateCoverageReport 同入参同输出；
 *  - 边界值：空清单 / 全绿 / 阈值 NaN·负数·超界 clamp / 趋势长度。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  createSeededRandom,
  generateCoverageReport,
  getCoverageGap,
  M150A_BASELINE,
  type CoverageFileRecord,
} from '../../src/bff/aggregators/coverageReportAggregator.js';

/* ===================== 确定性种子 PRNG ===================== */

describe('createSeededRandom 确定性', () => {
  it('同 seed 产出同一序列', () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    for (let i = 0; i < 10; i += 1) {
      expect(a()).toBe(b());
    }
  });

  it('不同 seed 序列不同', () => {
    const a = createSeededRandom(1);
    const b = createSeededRandom(2);
    expect(a()).not.toBe(b());
  });

  it('输出落在 [0,1)', () => {
    const r = createSeededRandom(20261016);
    for (let i = 0; i < 50; i += 1) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

/* ===================== 覆盖率统计（generateCoverageReport） ===================== */

describe('generateCoverageReport 整体统计', () => {
  const report = generateCoverageReport({ generatedAt: '2026-10-16T00:00:00.000Z' });

  it('考核文件总数 = 基线长度（44）', () => {
    expect(report.total).toBe(44);
    expect(report.files.length).toBe(44);
  });

  it('已覆盖 38 / 未覆盖 6，整体率 0.8636', () => {
    expect(report.covered).toBe(38);
    expect(report.uncovered).toBe(6);
    expect(report.rate).toBe(0.8636);
  });

  it('默认门禁阈值 0.9', () => {
    expect(report.targetThreshold).toBe(0.9);
  });

  it('核心四桶未全绿（pharma 0.875 / admin 0.8 < 0.9）→ gateOk=false', () => {
    expect(report.gateOk).toBe(false);
    expect(report.byModule.doctor.rate).toBe(0.9);
    expect(report.byModule.nurse.rate).toBe(0.9);
    expect(report.byModule.pharma.rate).toBe(0.875);
    expect(report.byModule.admin.rate).toBe(0.8);
  });

  it('doctor / nurse 达标，pharma / admin 未达标', () => {
    expect(report.byModule.doctor.meetsGate).toBe(true);
    expect(report.byModule.nurse.meetsGate).toBe(true);
    expect(report.byModule.pharma.meetsGate).toBe(false);
    expect(report.byModule.admin.meetsGate).toBe(false);
  });

  it('趋势含 7 个历史点 + 1 个当前点 = 8', () => {
    expect(report.trend.length).toBe(8);
    expect(report.trend[report.trend.length - 1].label).toBe('当前');
    expect(report.trend[report.trend.length - 1].rate).toBe(0.8636);
  });
});

describe('generateCoverageReport 确定性', () => {
  it('同 seed 同 generatedAt → 报告深度一致', () => {
    const a = generateCoverageReport({ generatedAt: 'FIXED', seed: 20261016 });
    const b = generateCoverageReport({ generatedAt: 'FIXED', seed: 20261016 });
    expect(a).toEqual(b);
  });

  it('不同 seed → 趋势抖动不同，但当前快照一致', () => {
    const a = generateCoverageReport({ generatedAt: 'FIXED', seed: 1 });
    const b = generateCoverageReport({ generatedAt: 'FIXED', seed: 999 });
    expect(a.rate).toBe(b.rate);
    expect(a.byModule).toEqual(b.byModule);
    // 历史趋势因种子不同而不同
    expect(a.trend).not.toEqual(b.trend);
  });
});

/* ===================== 缺口识别（getCoverageGap） ===================== */

describe('getCoverageGap 缺口统计', () => {
  const gap = getCoverageGap(M150A_BASELINE);

  it('currentRate = 0.8636，gapDelta = 0.0364', () => {
    expect(gap.currentRate).toBe(0.8636);
    expect(gap.gapDelta).toBe(0.0364);
  });

  it('targetRate 默认 0.9', () => {
    expect(gap.targetRate).toBe(0.9);
  });

  it('coreGap=true，未达标核心桶 = [pharma, admin]', () => {
    expect(gap.coreGap).toBe(true);
    expect(gap.modulesBelowTarget).toEqual(['pharma', 'admin']);
  });

  it('filesNeeded = 2（ceil(0.9*44)-38 = 40-38）', () => {
    expect(gap.filesNeeded).toBe(2);
  });

  it('缺口清单 = 6 个未覆盖文件', () => {
    expect(gap.prioritizedGaps.length).toBe(6);
  });

  it('优先级排序：admin/securityBaseline（120）→ admin/backup（110）→ pharma/stopbang → nurse/nursingAdmin → doctor/mdt → other/experiencePattern', () => {
    const paths = gap.prioritizedGaps.map((g) => g.path);
    expect(paths[0]).toBe('src/bff/aggregators/securityBaselineAggregator.ts');
    expect(paths[1]).toBe('src/bff/aggregators/backupAggregator.ts');
    // 优先级严格降序
    for (let i = 1; i < gap.prioritizedGaps.length; i += 1) {
      expect(gap.prioritizedGaps[i - 1].priority).toBeGreaterThanOrEqual(
        gap.prioritizedGaps[i].priority,
      );
    }
  });

  it('缺口项带模块 / 行数 / 说明', () => {
    const top = gap.prioritizedGaps[0];
    expect(top.module).toBe('admin');
    expect(top.lines).toBe(780);
    expect(top.reason).toContain('90%');
  });
});

/* ===================== 边界值 ===================== */

describe('getCoverageGap 边界值', () => {
  it('空清单：currentRate=1，gapDelta=0，filesNeeded=0，coreGap=false', () => {
    const gap = getCoverageGap([]);
    expect(gap.currentRate).toBe(1);
    expect(gap.gapDelta).toBe(0);
    expect(gap.filesNeeded).toBe(0);
    expect(gap.coreGap).toBe(false);
    expect(gap.modulesBelowTarget).toEqual([]);
    expect(gap.prioritizedGaps).toEqual([]);
  });

  it('全部覆盖：gapDelta=0，无缺口', () => {
    const allCovered: CoverageFileRecord[] = [
      { path: 'a.ts', module: 'admin', lines: 100, covered: true },
      { path: 'b.ts', module: 'doctor', lines: 200, covered: true },
    ];
    const gap = getCoverageGap(allCovered);
    expect(gap.currentRate).toBe(1);
    expect(gap.gapDelta).toBe(0);
    expect(gap.filesNeeded).toBe(0);
    expect(gap.coreGap).toBe(false);
  });

  it('阈值 1.0：doctor/nurse（0.9）也判为未达标', () => {
    const gap = getCoverageGap(M150A_BASELINE, { targetRate: 1 });
    expect(gap.targetRate).toBe(1);
    expect(gap.modulesBelowTarget).toContain('doctor');
    expect(gap.modulesBelowTarget).toContain('nurse');
    expect(gap.modulesBelowTarget).toContain('admin');
  });

  it('阈值 NaN → clamp 回默认 0.9', () => {
    const gap = getCoverageGap(M150A_BASELINE, { targetRate: Number.NaN });
    expect(gap.targetRate).toBe(0.9);
  });

  it('阈值 >1 → clamp 到 1；阈值 <0 → clamp 到 0', () => {
    const hi = getCoverageGap(M150A_BASELINE, { targetRate: 1.5 });
    expect(hi.targetRate).toBe(1);
    const lo = getCoverageGap(M150A_BASELINE, { targetRate: -1 });
    expect(lo.targetRate).toBe(0);
    expect(lo.gapDelta).toBe(0); // currentRate(0.8636) >= 0
    expect(lo.coreGap).toBe(false);
  });

  it('filesNeeded 数学：10 文件覆盖 8、目标 0.9 → 需补 1', () => {
    const rec: CoverageFileRecord[] = Array.from({ length: 10 }, (_, i) => ({
      path: `f${i}.ts`,
      module: 'admin' as const,
      lines: 100,
      covered: i < 8,
    }));
    const gap = getCoverageGap(rec, { targetRate: 0.9 });
    expect(gap.filesNeeded).toBe(1);
  });

  it('filesNeeded 不会为负：已超目标时 clamp 到 0', () => {
    const rec: CoverageFileRecord[] = [
      { path: 'a.ts', module: 'admin', lines: 100, covered: true },
      { path: 'b.ts', module: 'admin', lines: 100, covered: true },
    ];
    const gap = getCoverageGap(rec, { targetRate: 0.5 });
    expect(gap.filesNeeded).toBe(0);
  });

  it('同级优先级按路径升序（确定性）', () => {
    const rec: CoverageFileRecord[] = [
      { path: 'zzz.ts', module: 'admin', lines: 100, covered: false },
      { path: 'aaa.ts', module: 'admin', lines: 100, covered: false },
    ];
    const gap = getCoverageGap(rec);
    expect(gap.prioritizedGaps[0].path).toBe('aaa.ts');
    expect(gap.prioritizedGaps[1].path).toBe('zzz.ts');
  });
});

/* ===================== 报告与缺口联动 ===================== */

describe('generateCoverageReport.gap 联动', () => {
  it('report.gap 与 getCoverageGap(基线) 一致', () => {
    const report = generateCoverageReport({ generatedAt: 'FIXED', seed: 20261016 });
    const gap = getCoverageGap(M150A_BASELINE);
    expect(report.gap).toEqual(gap);
  });

  it('自定义 generatedAt 透传', () => {
    const report = generateCoverageReport({ generatedAt: '2026-01-01T00:00:00.000Z' });
    expect(report.generatedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
