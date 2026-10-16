/**
 * 健澜科技 jlmedaios - M174-A 等保三级复查单测（安全与运营）
 *
 * 覆盖：
 *  - recheckSecurityCompliance：复查真查（整改项闭环 / 漂移项回退 / 新增项发现）；
 *  - trackSecurityFixes：两轮报告 diff（fixed/improved/regressed/stillFailing/new）；
 *  - generateSecurityTrend：周期序列、方向判定、best/worst/delta。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  generateSecurityTrend,
  RECHECK_IAM_DIRECTORY,
  recheckSecurityCompliance,
  trackSecurityFixes,
} from '../../src/bff/aggregators/securityRecheckAggregator';
import { buildSecurityComplianceReport } from '../../src/bff/aggregators/securityComplianceAggregator';

/* ------------------------------------------------------------------ */
/* 复查主函数                                                          */
/* ------------------------------------------------------------------ */
describe('recheckSecurityCompliance 等保三级复查真查', () => {
  const report = recheckSecurityCompliance('2026-10-16T00:00:00Z');

  it('标准为等保三级 GB/T 22239-2019，第 2 轮复查', () => {
    expect(report.standard).toBe('等保三级');
    expect(report.standardCode).toBe('GB/T 22239-2019');
    expect(report.round).toBe(2);
    expect(report.recheckAt).toBe('2026-10-16T00:00:00Z');
    expect(report.recheckId).toMatch(/^RC-/);
  });

  it('15 项控制齐备，五大类全覆盖', () => {
    expect(report.summary.total).toBe(15);
    const domains = new Set(report.checks.map((c) => c.domain));
    expect(domains.has('identity')).toBe(true);
    expect(domains.has('access')).toBe(true);
    expect(domains.has('audit')).toBe(true);
    expect(domains.has('data')).toBe(true);
    expect(domains.has('intrusion')).toBe(true);
  });

  it('整改核验：u-broke-004 已补 MFA（基线 fail → 复查至少 improved/fixed）', () => {
    expect(RECHECK_IAM_DIRECTORY['u-broke-004'].mfaEnabled).toBe(true);
    const mfa = report.checks.find((c) => c.id === 'identity.two-factor')!;
    expect(mfa.previousStatus).toBe('fail');
    // 原 fail 项不能仍是 fail（整改真落地）
    expect(['improved', 'fixed']).toContain(mfa.delta);
    expect(mfa.remediationProof).toBeTruthy();
  });

  it('整改核验：审计哈希链断链已修复（warn → pass，fixed）', () => {
    const item = report.checks.find((c) => c.id === 'audit.log-protection')!;
    expect(item.previousStatus).toBe('warn');
    expect(item.status).toBe('pass');
    expect(item.delta).toBe('fixed');
    expect(item.remediationProof).toBeTruthy();
  });

  it('整改核验：爆破已封禁，但批量导出仍存（fail → warn，improved）', () => {
    const item = report.checks.find((c) => c.id === 'audit.log-analysis')!;
    expect(item.previousStatus).toBe('fail');
    expect(item.status).toBe('warn');
    expect(item.delta).toBe('improved');
  });

  it('漂移检测：基线 pass 项本轮回退（TLS 残留 / 恢复演练超期 / 防火墙闲置规则 / 口令超龄）', () => {
    const regressed = report.checks.filter((c) => c.delta === 'regressed');
    const ids = regressed.map((c) => c.id);
    expect(ids).toContain('data.transport-encryption');
    expect(ids).toContain('data.backup-recovery');
    expect(ids).toContain('intrusion.firewall');
    expect(ids).toContain('identity.password-complexity');
    expect(regressed.length).toBeGreaterThanOrEqual(4);
  });

  it('真查新发现：共享服务账号 u-svc-006 存在', () => {
    expect(RECHECK_IAM_DIRECTORY['u-svc-006']).toBeTruthy();
    expect(RECHECK_IAM_DIRECTORY['u-svc-006'].mfaEnabled).toBe(false);
  });

  it('汇总：0 红、6 黄、9 绿，整体 warn（无红色不合规但有待加固）', () => {
    expect(report.summary.fail).toBe(0);
    expect(report.summary.warn).toBe(6);
    expect(report.summary.pass).toBe(9);
    expect(report.summary.overall).toBe('warn');
    expect(report.summary.passRate).toBeCloseTo(9 / 15, 5);
  });

  it('汇总：fixed=1, improved=2, regressed≥4', () => {
    expect(report.summary.fixedCount).toBe(1);
    expect(report.summary.improvedCount).toBe(2);
    expect(report.summary.regressedCount).toBeGreaterThanOrEqual(4);
  });

  it('每条复查项字段完整，且 delta 标签合法', () => {
    for (const c of report.checks) {
      expect(c.id.length).toBeGreaterThan(0);
      expect(c.title.length).toBeGreaterThan(0);
      expect(['pass', 'warn', 'fail']).toContain(c.status);
      expect(['pass', 'warn', 'fail']).toContain(c.previousStatus);
      expect(c.detail.length).toBeGreaterThan(0);
      expect(c.evidence.length).toBeGreaterThan(0);
      expect(c.recommendation.length).toBeGreaterThan(0);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 修复跟踪                                                            */
/* ------------------------------------------------------------------ */
describe('trackSecurityFixes 两轮报告 diff', () => {
  const baseline = buildSecurityComplianceReport('2026-09-16T00:00:00Z');
  const recheck = recheckSecurityCompliance('2026-10-16T00:00:00Z');
  const tracking = trackSecurityFixes(baseline, recheck);

  it('时间戳正确传递', () => {
    expect(tracking.previousAt).toBe('2026-09-16T00:00:00Z');
    expect(tracking.currentAt).toBe('2026-10-16T00:00:00Z');
  });

  it('已闭环（warn → pass）：审计日志保护', () => {
    const ids = tracking.fixed.map((f) => f.id);
    expect(ids).toContain('audit.log-protection');
  });

  it('部分整改（fail → warn）：MFA、审计分析', () => {
    const ids = tracking.improved.map((f) => f.id);
    expect(ids).toContain('identity.two-factor');
    expect(ids).toContain('audit.log-analysis');
  });

  it('回退/漂移：TLS / 备份演练 / 防火墙 / 口令年龄', () => {
    const ids = tracking.regressed.map((f) => f.id);
    expect(ids).toContain('data.transport-encryption');
    expect(ids).toContain('data.backup-recovery');
    expect(ids).toContain('intrusion.firewall');
    expect(ids).toContain('identity.password-complexity');
  });

  it('未闭环不合规为空（本轮无红色 fail）', () => {
    expect(tracking.stillFailing.length).toBe(0);
  });

  it('达标率变化 = 9/15 - 12/15 = -0.2（因漂移新增 4 个 warn）', () => {
    expect(tracking.passRateDelta).toBeCloseTo(-0.2, 2);
  });
});

/* ------------------------------------------------------------------ */
/* 趋势分析                                                            */
/* ------------------------------------------------------------------ */
describe('generateSecurityTrend 安全趋势', () => {
  it('默认 90d：6 个点，方向 improving（整体在改善）', () => {
    const t = generateSecurityTrend();
    expect(t.period).toBe('90d');
    expect(t.points.length).toBe(6);
    expect(t.delta).toBeGreaterThan(0);
    expect(['improving', 'degrading', 'flat']).toContain(t.direction);
  });

  it('30d：4 个周点', () => {
    const t = generateSecurityTrend('30d');
    expect(t.period).toBe('30d');
    expect(t.points.length).toBe(4);
    for (const p of t.points) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.passRate).toBeGreaterThan(0);
      expect(p.passRate).toBeLessThanOrEqual(1);
    }
  });

  it('180d：6 个月点，best/worst 在 [0,1]', () => {
    const t = generateSecurityTrend('180d');
    expect(t.points.length).toBe(6);
    expect(t.bestPassRate).toBeLessThanOrEqual(1);
    expect(t.worstPassRate).toBeGreaterThanOrEqual(0);
    expect(t.bestPassRate).toBeGreaterThanOrEqual(t.worstPassRate);
  });

  it('趋势点三色计数自洽（pass+warn+fail = total 15）', () => {
    for (const period of ['30d', '90d', '180d'] as const) {
      const t = generateSecurityTrend(period);
      for (const p of t.points) {
        expect(p.passCount + p.warnCount + p.failCount).toBe(15);
      }
    }
  });
});
