/**
 * 健澜科技 jlmedaios - M135-D 安全基线检查单测
 *
 * 覆盖：
 *  - securityBaselineCheck：五项检查齐备、字段完整、当前基线定级；
 *  - 安全控制纯函数：SQL 中和 / HTML 转义 / 患者脱敏 / 错误脱敏；
 *  - generateSecurityReport：风险分级计数、整体结论优先级（红>黄>绿）、达标率。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  escapeHtml,
  generateSecurityReport,
  hasInternalDetailLeak,
  hasPiiLeak,
  hasSqlInjectionFootprint,
  hasXssFootprint,
  KNOWN_WRITE_ROUTES,
  maskPatientField,
  neutralizeSql,
  redactError,
  securityBaselineCheck,
  type CheckResult,
} from '../../src/bff/aggregators/securityBaselineAggregator';

/* ------------------------------------------------------------------ */
/* 安全控制纯函数                                                       */
/* ------------------------------------------------------------------ */

describe('neutralizeSql / hasSqlInjectionFootprint', () => {
  it('中和恒真注入载荷后无可突破字符串字面量的结构逃逸', () => {
    const out = neutralizeSql("' OR '1'='1; DROP TABLE patients; --");
    expect(hasSqlInjectionFootprint(out)).toBe(false);
  });
  it('空串兜底', () => {
    expect(neutralizeSql('')).toBe('');
  });
});

describe('escapeHtml / hasXssFootprint', () => {
  it('转义 script 标签后无裸标签头残留', () => {
    const out = escapeHtml("<script>alert('xss')</script>");
    expect(out).toContain('&lt;script&gt;');
    expect(hasXssFootprint(out)).toBe(false);
  });
});

describe('maskPatientField / hasPiiLeak', () => {
  it('手机号中段打码，无连续 7 位以上明文', () => {
    const m = maskPatientField('13812345678', 'phone');
    expect(m).toBe('138****5678');
    expect(hasPiiLeak(m)).toBe(false);
  });
  it('姓名保留首尾、中间打码', () => {
    expect(maskPatientField('张建国', 'name')).toBe('张*国');
  });
  it('证件号中段打码', () => {
    const m = maskPatientField('330106199001011234', 'idCard');
    expect(hasPiiLeak(m)).toBe(false);
  });
});

describe('redactError / hasInternalDetailLeak', () => {
  it('剥离堆栈 / 物理路径 / SQL / 内部主机', () => {
    const raw =
      "Error: ECONNREFUSED 10.0.0.8:5432\n at Query (C:\\app\\src\\db.ts:44:11)\n SELECT * FROM patients";
    const out = redactError(raw);
    expect(hasInternalDetailLeak(out)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* securityBaselineCheck：五项安全检查                                 */
/* ------------------------------------------------------------------ */

describe('securityBaselineCheck', () => {
  const results = securityBaselineCheck('http://localhost:8080');

  it('恰好返回五项检查', () => {
    expect(results.length).toBe(5);
  });

  it('覆盖任务要求的全部检查项', () => {
    const ids = new Set(results.map((r) => r.id));
    expect(ids.has('write-auth')).toBe(true);
    expect(ids.has('sql-injection')).toBe(true);
    expect(ids.has('xss')).toBe(true);
    expect(ids.has('masking')).toBe(true);
    expect(ids.has('error-disclosure')).toBe(true);
  });

  it('每条结果字段完整', () => {
    for (const r of results) {
      expect(r.title.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(r.risk);
      expect(['pass', 'warn', 'fail']).toContain(r.status);
      expect(r.detail.length).toBeGreaterThan(0);
      expect(r.evidence.length).toBeGreaterThan(0);
      expect(r.recommendation.length).toBeGreaterThan(0);
    }
  });

  it('写操作认证：清单内写端点全部要求认证', () => {
    expect(KNOWN_WRITE_ROUTES.length).toBeGreaterThan(0);
    for (const w of KNOWN_WRITE_ROUTES) {
      expect(w.requireAuth).toBe(true);
    }
    const writeAuth = results.find((r) => r.id === 'write-auth');
    expect(writeAuth?.status).toBe('pass');
  });

  it('当前基线：SQL 注入 / XSS / 脱敏均通过，错误脱敏记为关注（黄）', () => {
    const byId = Object.fromEntries(results.map((r) => [r.id, r.status]));
    expect(byId['sql-injection']).toBe('pass');
    expect(byId['xss']).toBe('pass');
    expect(byId['masking']).toBe('pass');
    expect(byId['error-disclosure']).toBe('warn');
  });

  it('baseUrl 为空时不抛错', () => {
    expect(() => securityBaselineCheck('')).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* generateSecurityReport：风险分级与报告                              */
/* ------------------------------------------------------------------ */

function fake(over: Partial<CheckResult>): CheckResult {
  return {
    id: 'x',
    title: 't',
    risk: 'high',
    status: 'pass',
    detail: 'd',
    evidence: 'e',
    recommendation: 'r',
    ...over,
  };
}

describe('generateSecurityReport 风险分级', () => {
  it('全部通过 → 整体绿，达标率 1', () => {
    const report = generateSecurityReport(
      [fake({ status: 'pass' }), fake({ status: 'pass' })],
      'http://t',
      '2026-01-01T00:00:00Z',
    );
    expect(report.summary.overall).toBe('pass');
    expect(report.summary.pass).toBe(2);
    expect(report.summary.warn).toBe(0);
    expect(report.summary.fail).toBe(0);
    expect(report.summary.passRate).toBe(1);
  });

  it('存在任一红 → 整体红（红优先于黄）', () => {
    const report = generateSecurityReport([
      fake({ status: 'pass' }),
      fake({ status: 'warn' }),
      fake({ status: 'fail' }),
    ]);
    expect(report.summary.overall).toBe('fail');
    expect(report.summary.fail).toBe(1);
    expect(report.summary.warn).toBe(1);
    expect(report.summary.pass).toBe(1);
  });

  it('无红但有黄 → 整体黄', () => {
    const report = generateSecurityReport([fake({ status: 'warn' }), fake({ status: 'pass' })]);
    expect(report.summary.overall).toBe('warn');
  });

  it('按风险等级分桶计数', () => {
    const report = generateSecurityReport([
      fake({ risk: 'high' }),
      fake({ risk: 'high' }),
      fake({ risk: 'medium' }),
    ]);
    expect(report.byRisk.high).toBe(2);
    expect(report.byRisk.medium).toBe(1);
    expect(report.byRisk.low).toBe(0);
  });

  it('记录 baseUrl 与 generatedAt', () => {
    const report = generateSecurityReport([fake({})], 'http://x:1', '2026-02-02T00:00:00Z');
    expect(report.baseUrl).toBe('http://x:1');
    expect(report.generatedAt).toBe('2026-02-02T00:00:00Z');
  });

  it('空结果 → 达标率兜底为 1、整体绿', () => {
    const report = generateSecurityReport([]);
    expect(report.summary.total).toBe(0);
    expect(report.summary.overall).toBe('pass');
    expect(report.summary.passRate).toBe(1);
  });
});
