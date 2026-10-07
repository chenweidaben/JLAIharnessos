/**
 * 健澜科技 jlmedaios - 输血 CDS 指征规则纯函数单测（M10-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import { evaluateIndication } from '../../src/bff/aggregators/transfusionAggregator';

describe('evaluateIndication - 红细胞', () => {
  it('Hb < 70 命中指征', () => {
    const r = evaluateIndication('red_cell', { hb: 65 });
    expect(r.pass).toBe(true);
    expect(r.reasons[0]).toContain('65');
  });
  it('Hb 70-80 伴活动性出血命中指征', () => {
    const r = evaluateIndication('red_cell', { hb: 75, activeBleeding: true });
    expect(r.pass).toBe(true);
    expect(r.reasons[0]).toContain('活动性出血');
  });
  it('无指标时给出标准建议而非断言', () => {
    const r = evaluateIndication('red_cell', {});
    expect(r.suggestion).toContain('Hb < 70');
  });
});

describe('evaluateIndication - 血浆/血小板/冷沉淀/全血', () => {
  it('INR > 1.7 命中血浆指征', () => {
    expect(evaluateIndication('plasma', { inr: 2.1 }).reasons[0]).toContain('2.1');
  });
  it('PLT < 50 命中血小板指征', () => {
    expect(evaluateIndication('platelet', { plt: 45 }).reasons[0]).toContain('45');
  });
  it('纤维蛋白原 < 1.0 命中冷沉淀指征', () => {
    expect(evaluateIndication('cryo', { fibrinogen: 0.8 }).reasons[0]).toContain('0.8');
  });
  it('失血 > 1500 命中全血指征', () => {
    expect(evaluateIndication('whole', { bloodLoss: 2000 }).reasons[0]).toContain('2000');
  });
  it('unknown 成分给出默认建议且不抛错', () => {
    const r = evaluateIndication('whole', {});
    expect(r.pass).toBe(true);
    expect(r.suggestion.length).toBeGreaterThan(0);
  });
});
