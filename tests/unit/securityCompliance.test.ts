/**
 * 健澜科技 jlmedaios - M163-A 等保三级 安全合规单测（安全与运营）
 *
 * 覆盖：
 *  - checkTwoFactorAuth：强制角色 MFA 未开 → fail；合规 → pass；普通角色未开 → warn；
 *  - checkPasswordPolicy：强口令通过、弱口令/缺类/黑名单被拦截；
 *  - auditAccessLog：失败登录 / 夜间访问 / 批量导出 / 链完整性 真查；
 *  - buildSecurityComplianceReport：五大类 15 项、三色计数、整体结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  ACCESS_LOG_FIXTURE,
  auditAccessLog,
  buildSecurityComplianceReport,
  checkPasswordPolicy,
  checkTwoFactorAuth,
  USER_SECURITY_DIRECTORY,
} from '../../src/bff/aggregators/securityComplianceAggregator';

/* ------------------------------------------------------------------ */
/* 双因素认证                                                          */
/* ------------------------------------------------------------------ */
describe('checkTwoFactorAuth 双因素真查', () => {
  it('敏感角色已开 MFA → 合规 pass', () => {
    const r = checkTwoFactorAuth('u-admin-001');
    expect(r.required).toBe(true);
    expect(r.enabled).toBe(true);
    expect(r.compliant).toBe(true);
    expect(r.status).toBe('pass');
  });

  it('admin 未开 MFA → 不合规 fail（真查出问题，非走过场）', () => {
    const r = checkTwoFactorAuth('u-broke-004');
    expect(r.required).toBe(true);
    expect(r.enabled).toBe(false);
    expect(r.compliant).toBe(false);
    expect(r.status).toBe('fail');
  });

  it('普通护士角色未开 MFA → 建议补全 warn', () => {
    const r = checkTwoFactorAuth('u-nurse-003');
    expect(r.required).toBe(false);
    expect(r.status).toBe('warn');
  });

  it('IAM 中不存在的账号 → fail（游离账号）', () => {
    expect(checkTwoFactorAuth('u-not-exist').status).toBe('fail');
  });

  it('支持注入自定义目录（纯函数、可测）', () => {
    const r = checkTwoFactorAuth('u-custom', {
      'u-custom': {
        userId: 'u-custom',
        roles: ['admin'],
        mfaEnabled: false,
        passwordChangedAt: '2026-01-01T00:00:00Z',
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    expect(r.status).toBe('fail');
  });
});

/* ------------------------------------------------------------------ */
/* 密码策略                                                            */
/* ------------------------------------------------------------------ */
describe('checkPasswordPolicy 密码复杂度真查', () => {
  it('强口令（大小写+数字+符号+长度≥12）通过', () => {
    const r = checkPasswordPolicy('Jlan@2026#Sec');
    expect(r.valid).toBe(true);
    expect(r.status).toBe('pass');
    expect(r.errors).toEqual([]);
  });

  it('常见弱口令 123456 被拦截（长度不足 + 黑名单）', () => {
    const r = checkPasswordPolicy('123456');
    expect(r.valid).toBe(false);
    expect(r.status).toBe('fail');
    expect(r.errors).toContain('命中常见弱口令黑名单');
  });

  it('缺特殊符号被拦截', () => {
    const r = checkPasswordPolicy('Jlan2026');
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('缺少特殊符号');
  });

  it('空口令 / 纯字母 / 纯数字 均不合规', () => {
    expect(checkPasswordPolicy('').valid).toBe(false);
    expect(checkPasswordPolicy('abcdefgh').valid).toBe(false);
    expect(checkPasswordPolicy('12345678').valid).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* 审计日志分析                                                        */
/* ------------------------------------------------------------------ */
describe('auditAccessLog 审计日志真分析', () => {
  const r = auditAccessLog('30d');

  it('窗口内事件总数与样例一致', () => {
    expect(r.totalEvents).toBe(ACCESS_LOG_FIXTURE.length);
  });

  it('真查出失败登录（爆破迹象）', () => {
    expect(r.failedLogins).toBe(2);
    expect(r.anomalies.some((a) => a.includes('爆破'))).toBe(true);
  });

  it('真查出夜间异常访问', () => {
    expect(r.afterHoursEvents).toBe(3);
    expect(r.anomalies.some((a) => a.includes('夜间'))).toBe(true);
  });

  it('真查出批量导出（≥3 次）', () => {
    expect(r.bulkExportEvents).toBe(3);
    expect(r.anomalies.some((a) => a.includes('批量导出'))).toBe(true);
  });

  it('异常 ≥2 类 → 整体 fail（不合规）', () => {
    expect(r.status).toBe('fail');
    expect(r.anomalies.length).toBeGreaterThanOrEqual(2);
  });
});

/* ------------------------------------------------------------------ */
/* 等保三级报告汇总                                                    */
/* ------------------------------------------------------------------ */
describe('buildSecurityComplianceReport 等保三级报告', () => {
  const report = buildSecurityComplianceReport('2026-10-16T00:00:00Z');

  it('标准为等保三级 GB/T 22239-2019', () => {
    expect(report.standard).toBe('等保三级');
    expect(report.standardCode).toBe('GB/T 22239-2019');
    expect(report.generatedAt).toBe('2026-10-16T00:00:00Z');
  });

  it('五大类 15 项控制齐备', () => {
    expect(report.summary.total).toBe(15);
    const domains = new Set(report.checks.map((c) => c.domain));
    expect(domains.has('identity')).toBe(true);
    expect(domains.has('access')).toBe(true);
    expect(domains.has('audit')).toBe(true);
    expect(domains.has('data')).toBe(true);
    expect(domains.has('intrusion')).toBe(true);
  });

  it('五类检查项均覆盖（每类 3 项）', () => {
    for (const d of ['identity', 'access', 'audit', 'data', 'intrusion'] as const) {
      expect(report.byDomain[d].total).toBe(3);
    }
  });

  it('真查结论：2 项不合规（双因素缺失 / 审计分析异常），整体 fail', () => {
    expect(report.summary.fail).toBe(2);
    expect(report.summary.warn).toBe(1);
    expect(report.summary.overall).toBe('fail');
    expect(report.summary.passRate).toBeCloseTo(12 / 15, 5);
  });

  it('每条控制项字段完整', () => {
    for (const c of report.checks) {
      expect(c.id.length).toBeGreaterThan(0);
      expect(c.title.length).toBeGreaterThan(0);
      expect(['pass', 'warn', 'fail']).toContain(c.status);
      expect(c.detail.length).toBeGreaterThan(0);
      expect(c.evidence.length).toBeGreaterThan(0);
      expect(c.recommendation.length).toBeGreaterThan(0);
    }
  });

  it('IAM 快照中确实存在未开 MFA 的 admin（fail 有据可依）', () => {
    expect(USER_SECURITY_DIRECTORY['u-broke-004'].mfaEnabled).toBe(false);
    expect(USER_SECURITY_DIRECTORY['u-broke-004'].roles).toContain('admin');
  });
});
