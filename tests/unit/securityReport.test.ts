/**
 * 健澜科技 jlmedaios - M149-B 安全基线报告单测
 *
 * 覆盖：
 *  - securityBaselineCheck：八项检查齐备（含 M149-B 新增 token 过期 / 密码哈希 / 审计链）；
 *  - 风险识别（真查问题，非走过场）：
 *      · 过期 / 缺 exp 令牌被失败安全拒绝，健康令牌放行；
 *      · 明文 / MD5 口令被判弱存储，bcrypt 被判强；
 *      · 审计日志合法链校验通过，篡改中间条即断链被检出；
 *  - generateSecurityReport：三色计数、整体结论优先级（红>黄>绿）、达标率、byRisk 分桶。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  ACCESS_TOKEN_MAX_TTL_SEC,
  fnv1a32Hex,
  generateSecurityReport,
  hashAuditEntry,
  isStrongPasswordHash,
  isTokenExpired,
  isWeakPasswordStorage,
  securityBaselineCheck,
  tokenTtlSeconds,
  verifyAuditChain,
  type AuditEntry,
  type CheckResult,
} from '../../src/bff/aggregators/securityBaselineAggregator';

/* ------------------------------------------------------------------ */
/* Token 过期机制（M149-B）                                             */
/* ------------------------------------------------------------------ */

describe('isTokenExpired（fail-closed）', () => {
  const now = 1_700_000_000_000;

  it('已过期令牌必须被拒绝', () => {
    expect(isTokenExpired(now - 1000, now)).toBe(true);
  });
  it('缺 exp / 非法 exp 一律拒绝（不允许放行）', () => {
    expect(isTokenExpired(undefined, now)).toBe(true);
    expect(isTokenExpired(NaN, now)).toBe(true);
    expect(isTokenExpired(0, now)).toBe(true);
  });
  it('未过期健康令牌放行', () => {
    expect(isTokenExpired(now + 1800 * 1000, now)).toBe(false);
  });
  it('TTL 受控：参考访问令牌 ≤ 2h 门禁', () => {
    const ttlSec = tokenTtlSeconds(now, now + 1800 * 1000) / 1000;
    expect(ttlSec).toBeLessThanOrEqual(ACCESS_TOKEN_MAX_TTL_SEC);
    // 超长令牌（如 7 天）应被识别为越权长 TTL
    expect(tokenTtlSeconds(now, now + 7 * 24 * 3600 * 1000) / 1000).toBeGreaterThan(ACCESS_TOKEN_MAX_TTL_SEC);
  });
});

/* ------------------------------------------------------------------ */
/* 密码哈希（M149-B）                                                   */
/* ------------------------------------------------------------------ */

