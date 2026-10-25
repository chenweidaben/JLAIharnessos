/**
 * 单元测试 - 急症词表与命中检测（契约 §4.1）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  ACUTE_KEYWORDS,
  detectAcute,
} from '../../../src/core/agent/consult/safety/acuteVocabulary';

describe('acuteVocabulary 急症词表', () => {
  it('冻结词表覆盖契约所列急症条目且不得为空', () => {
    expect(ACUTE_KEYWORDS.length).toBeGreaterThanOrEqual(38);
    for (const keyword of [
      '胸痛',
      '呼吸困难',
      '意识丧失',
      '偏瘫',
      '抽搐',
      '大出血',
      '过敏性休克',
      '孕妇腹痛',
    ]) {
      expect(ACUTE_KEYWORDS).toContain(keyword);
    }
  });

  it('命中胸痛 / 呼吸困难应判定为急症并返回命中词', () => {
    const result = detectAcute('我现在胸痛得厉害，感觉呼吸困难');
    expect(result.isAcute).toBe(true);
    expect(result.matched).toContain('胸痛');
    expect(result.matched).toContain('呼吸困难');
  });

  it('中风 / 口角歪斜等神经急症应命中', () => {
    const result = detectAcute('老人突然口角歪斜、言语不清');
    expect(result.isAcute).toBe(true);
    expect(result.matched).toContain('口角歪斜');
  });

  it('普通症状文本不应判定为急症', () => {
    const result = detectAcute('我有点咳嗽，偶尔头晕');
    expect(result.isAcute).toBe(false);
    expect(result.matched).toEqual([]);
  });

  it('空文本不命中', () => {
    expect(detectAcute('').isAcute).toBe(false);
    expect(detectAcute('   ').matched).toEqual([]);
  });

  it('命中词保持词表顺序去重', () => {
    const result = detectAcute('胸痛又胸痛，伴有呼吸困难');
    expect(result.matched.filter((item) => item === '胸痛').length).toBe(1);
  });
});
