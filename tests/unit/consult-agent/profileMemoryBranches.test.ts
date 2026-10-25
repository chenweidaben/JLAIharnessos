/**
 * 单元测试 - 长期画像记忆补充分支（补基线未覆盖分支）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖基线未覆盖行：
 * - profileMemory.ts 127-132：药物不耐受事实抽取分支（不耐受 / 不能服用 / 服用后不适）
 * 另覆盖同文件未被既有测试触及的 preferred_language 分支（135-137 行）。
 * 抽取规则为 DEMO 确定性演示规则，不做医学诊断。
 */

import { describe, expect, it } from 'bun:test';

import { extractFactsFromText } from '../../../src/core/agent/consult/memory/profileMemory';

const INTOLERANCE_VALUE = '存在药物不耐受情况（待医师核实）';

describe('profileMemory 药物不耐受事实抽取（基线 127-132 行）', () => {
  it('“不耐受”表述抽取 drug_intolerance 事实，source 透传、updatedAt 落痕', () => {
    const facts = extractFactsFromText('我对磺胺类药物不耐受，想咨询用药建议', 'thread-mem-1');

    const intolerance = facts.find((fact) => fact.key === 'drug_intolerance');
    expect(intolerance).not.toBeUndefined();
    expect(intolerance?.value).toBe(INTOLERANCE_VALUE);
    expect(intolerance?.source).toBe('thread-mem-1');
    expect(intolerance?.updatedAt).toBeTruthy();
  });

  it('“不能服用”表述同样归入 drug_intolerance，不产生过敏史事实', () => {
    const facts = extractFactsFromText('医生说我不能服用青霉素类药物', 'thread-mem-2');

    expect(
      facts.some((fact) => fact.key === 'drug_intolerance' && fact.value === INTOLERANCE_VALUE),
    ).toBe(true);
    expect(facts.some((fact) => fact.key === 'allergy')).toBe(false);
  });

  it('“服用后不适”表述归入 drug_intolerance 事实', () => {
    const facts = extractFactsFromText('我服用后不适，想咨询一下是什么原因', 'thread-mem-3');

    expect(
      facts.some((fact) => fact.key === 'drug_intolerance' && fact.value === INTOLERANCE_VALUE),
    ).toBe(true);
  });

  it('过敏史与不耐受同时出现时两条事实独立落库、互不覆盖', () => {
    const facts = extractFactsFromText('我青霉素过敏，而且不能服用磺胺类药物', 'thread-mem-4');

    expect(facts.some((fact) => fact.key === 'allergy')).toBe(true);
    expect(facts.some((fact) => fact.key === 'drug_intolerance')).toBe(true);
    for (const fact of facts) {
      expect(fact.source).toBe('thread-mem-4');
      expect(fact.updatedAt).toBeTruthy();
    }
  });
});

describe('profileMemory 偏好语言事实抽取（135-137 行补充覆盖）', () => {
  it('英文提示抽取 preferred_language=en 事实', () => {
    const facts = extractFactsFromText('请用 English 回答我的问题', 'thread-mem-5');

    const language = facts.find((fact) => fact.key === 'preferred_language');
    expect(language?.value).toBe('en');
    expect(language?.source).toBe('thread-mem-5');
  });
});
