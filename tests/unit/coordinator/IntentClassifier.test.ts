/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - IntentClassifier 意图分类器
 */

import { describe, it, expect } from 'bun:test';
import { IntentClassifier } from '@/core/coordinator/IntentClassifier';

describe('IntentClassifier', () => {
  const classifier = new IntentClassifier();

  it('应识别病历书写意图', () => {
    const result = classifier.classify('帮我写个病程记录');
    expect(result[0].primaryIntent).toBe('病历书写');
    expect(result[0].confidence).toBeGreaterThan(0.6);
    expect(result[0].matchedKeywords).toContain('病程记录');
  });

  it('应识别检验查询意图', () => {
    const result = classifier.classify('帮我看一下血常规这个指标有什么问题');
    expect(result[0].primaryIntent).toBe('检验查询');
  });

  it('应识别诊断建议意图', () => {
    const result = classifier.classify('帮我分析一下这个病例可能是什么病');
    expect(result[0].primaryIntent).toBe('诊断建议');
  });

  it('应识别用药咨询意图', () => {
    const result = classifier.classify('这个药和那个药能一起吃吗，有没有相互作用');
    const intents = result.map((r) => r.primaryIntent);
    expect(intents).toContain('用药咨询');
  });

  it('急诊关键词应提升置信度', () => {
    const normal = classifier.classify('这位患者考虑什么诊断');
    const emergency = classifier.classify('急诊这位胸痛患者考虑什么诊断');
    expect(emergency[0].confidence).toBeGreaterThanOrEqual(normal[0].confidence);
    expect(classifier.isEmergency('急诊胸痛患者')).toBe(true);
  });

  it('应支持多意图识别', () => {
    const result = classifier.classify('写病程记录，顺便检查一下病历质量');
    expect(result.length).toBeGreaterThanOrEqual(2);
    const intents = result.map((r) => r.primaryIntent);
    expect(intents).toContain('病历书写');
    expect(intents).toContain('质控检查');
  });

  it('空输入应返回空列表', () => {
    expect(classifier.classify('')).toEqual([]);
    expect(classifier.classify('   ')).toEqual([]);
  });

  it('无命中时应兜底返回问诊意图', () => {
    const result = classifier.classify('今天天气不错');
    expect(result[0].primaryIntent).toBe('问诊');
    expect(result[0].confidence).toBeLessThan(0.5);
  });

  it('置信度应在 0-1 之间', () => {
    const result = classifier.classify('帮我写个病程记录，生成出院小结');
    for (const r of result) {
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('应暴露全部支持的意图类型', () => {
    expect(classifier.supportedIntents).toContain('病历书写');
    expect(classifier.supportedIntents).toContain('科研分析');
    expect(classifier.supportedIntents.length).toBe(16);
  });
});
