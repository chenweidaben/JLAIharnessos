/**
 * 健澜科技 jlmedaios - MEDMUSE 多轮对话上下文摘要纯函数单测。
 *
 * 不依赖数据库与 LLM：直接测 contextSummary 导出的纯函数——
 *   1) shouldSummarize：阈值边界（19/20 不触发，21 触发）；
 *   2) summarizeMessages：保留关键实体（诊断结论 / 医嘱决定 / 审批结论）；
 *   3) splitForSummary：早期走摘要、最近保留原文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  shouldSummarize,
  summarizeMessages,
  splitForSummary,
  DEFAULT_SUMMARY_THRESHOLD,
  RECENT_RAW_COUNT,
  type SummarizableMessage,
} from '../../src/bff/agents/contextSummary';

function makeMessages(n: number): SummarizableMessage[] {
  return Array.from({ length: n }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'agent',
    content: `第 ${i + 1} 条常规问答`,
  }));
}

describe('shouldSummarize（阈值边界）', () => {
  it('默认阈值为 20', () => {
    expect(DEFAULT_SUMMARY_THRESHOLD).toBe(20);
  });

  it('19 条：不触发', () => {
    expect(shouldSummarize(makeMessages(19))).toBe(false);
  });

  it('20 条：不触发（严格大于阈值）', () => {
    expect(shouldSummarize(makeMessages(20))).toBe(false);
  });

  it('21 条：触发', () => {
    expect(shouldSummarize(makeMessages(21))).toBe(true);
  });

  it('空数组 / 非法入参不抛错，返回 false', () => {
    expect(shouldSummarize([])).toBe(false);
    expect(shouldSummarize(null as unknown as SummarizableMessage[])).toBe(false);
  });

  it('自定义阈值生效', () => {
    expect(shouldSummarize(makeMessages(5), 4)).toBe(true);
    expect(shouldSummarize(makeMessages(4), 4)).toBe(false);
  });
});

describe('summarizeMessages（关键实体保留）', () => {
  it('保留诊断结论关键实体', () => {
    const msgs: SummarizableMessage[] = [
      { role: 'user', content: '患者咳嗽发热三天，帮忙看看' },
      { role: 'agent', content: '结合胸片与血象，临床诊断考虑社区获得性肺炎，建议抗感染治疗。' },
    ];
    const summary = summarizeMessages(msgs);
    expect(summary).toContain('诊断');
    expect(summary).toContain('社区获得性肺炎');
  });

  it('保留医嘱/治疗决定关键实体', () => {
    const msgs: SummarizableMessage[] = [
      { role: 'user', content: '肺炎患者用药怎么开？' },
      { role: 'agent', content: '医嘱开立：阿莫西林克拉维酸钾 0.6g 静滴 q8h，疗程 7 天。' },
    ];
    const summary = summarizeMessages(msgs);
    expect(summary).toContain('医嘱');
    expect(summary).toContain('阿莫西林');
  });

  it('保留审批结论关键实体', () => {
    const msgs: SummarizableMessage[] = [
      { role: 'user', content: '生成病历草稿需要审批吗？' },
      { role: 'agent', content: '需要审批：工具 createNoteDraft（warning 级）。' },
      { role: 'tool', content: '审批通过：科主任已批准该病历草稿可写入。' },
    ];
    const summary = summarizeMessages(msgs);
    expect(summary).toContain('审批');
    expect(summary).toContain('批准');
  });

  it('包含话题起点与条数头部', () => {
    const msgs = makeMessages(3);
    const summary = summarizeMessages(msgs);
    expect(summary.startsWith('【早期对话摘要·共 3 条消息】')).toBe(true);
    expect(summary).toContain('[话题]');
  });

  it('无关键实体时给出兜底说明，不抛错', () => {
    const summary = summarizeMessages(makeMessages(4));
    expect(summary).toContain('未识别到明确的诊断/医嘱/审批结论');
  });

  it('空数组返回空串', () => {
    expect(summarizeMessages([])).toBe('');
  });
});

describe('splitForSummary（早期摘要 + 最近原文）', () => {
  it('未超阈值：early 为空、recent 为全部、summary 为空串', () => {
    const msgs = makeMessages(19);
    const split = splitForSummary(msgs);
    expect(split.early).toEqual([]);
    expect(split.recent.length).toBe(19);
    expect(split.summary).toBe('');
  });

  it('超阈值：最近 10 条原文保留，其余进摘要', () => {
    const msgs = makeMessages(30);
    const split = splitForSummary(msgs);
    expect(split.recent.length).toBe(RECENT_RAW_COUNT);
    expect(split.early.length).toBe(20);
    expect(split.summary.length).toBeGreaterThan(0);
    // recent 是最后 10 条
    expect(split.recent[0]).toEqual(msgs[20]);
    expect(split.recent[9]).toEqual(msgs[29]);
  });
});
