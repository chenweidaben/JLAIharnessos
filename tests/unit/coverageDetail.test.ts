/**
 * 健澜科技 jlmedaios - M151-A 覆盖率明细聚合器单元测试【生产就绪质量门禁】
 *
 * 【质量补齐与新场景】
 *
 * 覆盖三类：
 *  1. 覆盖率明细：getDetailedCoverage 的整体行级统计、五桶分桶、重点文件引用、
 *     优先级缺口排序、数字自洽不变量（segment 缺口求和 == 文件缺口）；
 *  2. 阈值验证：verifyCoverageThreshold 在通过（0.9）/ 未达（0.99）/ 越界 clamp
 *     （NaN / 负数 / >1）下的 pass / delta / modulesBelow / linesNeeded；
 *  3. 缺口定位：securityBaselineAggregator（120 行）与 backupAggregator
 *     （110 行）的函数段明细、热区（hot）判定、gapLocalization 清单。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  getDetailedCoverage,
  M151A_DETAIL_BASELINE,
  verifyCoverageThreshold,
  type DetailedCoverage,
} from '../../src/bff/aggregators/coverageDetailAggregator.js';

/* ===================== 覆盖率明细：整体统计 ===================== */

describe('getDetailedCoverage 整体行级统计', () => {
  const report: DetailedCoverage = getDetailedCoverage({
    targetThreshold: 0.9,
    generatedAt: '2026-10-16T00:00:00Z',
  });

  it('生成时间与阈值透传', () => {
    expect(report.generatedAt).toBe('2026-10-16T00:00:00Z');
    expect(report.targetThreshold).toBe(0.9);
  });

  it('考核文件数等于基线长度', () => {
    expect(report.totalFiles).toBe(M151A_DETAIL_BASELINE.length);
    expect(report.files.length).toBe(M151A_DETAIL_BASELINE.length);
  });

  it('整体行数 / 已覆盖 / 缺口三数自洽', () => {
    expect(report.totalLines).toBe(20830);
    expect(report.uncoveredLines).toBe(434);
    expect(report.coveredLines).toBe(report.totalLines - report.uncoveredLines);
    // 行覆盖率 ≈ 97.92%（已跨过 90% 门禁）
    expect(report.lineRate).toBe(0.9792);
  });

  it('五桶行数求和 == 整体总行数', () => {
    const sumFiles =
      report.byModule.doctor.files +
      report.byModule.nurse.files +
      report.byModule.pharma.files +
      report.byModule.admin.files +
      report.byModule.other.files;
    const sumLines =
      report.byModule.doctor.lines +
      report.byModule.nurse.lines +
      report.byModule.pharma.lines +
      report.byModule.admin.lines +
      report.byModule.other.lines;
    expect(sumFiles).toBe(report.totalFiles);
    expect(sumLines).toBe(report.totalLines);
  });

  it('admin 桶为主要缺口桶（≈93.1%，其余四桶 ≥99%）', () => {
    expect(report.byModule.admin.lineRate).toBe(0.9309);
    expect(report.byModule.admin.uncoveredLines).toBe(344);
    expect(report.byModule.doctor.lineRate).toBe(0.9947);
    expect(report.byModule.nurse.lineRate).toBe(0.9949);
    expect(report.byModule.pharma.lineRate).toBe(0.9944);
    expect(report.byModule.other.lineRate).toBe(0.9911);
  });

  it('90% 门禁通过：核心四桶全部 ≥ 0.9', () => {
    expect(report.gateOk).toBe(true);
    expect(report.byModule.admin.meetsGate).toBe(true);
    expect(report.byModule.doctor.meetsGate).toBe(true);
  });
});

/* ===================== 覆盖率明细：重点文件与缺口排序 ===================== */

describe('getDetailedCoverage 重点文件引用', () => {
  const report = getDetailedCoverage();

  it('securityBaselineAggregator 定位为 120 行缺口重点文件', () => {
    const f = report.focusFiles.securityBaseline;
    expect(f.path).toContain('securityBaselineAggregator');
    expect(f.lines).toBe(780);
    expect(f.uncoveredLines).toBe(120);
    expect(f.coveredLines).toBe(660);
    expect(f.lineRate).toBe(0.8462);
    expect(f.focus).toBe(true);
    expect(f.segments.length).toBeGreaterThan(0);
  });

  it('backupAggregator 定位为 110 行缺口重点文件', () => {
    const f = report.focusFiles.backup;
    expect(f.path).toContain('backupAggregator');
    expect(f.lines).toBe(410);
    expect(f.uncoveredLines).toBe(110);
    expect(f.coveredLines).toBe(300);
    expect(f.lineRate).toBe(0.7317);
    expect(f.focus).toBe(true);
  });

  it('priorityGaps 按缺口行降序，securityBaseline 居首', () => {
    expect(report.priorityGaps.length).toBeGreaterThanOrEqual(14);
    expect(report.priorityGaps[0].path).toContain('securityBaselineAggregator');
    expect(report.priorityGaps[0].uncoveredLines).toBe(120);
    expect(report.priorityGaps[1].path).toContain('backupAggregator');
    expect(report.priorityGaps[1].uncoveredLines).toBe(110);
    // 单调不增
    for (let i = 1; i < report.priorityGaps.length; i += 1) {
      expect(report.priorityGaps[i - 1].uncoveredLines).toBeGreaterThanOrEqual(
        report.priorityGaps[i].uncoveredLines,
      );
    }
  });
});

/* ===================== 缺口定位：函数段钻取不变量 ===================== */

