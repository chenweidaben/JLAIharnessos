/**
 * 健澜科技 jlmedaios - M166-D 系统安全深化：渗透测试与漏洞扫描纯函数单元测试
 *
 * 覆盖：
 *  - runSecurityScan：五类攻击面真检（SQL注入/XSS/CSRF/信息泄露/认证绕过），命中即出带证据漏洞
 *  - rankVulnerability：CVSS 风格风险打分与分级带
 *  - generateSecurityFix：按类别产出可落地修复建议
 *  - trackSecurityVulnerability：漏洞状态流转登记与非法输入拒绝
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  generateSecurityFix,
  rankVulnerability,
  runSecurityScan,
  trackSecurityVulnerability,
  type Severity,
  type Vulnerability,
  type VulnCategory,
} from '../../src/bff/aggregators/securityScanAggregator.js';

/** 构造一条测试用漏洞 */
function makeVuln(overrides: Partial<Vulnerability> = {}): Vulnerability {
  return {
    id: 'VULN-TEST',
    category: 'sql_injection',
    cwe: 'CWE-89',
    title: '测试漏洞',
    location: 'GET /api/v1/test?id=',
    detail: '测试详情',
    evidence: "WHERE id = '${id}'",
    severity: 'critical',
    impact: 9,
    exploitability: 8,
    ...overrides,
  };
}

describe('runSecurityScan：五类攻击面真检', () => {
  it('返回五类攻击面摘要且数量与检查点一致', () => {
    const report = runSecurityScan();
    expect(report.categories).toHaveLength(5);
    const keys = report.categories.map((c) => c.key).sort();
    const expectedKeys: VulnCategory[] = ['auth_bypass', 'csrf', 'info_leak', 'sql_injection', 'xss'];
    expect(keys).toEqual(expectedKeys);
    // 每个 category 的 findings 与漏洞清单中该类计数一致
    for (const c of report.categories) {
      expect(c.findings).toBe(report.vulnerabilities.filter((v) => v.category === c.key).length);
    }
  });

  it('SQL 注入：插值/拼接 query 参数被真检命中，参数化项不漏报', () => {
    const report = runSecurityScan();
    const sqli = report.vulnerabilities.filter((v) => v.category === 'sql_injection');
    // range / patientId 是插值 → 必命中
    const ids = sqli.map((v) => v.id);
    expect(ids).toContain('VULN-SQLI-RANGE');
    expect(ids).toContain('VULN-SQLI-PATIENTID');
    // search / dept / window 是参数化 → 不得误报
    expect(ids).not.toContain('VULN-SQLI-SEARCH');
    expect(ids).not.toContain('VULN-SQLI-DEPT');
    // 命中漏洞必须带真实证据串
    for (const v of sqli) expect(v.evidence).toContain("${");
  });

  it('XSS：未转义反射命中，已 escapeHtml 的不误报', () => {
    const report = runSecurityScan();
    const xss = report.vulnerabilities.filter((v) => v.category === 'xss');
    const ids = xss.map((v) => v.id);
    expect(ids).toContain('VULN-XSS-Q');
    expect(ids).toContain('VULN-XSS-BIO');
    expect(ids).not.toContain('VULN-XSS-MSG'); // 已转义
  });

  it('CSRF：缺守卫的写操作命中，有守卫的不误报', () => {
    const report = runSecurityScan();
    const csrf = report.vulnerabilities.filter((v) => v.category === 'csrf');
    expect(csrf.length).toBe(2); // POST users / DELETE tenants
    for (const v of csrf) expect(v.location).toMatch(/^(POST|DELETE)/);
  });

  it('敏感信息泄露：堆栈/SQL/PII 外泄命中，脱敏信封不误报', () => {
    const report = runSecurityScan();
    const leak = report.vulnerabilities.filter((v) => v.category === 'info_leak');
    expect(leak.length).toBe(3); // stack / sql / idCard 日志
    const pii = leak.find((v) => /idcard|id_card|身份证/i.test(v.evidence));
    expect(pii).toBeDefined();
  });

  it('认证绕过：应受保护却无守卫的路由命中，公开登录页不误报', () => {
    const report = runSecurityScan();
    const auth = report.vulnerabilities.filter((v) => v.category === 'auth_bypass');
    const locs = auth.map((v) => v.location);
    expect(locs).toContain('GET /api/v1/internal/metrics');
    expect(locs).toContain('GET /api/v1/admin/quality/monitor');
    expect(locs).not.toContain('POST /api/v1/auth/login');
    expect(locs).not.toContain('GET /api/v1/admin/security/scan');
  });

  it('漏洞清单按风险分降序，且每条都带修复建议', () => {
    const report = runSecurityScan();
    for (let i = 1; i < report.vulnerabilities.length; i++) {
      expect(report.vulnerabilities[i - 1].riskScore).toBeGreaterThanOrEqual(report.vulnerabilities[i].riskScore);
    }
    for (const v of report.vulnerabilities) {
      expect(v.fix.length).toBeGreaterThan(0);
      expect(v.riskScore).toBeGreaterThanOrEqual(0);
      expect(v.riskScore).toBeLessThanOrEqual(100);
    }
  });

  it('安全健康分随漏洞严重度下降且有底线', () => {
    const report = runSecurityScan();
    expect(report.summary.score).toBeLessThan(100); // 本基线确有漏洞
    expect(report.summary.score).toBeGreaterThanOrEqual(0);
    expect(report.summary.totalFindings).toBe(report.vulnerabilities.length);
  });

  it('确定性：同参多次调用结果一致', () => {
    const a = runSecurityScan();
    const b = runSecurityScan();
    expect(JSON.stringify(a.vulnerabilities.map((v) => v.id))).toBe(
      JSON.stringify(b.vulnerabilities.map((v) => v.id)),
    );
    expect(a.summary.score).toBe(b.summary.score);
  });
});

