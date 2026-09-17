/**
 * 健澜科技数智医院智能体 - 等保三级合规检查单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, expect, test } from 'bun:test';
import {
  ComplianceChecker,
  ComplianceFamily,
  ComplianceReportGenerator,
} from '../../../src/security';

describe('ComplianceChecker', () => {
  const checker = new ComplianceChecker({ systemName: '测试医院信息系统' });

  test('检查基线覆盖10个控制域', () => {
    const baseline = checker.getBaseline();
    const families = new Set(baseline.map((i) => i.family));
    expect(families.has(ComplianceFamily.COMPUTING_ENVIRONMENT)).toBe(true);
    expect(families.has(ComplianceFamily.COMMUNICATION_NETWORK)).toBe(true);
    expect(families.has(ComplianceFamily.REGION_BOUNDARY)).toBe(true);
    expect(families.has(ComplianceFamily.MANAGEMENT_CENTER)).toBe(true);
    expect(families.size).toBe(10);
  });

  test('全部通过时报告合规', () => {
    const baseline = checker.getBaseline();
    const evidenceMap: Record<string, { status: 'pass'; evidence: string }> = {};
    for (const item of baseline) {
      evidenceMap[item.id] = { status: 'pass', evidence: '已落实' };
    }
    const report = checker.run(evidenceMap);
    expect(report.summary.passRate).toBe(100);
    expect(report.summary.compliant).toBe(true);
    expect(report.nonCompliantItems.length).toBe(0);
  });

  test('关键项不通过时整体不合规', () => {
    const baseline = checker.getBaseline();
    const evidenceMap: Record<string, { status: 'pass' | 'fail'; evidence?: string }> = {};
    for (const item of baseline) {
      evidenceMap[item.id] = { status: 'pass', evidence: '已落实' };
    }
    // 关键项：身份鉴别 未通过
    evidenceMap['TC-CMP-01'] = { status: 'fail', evidence: '未配置双因子' };
    const report = checker.run(evidenceMap);
    expect(report.summary.compliant).toBe(false);
    expect(report.nonCompliantItems.length).toBeGreaterThan(0);
    // 不合规项带整改建议
    const identityItem = report.nonCompliantItems.find((r) => r.item.id === 'TC-CMP-01');
    expect(identityItem?.remediation).toBeDefined();
  });

  test('汇总各控制域达标情况', () => {
    const baseline = checker.getBaseline();
    const evidenceMap: Record<string, { status: 'pass' | 'fail' }> = {};
    for (const item of baseline) {
      evidenceMap[item.id] = { status: item.critical ? 'pass' : 'fail' };
    }
    const report = checker.run(evidenceMap);
    expect(report.familyBreakdown.length).toBe(10);
    expect(report.summary.total).toBe(baseline.length);
  });

  test('未知检查项ID抛出SecurityError', () => {
    expect(() => checker.assertValidItemIds(['NOT_EXIST'])).toThrow();
  });
});

describe('ComplianceReportGenerator', () => {
  test('生成Markdown测评报告', () => {
    const checker = new ComplianceChecker();
    const baseline = checker.getBaseline();
    const evidenceMap: Record<string, { status: 'pass' | 'fail' }> = {};
    for (const item of baseline) {
      evidenceMap[item.id] = item.critical ? { status: 'pass' } : { status: 'fail' };
    }
    // 强制一个关键项不通过，验证P0排最前
    evidenceMap['TC-CMP-03'] = { status: 'fail' };
    const report = checker.run(evidenceMap);
    const generator = new ComplianceReportGenerator();
    const md = generator.toMarkdown(report);
    expect(md).toContain('网络安全等级保护三级测评报告');
    expect(md).toContain('综合通过率');

    const gap = generator.gapAnalysis(report);
    expect(gap).toContain('差距分析');

    const plan = generator.remediationPlan(report);
    // 关键项应排最前（P0）
    expect(plan[0].priority).toBe('P0');

    const json = generator.toJson(report);
    expect(() => JSON.parse(json)).not.toThrow();

    const html = generator.toHtml(report);
    expect(html).toContain('<table');
  });
});