describe('缺口定位：函数段数字自洽（杜绝凑数）', () => {
  const report = getDetailedCoverage();

  it('securityBaseline 各 segment 缺口求和 == 文件缺口 120', () => {
    const f = report.focusFiles.securityBaseline;
    const sum = f.segments.reduce((n, s) => n + s.uncoveredLines, 0);
    expect(sum).toBe(120);
    const segLines = f.segments.reduce((n, s) => n + s.lines, 0);
    expect(segLines).toBe(780);
  });

  it('backup 各 segment 缺口求和 == 文件缺口 110', () => {
    const f = report.focusFiles.backup;
    const sum = f.segments.reduce((n, s) => n + s.uncoveredLines, 0);
    expect(sum).toBe(110);
    const segLines = f.segments.reduce((n, s) => n + s.lines, 0);
    expect(segLines).toBe(410);
  });

  it('热区判定：缺口 ≥15 行标记 hot', () => {
    const f = report.focusFiles.securityBaseline;
    const hotNames = f.segments.filter((s) => s.hot).map((s) => s.name);
    // sqlInjection 18 / xssEscape 15 / piiMask 22 / errorRedaction 20
    expect(hotNames.sort()).toEqual(['errorRedaction', 'piiMask', 'sqlInjection', 'xssEscape']);

    const b = report.focusFiles.backup;
    const bHot = b.segments.filter((s) => s.hot).map((s) => s.name);
    // exportSystemData 55 / importSystemData 33
    expect(bHot.sort()).toEqual(['exportSystemData', 'importSystemData']);
  });

  it('gapLocalization 列出所有缺口段中文名', () => {
    const f = report.focusFiles.securityBaseline;
    expect(f.gapLocalization.length).toBe(f.segments.length); // 所有段都有缺口
    expect(f.gapLocalization[0]).toContain('写路由鉴权策略');
  });

  it('exportSystemData 为最大单段缺口（55 行）', () => {
    const b = report.focusFiles.backup;
    const worst = b.segments.reduce((a, c) => (c.uncoveredLines > a.uncoveredLines ? c : a));
    expect(worst.name).toBe('exportSystemData');
    expect(worst.uncoveredLines).toBe(55);
  });
});

/* ===================== 阈值验证：verifyCoverageThreshold ===================== */

describe('verifyCoverageThreshold 通过场景', () => {
  it('阈值 0.9：门禁通过，delta 为负（超额），无未达标桶', () => {
    const r = verifyCoverageThreshold(0.9);
    expect(r.threshold).toBe(0.9);
    expect(r.currentRate).toBe(0.9792);
    expect(r.pass).toBe(true);
    expect(r.delta).toBe(-0.0792);
    expect(r.modulesBelow).toEqual([]);
    expect(r.linesNeeded).toBe(0);
    expect(r.recommendation).toContain('门禁已通过');
  });

  it('复用 report 入参不重复计算且结果一致', () => {
    const report = getDetailedCoverage();
    const r = verifyCoverageThreshold(0.9, { report });
    expect(r.pass).toBe(true);
    expect(r.currentRate).toBe(report.lineRate);
  });
});

describe('verifyCoverageThreshold 未达场景', () => {
  it('阈值 0.99：未通过，admin 为唯一未达标核心桶', () => {
    const r = verifyCoverageThreshold(0.99);
    expect(r.threshold).toBe(0.99);
    expect(r.pass).toBe(false);
    expect(r.delta).toBe(0.0108);
    expect(r.modulesBelow).toEqual(['admin']);
    // ceil(0.99 * 20830) - 20396 = 20622 - 20396 = 226
    expect(r.linesNeeded).toBe(226);
    expect(r.recommendation).toContain('未达 99% 门禁');
  });

  it('阈值 1.0：要求全覆盖，全部核心桶未达标，linesNeeded = 总缺口 434', () => {
    const r = verifyCoverageThreshold(1.0);
    expect(r.threshold).toBe(1);
    expect(r.pass).toBe(false);
    expect(r.modulesBelow).toEqual(['doctor', 'nurse', 'pharma', 'admin']);
    expect(r.linesNeeded).toBe(434);
  });
});

describe('verifyCoverageThreshold 越界 clamp', () => {
  it('NaN 归到默认 0.9（通过）', () => {
    const r = verifyCoverageThreshold(NaN);
    expect(r.threshold).toBe(0.9);
    expect(r.pass).toBe(true);
  });

  it('负数 clamp 到 0（任意覆盖率都通过）', () => {
    const r = verifyCoverageThreshold(-5);
    expect(r.threshold).toBe(0);
    expect(r.pass).toBe(true);
    expect(r.delta).toBe(-0.9792);
  });

  it('大于 1 clamp 到 1.0（未通过）', () => {
    const r = verifyCoverageThreshold(1.5);
    expect(r.threshold).toBe(1);
    expect(r.pass).toBe(false);
  });
});

/* ===================== 边界 ===================== */

describe('边界与确定性', () => {
  it('两次调用同参数输出完全一致（确定性）', () => {
    const a = getDetailedCoverage({ generatedAt: '2026-10-16T00:00:00Z' });
    const b = getDetailedCoverage({ generatedAt: '2026-10-16T00:00:00Z' });
    expect(a).toEqual(b);
  });

  it('每个文件 coveredLines + uncoveredLines == lines', () => {
    const report = getDetailedCoverage();
    for (const f of report.files) {
      expect(f.coveredLines + f.uncoveredLines).toBe(f.lines);
    }
  });

  it('整体缺口行数 == priorityGaps 缺口求和', () => {
    const report = getDetailedCoverage();
    const sum = report.priorityGaps.reduce((n, f) => n + f.uncoveredLines, 0);
    expect(sum).toBe(report.uncoveredLines);
  });
});