describe('rankVulnerability：风险打分与分级', () => {
  it('高影响高可利用 + critical → 落在 critical 带', () => {
    const r = rankVulnerability('critical' as Severity, 10, 10);
    expect(r.riskScore).toBe(100);
    expect(r.band).toBe('critical');
  });

  it('低严重度低可利用 → info/low 带', () => {
    const r = rankVulnerability('info', 1, 1);
    expect(r.band).toBe('info');
    expect(r.riskScore).toBeLessThan(20);
  });

  it('impact/exploitability 被钳制在 1-10', () => {
    const over = rankVulnerability('high', 99, 99);
    const under = rankVulnerability('high', -5, -5);
    expect(over.riskScore).toBeLessThanOrEqual(100);
    expect(under.riskScore).toBeGreaterThanOrEqual(0);
  });

  it('分级带边界：80/60/40/20', () => {
    expect(rankVulnerability('high', 10, 8).band).toBe('high'); // 0.8*0.8*100=64
    expect(rankVulnerability('medium', 10, 7).band).toBe('medium'); // 0.6*0.7*100=42
    expect(rankVulnerability('low', 8, 8).band).toBe('low'); // 0.35*0.64*100≈22
  });
});

describe('generateSecurityFix：分类修复建议', () => {
  it('SQL 注入建议参数化预编译', () => {
    const fix = generateSecurityFix(makeVuln({ category: 'sql_injection' }));
    expect(fix).toContain('参数化');
  });

  it('XSS 建议输出转义 + CSP', () => {
    const fix = generateSecurityFix(makeVuln({ category: 'xss' }));
    expect(fix).toContain('转义');
    expect(fix).toContain('Content-Security-Policy');
  });

  it('CSRF 建议 Token 校验', () => {
    const fix = generateSecurityFix(makeVuln({ category: 'csrf' }));
    expect(fix).toContain('CSRF Token');
  });

  it('信息泄露建议统一错误信封 + PII 脱敏', () => {
    const fix = generateSecurityFix(makeVuln({ category: 'info_leak' }));
    expect(fix).toContain('traceId');
    expect(fix).toContain('脱敏');
  });

  it('认证绕过建议补 auth 守卫', () => {
    const fix = generateSecurityFix(makeVuln({ category: 'auth_bypass' }));
    expect(fix).toContain('requireAuth');
  });

  it('建议携带命中位置', () => {
    const fix = generateSecurityFix(makeVuln());
    expect(fix).toContain('GET /api/v1/test');
  });
});

describe('trackSecurityVulnerability：状态登记', () => {
  it('合法状态被接受', () => {
    const rec = trackSecurityVulnerability('VULN-SQLI-RANGE', 'fixed');
    expect(rec.accepted).toBe(true);
    expect(rec.status).toBe('fixed');
  });

  it('空 ID 被拒绝', () => {
    const rec = trackSecurityVulnerability('   ', 'open');
    expect(rec.accepted).toBe(false);
  });

  it('非法状态被拒绝', () => {
    // @ts-expect-error 故意传入非法状态以校验运行时防御
    const rec = trackSecurityVulnerability('VULN-XSS-Q', 'patched');
    expect(rec.accepted).toBe(false);
  });

  it('accepted/ignored 状态正常登记', () => {
    expect(trackSecurityVulnerability('VULN-CSRF-X', 'accepted').accepted).toBe(true);
    expect(trackSecurityVulnerability('VULN-LEAK-Y', 'ignored').status).toBe('ignored');
  });
});
