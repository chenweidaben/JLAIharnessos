/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - RuleEvaluator 规则评估器
 */

import { describe, it, expect } from 'bun:test';
import { RuleEvaluator } from '@/knowledge/cds/RuleEvaluator';
import type { CdsFacts } from '@/knowledge/cds/Rule.js';
import { and, or, not, leaf, listAny } from '@/knowledge/cds/rules/conditionHelpers.js';

/** 构造基础事实 */
function baseFacts(overrides: Partial<CdsFacts> = {}): CdsFacts {
  return {
    patientId: 'P001',
    allergies: [],
    currentDrugs: [],
    newDrugs: [],
    diagnoses: [],
    symptoms: [],
    signs: [],
    labResults: [],
    ...overrides,
  };
}

describe('RuleEvaluator', () => {
  const evaluator = new RuleEvaluator();

  describe('比较操作', () => {
    it('gt / lt 数值比较', () => {
      const facts = baseFacts({ age: 70 });
      expect(evaluator.evaluate(leaf('age', 'gt', 65), facts)).toBe(true);
      expect(evaluator.evaluate(leaf('age', 'lt', 65), facts)).toBe(false);
      expect(evaluator.evaluate(leaf('age', 'gte', 70), facts)).toBe(true);
    });

    it('equals / not_equals 字符串', () => {
      const facts = baseFacts({ renalBand: 'severe' });
      expect(evaluator.evaluate(leaf('renalBand', 'equals', 'severe'), facts)).toBe(true);
      expect(evaluator.evaluate(leaf('renalBand', 'not_equals', 'normal'), facts)).toBe(true);
    });

    it('between 区间', () => {
      const facts = baseFacts({ age: 50 });
      expect(evaluator.evaluate(leaf('age', 'between', [40, 60]), facts)).toBe(true);
      expect(evaluator.evaluate(leaf('age', 'between', [20, 30]), facts)).toBe(false);
    });

    it('in 枚举', () => {
      const facts = baseFacts({ gender: 'female' });
      expect(evaluator.evaluate(leaf('gender', 'in', ['female', 'male']), facts)).toBe(true);
      expect(evaluator.evaluate(leaf('gender', 'in', ['male']), facts)).toBe(false);
    });

    it('列表字段 contains 任一项命中', () => {
      const facts = baseFacts({ newDrugs: ['阿司匹林肠溶片', '阿托伐他汀'] });
      expect(evaluator.evaluate(listAny('newDrugs', '阿司匹林'), facts)).toBe(true);
      expect(evaluator.evaluate(listAny('newDrugs', '华法林'), facts)).toBe(false);
    });

    it('检验项 lab.<名称> 数值比较', () => {
      const facts = baseFacts({
        labResults: [{ itemName: '血钾', value: 6.8, unit: 'mmol/L' }],
      });
      expect(evaluator.evaluate(leaf('lab.血钾', 'gt', 6.5), facts)).toBe(true);
      expect(evaluator.evaluate(leaf('lab.血钾', 'lt', 6.5), facts)).toBe(false);
    });
  });

  describe('逻辑组合 AND / OR / NOT', () => {
    it('AND 全真才为真', () => {
      const facts = baseFacts({ age: 70, newDrugs: ['地西泮'] });
      const cond = and(leaf('age', 'gte', 75), listAny('newDrugs', '地西泮'));
      expect(evaluator.evaluate(cond, facts)).toBe(false);

      const facts2 = baseFacts({ age: 80, newDrugs: ['地西泮片'] });
      expect(evaluator.evaluate(cond, facts2)).toBe(true);
    });

    it('OR 任一为真即真', () => {
      const facts = baseFacts({ newDrugs: ['左氧氟沙星'] });
      const cond = or(listAny('newDrugs', '莫西沙星'), listAny('newDrugs', '左氧氟沙星'));
      expect(evaluator.evaluate(cond, facts)).toBe(true);
    });

    it('NOT 取反', () => {
      const facts = baseFacts({ pregnant: false });
      expect(evaluator.evaluate(not(leaf('pregnant', 'equals', true)), facts)).toBe(true);

      const facts2 = baseFacts({ pregnant: true });
      expect(evaluator.evaluate(not(leaf('pregnant', 'equals', true)), facts2)).toBe(false);
    });
  });
});
