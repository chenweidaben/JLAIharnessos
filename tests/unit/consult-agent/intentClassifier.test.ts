/**
 * 单元测试 - 意图分类器（契约 §3）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import { classifyIntent } from '../../../src/core/agent/consult/intentClassifier';
import { makeMessage } from './helpers';

describe('intentClassifier 意图分类', () => {
  it('问候意图命中问候词', () => {
    const result = classifyIntent('你好，在吗？', []);
    expect(result.intent).toBe('greeting');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.matched).toContain('你好');
  });

  it('退出意图命中退出词', () => {
    const result = classifyIntent('我要退出会话，再见', []);
    expect(result.intent).toBe('exit');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('文档上传意图命中报告 / 化验单等词', () => {
    const result = classifyIntent('我上传了化验单和影像报告', []);
    expect(result.intent).toBe('document_upload');
    expect(result.matched.length).toBeGreaterThan(0);
  });

  it('用药咨询意图命中药 / 剂量 / 能否同服', () => {
    const result = classifyIntent('这个药剂量多少，能否同服？', []);
    expect(result.intent).toBe('medication_question');
  });

  it('慢病管理意图命中随访 / 血压 / 血糖 / 复查', () => {
    const result = classifyIntent('我高血压随访，最近要复查血糖', []);
    expect(result.intent).toBe('chronic_management');
  });

  it('症状主诉意图命中头晕 / 乏力等主诉词', () => {
    const result = classifyIntent('我头晕乏力两天了', []);
    expect(result.intent).toBe('symptom_report');
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('急症词直接归类为 acute_emergency，优先于症状主诉', () => {
    const result = classifyIntent('我胸痛，呼吸困难，大汗', []);
    expect(result.intent).toBe('acute_emergency');
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.matched).toContain('胸痛');
    expect(result.matched).toContain('呼吸困难');
  });

  it('上一轮 Examiner 追问后的补充回答归为 clarification_answer', () => {
    const history = [
      makeMessage({ role: 'user', content: '我不舒服' }),
      makeMessage({ role: 'assistant', roleKind: 'examiner', content: '症状出现多久了？' }),
    ];
    const result = classifyIntent('我咳嗽两天了，有点乏力', history);
    expect(result.intent).toBe('clarification_answer');
  });

  it('无关键词命中且不在追问上下文时兜底为 unknown', () => {
    const result = classifyIntent('今天天气怎么样', []);
    expect(result.intent).toBe('unknown');
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('置信度始终处于 0 到 1 区间', () => {
    const cases = ['你好', '胸痛', '我头晕乏力', '随便聊聊'];
    for (const text of cases) {
      const result = classifyIntent(text, []);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('空文本返回 unknown 低置信度', () => {
    const result = classifyIntent('   ', []);
    expect(result.intent).toBe('unknown');
    expect(result.confidence).toBeLessThan(0.5);
  });
});
