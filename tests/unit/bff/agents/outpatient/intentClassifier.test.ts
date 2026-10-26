/**
 * S-09 门诊意图分流规则单测（4.2.3 intent-classify）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';
import { classifyIntent } from '@/bff/agents/outpatient/intentClassifier.js';
import type { FactSnapshot } from '@/security/ai/types.js';
import { dialogue, demoFacts } from './fixtures.js';

const emptyFacts: FactSnapshot = { diagnoses: [], medications: [] };

describe('门诊意图分流 classifyIntent', () => {
  it('首诊主诉命中初诊意图，就诊类型为 initial', () => {
    const result = classifyIntent({
      dialogue: dialogue([['patient', '第一次来看，头痛三天，以前没看过。', 1]]),
      facts: emptyFacts,
    });
    expect(result.intent).toBe('initial');
    expect(result.encounterKind).toBe('initial');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('复诊关键词命中复诊意图，就诊类型为 follow-up', () => {
    const result = classifyIntent({
      dialogue: dialogue([['patient', '上次开的药吃完了，回来复诊看看。', 1]]),
      facts: emptyFacts,
    });
    expect(result.intent).toBe('follow-up');
    expect(result.encounterKind).toBe('follow-up');
  });

  it('续方关键词映射为 renewal，文书流归入 follow-up', () => {
    const result = classifyIntent({
      dialogue: dialogue([['patient', '帮我续方，降压药快吃完了。', 1]]),
      facts: emptyFacts,
    });
    expect(result.intent).toBe('renewal');
    expect(result.encounterKind).toBe('follow-up');
    expect(result.reasons.join('；')).toContain('复诊');
  });

  it('检验解读请求映射为 lab-review，文书流归入 follow-up', () => {
    const result = classifyIntent({
      dialogue: dialogue([['patient', '帮我看看这张化验单上的指标。', 1]]),
      facts: emptyFacts,
    });
    expect(result.intent).toBe('lab-review');
    expect(result.encounterKind).toBe('follow-up');
  });

  it('事实快照存在既往诊断时，无明确信号也倾向复诊', () => {
    const facts: FactSnapshot = { ...demoFacts, diagnoses: ['高血压'], medications: ['氨氯地平'] };
    const result = classifyIntent({ dialogue: dialogue([['patient', '还是老毛病。', 1]]), facts });
    expect(result.intent).toBe('follow-up');
    expect(result.encounterKind).toBe('follow-up');
  });

  it('注入模型判定占位时优先采用模型结果，并在 reasons 标注', () => {
    const result = classifyIntent({
      dialogue: dialogue([['patient', '最近有点不舒服。', 1]]),
      facts: emptyFacts,
      modelJudge: () => 'renewal',
    });
    expect(result.intent).toBe('renewal');
    expect(result.encounterKind).toBe('follow-up');
    expect(result.reasons.join('；')).toContain('模型判定');
  });

  it('模型判定返回非法值时回退规则口径', () => {
    const result = classifyIntent({
      dialogue: dialogue([['patient', '第一次来看，头痛三天。', 1]]),
      facts: emptyFacts,
      modelJudge: () => 'unknown' as never,
    });
    expect(result.intent).toBe('initial');
    expect(result.reasons.join('；')).toContain('回退规则');
  });
});
