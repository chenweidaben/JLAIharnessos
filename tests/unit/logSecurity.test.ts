/**
 * 健澜科技 jlmedaios - M167-C 信息泄露修复与日志安全纯函数单元测试
 *
 * 覆盖：
 *  - redactPIIInLog：身份证号 / 手机号 / 银行卡号脱敏，无 PII 残留
 *  - safeErrorResponse：生产环境不下发 err.stack / SQL，非生产保留排障信息
 *  - verifyNoPIIInLog：基线样本真检、报告本身无二次泄露、干净样本全通过
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  redactPIIInLog,
  safeErrorResponse,
  verifyNoPIIInLog,
} from '../../src/bff/aggregators/logSecurityAggregator.js';

/** 原始 PII 是否仍残留（≥11 位连续数字即视为可能残留） */
function hasRawPIIDigits(text: string): boolean {
  return /\d{11,}/.test(text);
}

describe('redactPIIInLog：日志 PII 脱敏', () => {
  it('身份证号：前 4 后 4、中间打码，原始号码不复现', () => {
    const out = redactPIIInLog('idCard=330106194903057712');
    expect(out).toContain('3301');
    expect(out).toContain('7712');
    expect(out).toContain('*');
    expect(out).not.toContain('330106194903057712');
    expect(hasRawPIIDigits(out)).toBe(false);
  });

  it('手机号：前 3 后 4 打码', () => {
    const out = redactPIIInLog('phone=13812345678');
    expect(out).toBe('phone=138****5678');
    expect(hasRawPIIDigits(out)).toBe(false);
  });

  it('银行卡号（16-19 位）：前 4 后 4 打码', () => {
    const out = redactPIIInLog('bankCard=6222020200112233445');
    expect(out).toContain('6222');
    expect(out).toContain('3445');
    expect(out).toContain('*');
    expect(out).not.toContain('6222020200112233445');
  });

  it('一行多类 PII 同时脱敏（身份证 + 手机号）', () => {
    const out = redactPIIInLog('患者 张三 idCard=330106194903057712 phone=13812345678 建档成功');
    expect(out).toContain('3301**********7712');
    expect(out).toContain('138****5678');
    expect(out).not.toContain('330106194903057712');
    expect(out).not.toContain('13812345678');
    // 非 PII 文本原样保留
    expect(out).toContain('患者 张三');
  });

  it('无 PII 的日志原样返回', () => {
    const line = '2026-10-16T09:05:00 INFO 系统心跳 pid=3124 uptime=3600';
    expect(redactPIIInLog(line)).toBe(line);
  });

  it('空值 / 非字符串输入不抛错', () => {
    // @ts-expect-error 故意传入空值以校验运行时防御
    expect(redactPIIInLog(undefined)).toBe('');
    expect(redactPIIInLog('')).toBe('');
  });

  it('脱敏后整行无任何 PII 可再命中', () => {
    const raw = 'idCard=330106194903057712 phone=13998765432 bankCard=6222000011112222';
    const out = redactPIIInLog(raw);
    expect(hasRawPIIDigits(out)).toBe(false);
  });
});

describe('safeErrorResponse：安全错误响应', () => {
  it('生产环境：不下发 err.stack，原始错误含 SQL 时替换为通用文案', () => {
    const err = new Error('db failed: SELECT * FROM users WHERE id=1');
    const res = safeErrorResponse(err, 'production');
    expect(res.productionSafe).toBe(true);
    expect(res.stack).toBeUndefined();
    expect(res.sqlDetected).toBe(true);
    expect(res.message).not.toContain('SELECT');
    expect(res.message).not.toContain('WHERE');
    expect(res.message).not.toContain('users');
  });

  it('prod 别名同样按生产收敛', () => {
    const res = safeErrorResponse(new Error('boom\nat App (app.ts:1:1)'), 'prod');
    expect(res.productionSafe).toBe(true);
    expect(res.stack).toBeUndefined();
  });

  it('非生产环境：保留 message 与 stack 便于排障', () => {
    const err = new Error('boom');
    const res = safeErrorResponse(err, 'development');
    expect(res.productionSafe).toBe(false);
    expect(res.message).toBe('boom');
    expect(typeof res.stack).toBe('string');
  });

  it('生产环境普通错误也不带堆栈', () => {
    const res = safeErrorResponse(new Error('connection reset'), 'production');
    expect(res.stack).toBeUndefined();
    expect(res.message).not.toContain('connection reset');
  });

  it('HTTP 状态码从 error.status 推断，默认 500', () => {
    expect(safeErrorResponse({ status: 404 }, 'production').status).toBe(404);
    expect(safeErrorResponse(new Error('x'), 'production').status).toBe(500);
  });

  it('非 Error 输入（字符串 / 未知对象）不抛错', () => {
    const dev = safeErrorResponse('just a string', 'development');
    expect(dev.message).toBe('just a string');
    const prod = safeErrorResponse({ weird: true }, 'production');
    expect(prod.productionSafe).toBe(true);
  });
});

describe('verifyNoPIIInLog：日志 PII 验证', () => {
  it('基线样本：6 行真检出 4 处命中（身份证 1 / 手机号 2 / 银行卡 1）', () => {
    const report = verifyNoPIIInLog();
    expect(report.summary.checkedLines).toBe(6);
    expect(report.summary.totalFindings).toBe(4);
    expect(report.summary.idCard).toBe(1);
    expect(report.summary.phone).toBe(2);
    expect(report.summary.bankCard).toBe(1);
    expect(report.summary.pass).toBe(false);
  });

  it('报告本身不二次泄露：发现项证据与行预览均已脱敏', () => {
    const report = verifyNoPIIInLog();
    for (const f of report.findings) {
      expect(f.redactedEvidence).toContain('*');
      expect(hasRawPIIDigits(f.redactedLinePreview)).toBe(false);
    }
  });

  it('修复对照：3 条问题日志均有「脱敏前 → 脱敏后」样例', () => {
    const report = verifyNoPIIInLog();
    expect(report.redactionSamples.length).toBe(3);
    for (const s of report.redactionSamples) {
      expect(hasRawPIIDigits(s.after)).toBe(false);
    }
  });

  it('干净样本：零命中即通过、安全分满分', () => {
    const clean = [
      'INFO 用户登录成功 userId=u_1001',
      'INFO 处方开具 patientId=p_8899',
      'INFO 系统心跳 ok=true',
    ];
    const report = verifyNoPIIInLog(clean);
    expect(report.summary.checkedLines).toBe(3);
    expect(report.summary.totalFindings).toBe(0);
    expect(report.summary.pass).toBe(true);
    expect(report.summary.score).toBe(100);
    expect(report.findings).toHaveLength(0);
  });

  it('自定义样本：传入即对传入样本真检', () => {
    const report = verifyNoPIIInLog(['mobile=13812345678', 'clean line']);
    expect(report.summary.checkedLines).toBe(2);
    expect(report.summary.totalFindings).toBe(1);
    expect(report.summary.phone).toBe(1);
  });

  it('安全分随命中扣分且有底线', () => {
    const report = verifyNoPIIInLog();
    // 4 处命中：100 - 4*12 = 52
    expect(report.summary.score).toBe(52);
    expect(report.summary.score).toBeGreaterThanOrEqual(0);
  });

  it('确定性：同参多次调用结果一致', () => {
    const a = verifyNoPIIInLog();
    const b = verifyNoPIIInLog();
    expect(a.summary).toEqual(b.summary);
    expect(a.findings.map((f) => f.redactedEvidence)).toEqual(b.findings.map((f) => f.redactedEvidence));
  });
});
