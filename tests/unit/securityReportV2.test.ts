/**
 * 健澜科技 jlmedaios - 安全加固纯函数单测 V2（M187-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildSecurityReport,
  checkSQLInjectionSafe,
  detectXSSVulnerability,
} from '../../src/bff/aggregators/securityReportAggregator';

describe('detectXSSVulnerability V2', () => {
  it('<script> 被识别', () => {
    const risks = detectXSSVulnerability(['<script>alert(1)</script>']);
    expect(risks.length).toBe(1);
  });

  it('javascript: 被识别', () => {
    const risks = detectXSSVulnerability(['javascript:alert(1)']);
    expect(risks.length).toBe(1);
  });

  it('普通文本无风险', () => {
    const risks = detectXSSVulnerability(['张三，男，50岁']);
    expect(risks.length).toBe(0);
  });
});

describe('checkSQLInjectionSafe V2', () => {
  it('参数化查询安全', () => {
    expect(checkSQLInjectionSafe('SELECT * FROM emr WHERE patient_id = ?')).toBe(true);
  });

  it('包含单引号 → 不安全', () => {
    expect(checkSQLInjectionSafe("SELECT * FROM users WHERE name = 'admin'--")).toBe(false);
  });

  it('包含 UNION SELECT → 不安全', () => {
    expect(checkSQLInjectionSafe('1 UNION SELECT password FROM users')).toBe(false);
  });
});

describe('buildSecurityReport V2', () => {
  it('生成 XSS 发现', () => {
    const r = buildSecurityReport('24h');
    expect(r.xssFindings.length).toBeGreaterThan(0);
  });

  it('生成修复建议', () => {
    const r = buildSecurityReport('24h');
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it('覆盖率在 0-1 之间', () => {
    const r = buildSecurityReport('24h');
    expect(r.csrfCoverage).toBeLessThanOrEqual(1);
    expect(r.sqliCoverage).toBeLessThanOrEqual(1);
    expect(r.phiMaskingRate).toBeLessThanOrEqual(1);
  });
});
