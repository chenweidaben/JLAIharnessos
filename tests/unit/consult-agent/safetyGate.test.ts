/**
 * 单元测试 - 安全等级评估与急症旁路判定（契约 §4.2）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import { evaluateSafety } from '../../../src/core/agent/consult/safety/safetyGate';

describe('safetyGate 安全门', () => {
  it('命中急症词表返回 acute 并列出命中词', () => {
    const verdict = evaluateSafety('我突然胸痛，伴有大汗和呼吸困难');
    expect(verdict.level).toBe('acute');
    expect(verdict.matched).toContain('胸痛');
  });

  it('长期慢病急性加重表述返回 caution', () => {
    const verdict = evaluateSafety('我最近症状加重，反复头晕，疼痛持续不缓解');
    expect(verdict.level).toBe('caution');
    expect(verdict.matched.length).toBeGreaterThan(0);
  });

  it('普通咨询返回 normal 且无命中词', () => {
    const verdict = evaluateSafety('我想咨询一下普通感冒后咳嗽怎么护理');
    expect(verdict.level).toBe('normal');
    expect(verdict.matched).toEqual([]);
  });

  it('急症判定优先于 caution 关键词', () => {
    const verdict = evaluateSafety('高血压加重后出现剧烈胸痛、休克表现');
    expect(verdict.level).toBe('acute');
  });

  it('空文本返回 normal', () => {
    expect(evaluateSafety('').level).toBe('normal');
  });
});
