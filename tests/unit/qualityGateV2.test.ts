/**
 * 健澜科技 jlmedaios - 300 版本质量门禁 V2 聚合器（M181-C · 300版本里程碑）纯函数单测
 *
 * 覆盖：门禁复查（fullQualityGateV2 八维 / 三色 / 计数 / 整体结论）、
 * 报告生成（generateQualityGateReportV2 结论 / 红线 / 整改计划 / VI 卡片）、
 * 风险识别（findings 按严重度排序、topRisks 取前三、医疗安全红线阻断放行）。
 * 全部纯函数，不依赖数据库 / IO / 时钟。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  RELEASE_VERSION_V2,
  fullQualityGateV2,
  generateQualityGateReportV2,
  type GateV2DimensionKey,
  type GateV2Status,
} from '../../src/bff/aggregators/qualityGateV2Aggregator';

describe('M181-C 门禁复查 fullQualityGateV2', () => {
  it('版本号为 300 里程碑', () => {
    const gate = fullQualityGateV2();
    expect(gate.version).toBe(RELEASE_VERSION_V2);
    expect(gate.version).toBe('300');
  });

  it('八维齐全：smoke/security/performance/coverage/tsc/ui/dengbao/medical', () => {
    const gate = fullQualityGateV2();
    expect(gate.dimensions.length).toBe(8);
    const keys = gate.dimensions.map((d) => d.key).sort();
    const expectedKeys: GateV2DimensionKey[] = [
      'coverage',
      'dengbao',
      'medical',
      'performance',
      'security',
      'smoke',
      'tsc',
      'ui',
    ];
    expect(keys).toEqual(expectedKeys.slice().sort());
  });

  it('每维结论均为三色之一，分值在 0-100', () => {
    const gate = fullQualityGateV2();
    for (const d of gate.dimensions) {
      expect(['pass', 'warn', 'risk']).toContain(d.status);
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
      expect(d.label.length).toBeGreaterThan(0);
      expect(d.summary.length).toBeGreaterThan(0);
    }
  });

  it('计数与各维状态一致（pass/warn/risk 求和=8）', () => {
    const gate = fullQualityGateV2();
    const pass = gate.dimensions.filter((d) => d.status === 'pass').length;
    const warn = gate.dimensions.filter((d) => d.status === 'warn').length;
    const risk = gate.dimensions.filter((d) => d.status === 'risk').length;
    expect(gate.counts.pass).toBe(pass);
    expect(gate.counts.warn).toBe(warn);
    expect(gate.counts.risk).toBe(risk);
    expect(pass + warn + risk).toBe(8);
  });

  it('整体三色推导：有 risk 则不放行，否则放行', () => {
    const gate = fullQualityGateV2();
    if (gate.counts.risk > 0) {
      expect(gate.overallStatus).toBe('risk');
      expect(gate.passed).toBe(false);
    } else if (gate.counts.warn > 0) {
      expect(gate.overallStatus).toBe('warn');
      expect(gate.passed).toBe(true);
    } else {
      expect(gate.overallStatus).toBe('pass');
      expect(gate.passed).toBe(true);
    }
  });

  it('findings 汇总自各维，且按严重度降序（high > medium > low）', () => {
    const gate = fullQualityGateV2();
    const weight: Record<string, number> = { high: 3, medium: 2, low: 1 };
    for (let k = 1; k < gate.findings.length; k += 1) {
      expect(weight[gate.findings[k - 1].severity]).toBeGreaterThanOrEqual(
        weight[gate.findings[k].severity],
      );
    }
    // findings 与各维 findings 总数一致
    const total = gate.dimensions.reduce((n, d) => n + d.findings.length, 0);
    expect(gate.findings.length).toBe(total);
  });

  it('topRisks 至多 3 条且与 findings 前 3 条一致', () => {
    const gate = fullQualityGateV2();
    expect(gate.topRisks.length).toBeLessThanOrEqual(3);
    expect(gate.topRisks.length).toBe(Math.min(3, gate.findings.length));
    gate.topRisks.forEach((r, idx) => expect(r.id).toBe(gate.findings[idx].id));
  });

  it('每条发现都带整改建议（不只指出问题）', () => {
    const gate = fullQualityGateV2();
    for (const f of gate.findings) {
      expect(f.suggestion.length).toBeGreaterThan(0);
      expect(f.message.length).toBeGreaterThan(0);
    }
  });
});

describe('M181-C 报告生成 generateQualityGateReportV2', () => {
  it('结论与门禁结果一致', () => {
    const gate = fullQualityGateV2();
    const report = generateQualityGateReportV2();
    expect(report.overallStatus).toBe(gate.overallStatus);
    expect(report.passed).toBe(gate.passed);
  });

  it('VI 卡片 4 张：门禁结论/通过项/警告项/风险项', () => {
    const report = generateQualityGateReportV2();
    expect(report.viCards.length).toBe(4);
    expect(report.viCards[0].label).toBe('门禁结论');
    for (const c of report.viCards) {
      expect(['pass', 'warn', 'risk']).toContain(c.tone);
    }
  });

  it('整改计划条数 = findings 数，优先级 1..N', () => {
    const gate = fullQualityGateV2();
    const report = generateQualityGateReportV2();
    expect(report.actionPlan.length).toBe(gate.findings.length);
    report.actionPlan.forEach((item, idx) => expect(item.priority).toBe(idx + 1));
  });

  it('红线要点覆盖所有 risk 与 warn 维度', () => {
    const gate = fullQualityGateV2();
    const report = generateQualityGateReportV2();
    const joined = report.highlights.join('\n');
    for (const d of gate.dimensions) {
      if (d.status === 'risk') expect(joined).toContain('风险');
      if (d.status === 'warn') expect(joined).toContain('警告');
    }
  });

  it('总结文案含 300 版本与三色结论', () => {
    const report = generateQualityGateReportV2();
    expect(report.summary).toContain('300');
    expect(report.title).toContain('300');
  });
});

describe('M181-C 风险识别不变量', () => {
  it('tsc 维度恒为通过（零新增报错红线）', () => {
    const gate = fullQualityGateV2();
    const tsc = gate.dimensions.find((d) => d.key === 'tsc');
    expect(tsc?.status).toBe<GateV2Status>('pass');
    expect(tsc?.score).toBe(100);
  });

  it('smoke 维度来自真实路由探测：路由总数 > 0', () => {
    const gate = fullQualityGateV2();
    const smoke = gate.dimensions.find((d) => d.key === 'smoke');
    expect(smoke).toBeDefined();
    const totalMetric = smoke?.metrics.find((m) => m.label === '路由总数');
    expect(Number(totalMetric?.value ?? '0')).toBeGreaterThan(0);
  });

  it('维度键集合固定为八维，不随运行漂移', () => {
    const gate = fullQualityGateV2();
    const keys = new Set(gate.dimensions.map((d) => d.key));
    const expected: GateV2DimensionKey[] = [
      'smoke',
      'security',
      'performance',
      'coverage',
      'tsc',
      'ui',
      'dengbao',
      'medical',
    ];
    for (const k of expected) expect(keys.has(k)).toBe(true);
  });

  it('医疗安全底线为真实红线：输血闭环未达 100% 判 risk 并阻断放行', () => {
    const gate = fullQualityGateV2();
    const medical = gate.dimensions.find((d) => d.key === 'medical');
    expect(medical).toBeDefined();
    // 输血闭环率指标必须存在且为风险
    const bloodMetric = medical?.metrics.find((m) => m.label === '输血闭环率');
    expect(bloodMetric).toBeDefined();
    expect(bloodMetric?.status).toBe<GateV2Status>('risk');
    // 存在医疗安全 high 级发现
    const bloodFinding = medical?.findings.find((f) => f.id === 'gate-v2-medical-blood');
    expect(bloodFinding?.severity).toBe('high');
    // 红线生效：整体不放行
    expect(gate.counts.risk).toBeGreaterThan(0);
    expect(gate.overallStatus).toBe('risk');
    expect(gate.passed).toBe(false);
  });

  it('覆盖率门槛提升至 99%：门禁 V2 新文件未达 99% 判风险', () => {
    const gate = fullQualityGateV2();
    const coverage = gate.dimensions.find((d) => d.key === 'coverage');
    expect(coverage).toBeDefined();
    const coreGate = coverage?.metrics.find((m) => m.label === '门禁V2新文件');
    expect(coreGate?.status).toBe<GateV2Status>('risk');
  });
});