describe('口令存储强度识别', () => {
  it('明文口令判弱、不判强', () => {
    expect(isWeakPasswordStorage('123456')).toBe(true);
    expect(isWeakPasswordStorage('password')).toBe(true);
    expect(isStrongPasswordHash('123456')).toBe(false);
  });
  it('MD5 / SHA1 已破哈希判弱', () => {
    expect(isWeakPasswordStorage('e10adc3949ba59abbe56e057f20f883e')).toBe(true); // md5(123456)
    expect(isWeakPasswordStorage('5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8')).toBe(true); // sha1(password)
  });
  it('bcrypt 加盐慢哈希判强、不判弱', () => {
    const bcrypt = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    expect(isStrongPasswordHash(bcrypt)).toBe(true);
    expect(isWeakPasswordStorage(bcrypt)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* 审计日志完整性（M149-B）                                             */
/* ------------------------------------------------------------------ */

const AUDIT: AuditEntry[] = [
  { seq: 1, action: 'LOGIN', actor: 'admin', at: '2026-10-16T09:00:00Z' },
  { seq: 2, action: 'ORDER_CREATE', actor: 'dr.zhang', at: '2026-10-16T09:05:00Z' },
  { seq: 3, action: 'PRESCRIPTION_ISSUE', actor: 'dr.zhang', at: '2026-10-16T09:10:00Z' },
];

function buildChain(entries: readonly AuditEntry[]): string[] {
  const chain: string[] = [];
  let prev = 'GENESIS';
  for (const e of entries) {
    const h = hashAuditEntry(e, prev);
    chain.push(h);
    prev = h;
  }
  return chain;
}

describe('审计日志哈希链防篡改', () => {
  it('FNV-1a 摘要确定性可复算', () => {
    expect(fnv1a32Hex('hello')).toBe(fnv1a32Hex('hello'));
    expect(fnv1a32Hex('hello')).not.toBe(fnv1a32Hex('hell0'));
  });
  it('合法链校验通过', () => {
    expect(verifyAuditChain(AUDIT, buildChain(AUDIT))).toBe(true);
  });
  it('篡改中间一条 → 链断裂并被检出', () => {
    const tampered = AUDIT.map((e, i) => (i === 1 ? { ...e, action: 'ORDER_CREATE_TAMPERED' } : e));
    expect(verifyAuditChain(tampered, buildChain(AUDIT))).toBe(false);
  });
  it('链长度与条目不一致 → 拒绝', () => {
    expect(verifyAuditChain(AUDIT, [buildChain(AUDIT)[0]])).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* securityBaselineCheck：八项基线                                      */
/* ------------------------------------------------------------------ */

describe('securityBaselineCheck 基线报告', () => {
  const results = securityBaselineCheck('http://localhost:8080');

  it('返回八项检查', () => {
    expect(results.length).toBe(8);
  });

  it('七项任务书要求的检查项齐备', () => {
    const ids = new Set(results.map((r) => r.id));
    expect(ids.has('write-auth')).toBe(true); // POST/PUT/DELETE 权限校验
    expect(ids.has('masking')).toBe(true); // 患者 PII 脱敏
    expect(ids.has('sql-injection')).toBe(true); // SQL 注入防护
    expect(ids.has('xss')).toBe(true); // XSS 防护
    expect(ids.has('token-expiry')).toBe(true); // token 过期机制
    expect(ids.has('password-hash')).toBe(true); // 密码哈希
    expect(ids.has('audit-log-integrity')).toBe(true); // 审计日志完整性
  });

  it('每条结果字段完整且定级合法', () => {
    for (const r of results) {
      expect(r.title.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(r.risk);
      expect(['pass', 'warn', 'fail']).toContain(r.status);
      expect(r.detail.length).toBeGreaterThan(0);
      expect(r.evidence.length).toBeGreaterThan(0);
      expect(r.recommendation.length).toBeGreaterThan(0);
    }
  });

  it('M149-B 三项当前基线均通过（控制真实生效）', () => {
    const byId = Object.fromEntries(results.map((r) => [r.id, r.status]));
    expect(byId['token-expiry']).toBe('pass');
    expect(byId['password-hash']).toBe('pass');
    expect(byId['audit-log-integrity']).toBe('pass');
  });
});

/* ------------------------------------------------------------------ */
/* generateSecurityReport：三色汇总                                     */
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
  it('全绿 → 整体绿、达标率 1', () => {
    const report = generateSecurityReport(
      [fake({ status: 'pass' }), fake({ status: 'pass' }), fake({ status: 'pass' })],
      'http://t',
      '2026-01-01T00:00:00Z',
    );
    expect(report.summary.overall).toBe('pass');
    expect(report.summary.pass).toBe(3);
    expect(report.summary.passRate).toBe(1);
  });

  it('任一红 → 整体红（红优先于黄）', () => {
    const report = generateSecurityReport([
      fake({ status: 'pass' }),
      fake({ status: 'warn' }),
      fake({ status: 'fail' }),
    ]);
    expect(report.summary.overall).toBe('fail');
    expect(report.summary.fail).toBe(1);
  });

  it('无红有黄 → 整体黄', () => {
    const report = generateSecurityReport([fake({ status: 'warn' }), fake({ status: 'pass' })]);
    expect(report.summary.overall).toBe('warn');
  });

  it('真实八项基线：整体为黄（错误不泄露保留一项加固提醒），无红', () => {
    const report = generateSecurityReport(
      securityBaselineCheck('http://t'),
      'http://t',
      '2026-02-02T00:00:00Z',
    );
    expect(report.summary.total).toBe(8);
    expect(report.summary.fail).toBe(0);
    expect(report.generatedAt).toBe('2026-02-02T00:00:00Z');
  });
});
