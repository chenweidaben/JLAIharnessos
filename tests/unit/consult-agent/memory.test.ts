/**
 * 单元测试 - 双层记忆：短期滑窗 + 长期画像事实合并（契约 §7）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  createProfileMemory,
  extractFactsFromText,
  listFacts,
  mergeFacts,
  upsertFact,
} from '../../../src/core/agent/consult/memory/profileMemory';
import { checkpoint, recentMessages } from '../../../src/core/agent/consult/memory/shortTermMemory';
import { nowIso } from '../../../src/core/agent/consult/roleSupport';
import type { ConsultMessage, ProfileFact } from '../../../src/core/agent/consult/types';
import { makeMessage } from './helpers';

function makeMessages(count: number): ConsultMessage[] {
  return Array.from({ length: count }, (_, index) =>
    makeMessage({ id: `msg-${index}`, content: `第 ${index + 1} 条消息` }),
  );
}

describe('shortTermMemory 短期记忆', () => {
  it('recentMessages 保留最近 n 条并保持时间顺序', () => {
    const history = makeMessages(25);
    const recent = recentMessages(history, 20);
    expect(recent.length).toBe(20);
    expect(recent[0].content).toBe('第 6 条消息');
    expect(recent[recent.length - 1].content).toBe('第 25 条消息');
  });

  it('n 为 0 时返回空数组', () => {
    expect(recentMessages(makeMessages(5), 0)).toEqual([]);
  });

  it('checkpoint 记录线程 ID、消息条数与快照', () => {
    const messages = makeMessages(3);
    const entry = checkpoint('thread-test', messages);
    expect(entry.threadId).toBe('thread-test');
    expect(entry.messageCount).toBe(3);
    expect(entry.messages.length).toBe(3);
  });
});

describe('profileMemory 长期画像', () => {
  it('mergeFacts 同键以更新者为准，新事实追加末尾', () => {
    const existing: ProfileFact[] = [
      {
        key: 'allergy',
        value: '青霉素过敏（待核实）',
        source: 't1',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        key: 'preferred_language',
        value: 'zh',
        source: 't1',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const updates: ProfileFact[] = [
      {
        key: 'allergy',
        value: '头孢过敏（待核实）',
        source: 't2',
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
      {
        key: 'chronic_condition',
        value: '高血压',
        source: 't2',
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
    ];
    const merged = mergeFacts(existing, updates);
    expect(merged.find((fact) => fact.key === 'allergy')?.value).toBe('头孢过敏（待核实）');
    expect(merged.find((fact) => fact.key === 'chronic_condition')?.value).toBe('高血压');
    expect(merged.find((fact) => fact.key === 'preferred_language')?.value).toBe('zh');
    expect(merged.map((fact) => fact.key)).toEqual([
      'allergy',
      'preferred_language',
      'chronic_condition',
    ]);
  });

  it('旧事实 updatedAt 更旧时不覆盖新事实', () => {
    const existing: ProfileFact[] = [
      { key: 'allergy', value: '新记录', source: 't2', updatedAt: '2026-02-01T00:00:00.000Z' },
    ];
    const stale: ProfileFact[] = [
      { key: 'allergy', value: '旧记录', source: 't1', updatedAt: '2026-01-01T00:00:00.000Z' },
    ];
    expect(mergeFacts(existing, stale)[0].value).toBe('新记录');
  });

  it('upsertFact 不可变更新画像事实', () => {
    const profile = createProfileMemory('u-1', 't-1');
    const updated = upsertFact(profile, {
      key: 'chronic_condition',
      value: '糖尿病',
      source: 't-1',
      updatedAt: nowIso(),
    });
    expect(listFacts(updated).some((fact) => fact.key === 'chronic_condition')).toBe(true);
    expect(listFacts(profile)).toEqual([]);
  });

  it('extractFactsFromText 确定性抽取过敏史与慢性病事实', () => {
    const facts = extractFactsFromText('我青霉素过敏，有高血压病史，正在咨询用药', 'thread-1');
    expect(facts.some((fact) => fact.key === 'allergy')).toBe(true);
    expect(facts.some((fact) => fact.key === 'chronic_condition' && fact.value === '高血压')).toBe(
      true,
    );
    for (const fact of facts) {
      expect(fact.source).toBe('thread-1');
      expect(fact.updatedAt).toBeTruthy();
    }
  });

  it('无特征文本返回空事实列表', () => {
    expect(extractFactsFromText('你好，我想随便聊聊', 'thread-1')).toEqual([]);
  });

  it('listFacts 返回事实副本，修改返回值不影响画像', () => {
    const profile = createProfileMemory('u-1');
    profile.facts = [{ key: 'allergy', value: 'x', source: 's', updatedAt: nowIso() }];
    const facts = listFacts(profile);
    facts.pop();
    expect(profile.facts.length).toBe(1);
  });
});
