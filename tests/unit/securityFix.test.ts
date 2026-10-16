/**
 * 健澜科技 jlmedaios - M167-A 安全漏洞修复：SQL 注入与 XSS 修复验证纯函数单元测试
 *
 * 覆盖：
 *  - verifyNoSQLInjection：修复后基线全绿（参数化 $n 占位、零 ${} 插值 / 拼接）；
 *      反例 ${name} 插值 与 ' + var 拼接 被真检命中
 *  - verifyNoXSS：修复后基线全绿（dangerouslySetInnerHTML 全部 escapeHtml / sanitize）；
 *      反例原始变量直出被真检命中
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  POST_FIX_BASELINE,
  verifyNoSQLInjection,
  verifyNoXSS,
  type CodeFile,
} from '../../src/bff/aggregators/securityFixAggregator.js';

describe('verifyNoSQLInjection：SQL 注入修复复验', () => {
  it('修复后基线：全部参数化，零插值零拼接，合规分 100', () => {
    const r = verifyNoSQLInjection();
    expect(r.passed).toBe(true);
    expect(r.score).toBe(100);
    expect(r.findings).toHaveLength(0);
    // 基线确有 $n 占位（佐证已参数化）
    expect(r.placeholdersUsed).toBeGreaterThanOrEqual(10);
    expect(r.scannedStatements).toBeGreaterThan(0);
    expect(r.copyright).toBe('杭州健澜科技有限公司');
  });

  it('反例：${} 模板插值被真检命中为 template_interpolation', () => {
    const bad: CodeFile = {
      path: 'tmp/vulnerable.ts',
      // 双引号字符串内 ${name} 为字面量（不触发模板插值），模拟修复前拼接
      content: "const q = `SELECT * FROM patients WHERE name = '${name}'`;",
    };
    const r = verifyNoSQLInjection([bad]);
    expect(r.passed).toBe(false);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].pattern).toBe('template_interpolation');
    expect(r.findings[0].reason).toContain('插值');
    expect(r.findings[0].snippet).toContain('${name}');
    expect(r.score).toBeLessThan(100);
  });

  it('反例：字符串拼接被真检命中为 string_concat', () => {
    const bad: CodeFile = {
      path: 'tmp/concat.ts',
      content: "const q = 'SELECT * FROM audit WHERE actor = ' + actor;",
    };
    const r = verifyNoSQLInjection([bad]);
    expect(r.passed).toBe(false);
    expect(r.findings.some((f) => f.pattern === 'string_concat')).toBe(true);
  });

  it('纯参数化语句（$1/$2）不误报', () => {
    const good: CodeFile = {
      path: 'tmp/ok.ts',
      content: "const q = 'SELECT id FROM orders WHERE patient_id = $1 AND status = $2';",
    };
    const r = verifyNoSQLInjection([good]);
    expect(r.passed).toBe(true);
    expect(r.placeholdersUsed).toBe(2);
  });

  it('确定性：同入参多次调用结果一致', () => {
    expect(JSON.stringify(verifyNoSQLInjection())).toBe(JSON.stringify(verifyNoSQLInjection()));
  });
});

describe('verifyNoXSS：XSS 输出转义修复复验', () => {
  it('修复后基线：dangerouslySetInnerHTML 全部转义/消毒，合规分 100', () => {
    const r = verifyNoXSS();
    expect(r.passed).toBe(true);
    expect(r.score).toBe(100);
    expect(r.findings).toHaveLength(0);
    // 基线 3 处 dangerouslySetInnerHTML、3 处 escapeHtml 调用
    expect(r.scannedDangerously).toBe(3);
    expect(r.escapedCount).toBe(3);
    expect(r.copyright).toBe('杭州健澜科技有限公司');
  });

  it('反例：dangerouslySetInnerHTML 原始变量直出被真检命中', () => {
    const bad: CodeFile = {
      path: 'tmp/xss.tsx',
      content: 'const el = <div dangerouslySetInnerHTML={{ __html: userBio }} />;',
    };
    const r = verifyNoXSS([bad]);
    expect(r.passed).toBe(false);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].rawExpression.trim()).toBe('userBio');
    expect(r.findings[0].reason).toContain('未转义');
  });

  it('escapeHtml 包裹的 dangerouslySetInnerHTML 不误报', () => {
    const good: CodeFile = {
      path: 'tmp/safe.tsx',
      content: 'const el = <div dangerouslySetInnerHTML={{ __html: escapeHtml(bio) }} />;',
    };
    const r = verifyNoXSS([good]);
    expect(r.passed).toBe(true);
    expect(r.findings).toHaveLength(0);
    expect(r.escapedCount).toBe(1);
  });

  it('DOMPurify.sanitize 消毒的不误报', () => {
    const good: CodeFile = {
      path: 'tmp/safe2.tsx',
      content: 'const el = <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;',
    };
    const r = verifyNoXSS([good]);
    expect(r.passed).toBe(true);
    expect(r.findings).toHaveLength(0);
  });

  it('确定性：同入参多次调用结果一致', () => {
    expect(JSON.stringify(verifyNoXSS())).toBe(JSON.stringify(verifyNoXSS()));
  });
});

describe('基线语料完整性', () => {
  it('内置修复后基线含 SQL 与前端两类文件', () => {
    expect(POST_FIX_BASELINE.length).toBeGreaterThanOrEqual(5);
  });
});
