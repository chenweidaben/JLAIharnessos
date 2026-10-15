/**
 * 健澜科技 jlmedaios - 检验报告患者通俗解读纯函数单测（M122-B）
 *
 * 覆盖：通俗化转换、风险分级、就医/照护建议生成。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  explainLabResultsForPatient,
  type LabResultItem,
} from '../../src/bff/aggregators/patientLabExplainAggregator';

/** 便捷构造一条检验结果。 */
function make(partial: Partial<LabResultItem>): LabResultItem {
  return {
    itemName: '血红蛋白',
    itemCode: 'HGB',
    value: '100 g/L',
    numericValue: 100,
    unit: 'g/L',
    refLow: 115,
    refHigh: 150,
    abnormalFlag: 'L',
    isCritical: false,
    ...partial,
  };
}

describe('explainLabResultsForPatient - 通俗化转换', () => {
  it('把专业项目翻译成大白话解释', () => {
    const out = explainLabResultsForPatient([make({})]);
    const item = out.plainExplanations[0];
    expect(item.itemName).toBe('血红蛋白');
    // 包含项目科普与方向结论
    expect(item.plainText).toContain('血红蛋白');
    expect(item.plainText).toContain('偏低');
    // 友好展示数值与参考区间
    expect(item.displayValue).toBe('100 g/L');
    expect(item.refRange).toContain('115');
    expect(item.refRange).toContain('150');
  });

  it('未知项目也能给出兜底人话解释', () => {
    const out = explainLabResultsForPatient([
      make({ itemName: '某特殊物质', itemCode: 'XXX', abnormalFlag: null, numericValue: null, value: null }),
    ]);
    expect(out.plainExplanations[0].plainText).toContain('某特殊物质');
    expect(out.plainExplanations[0].level).toBe('unknown');
  });

  it('空输入返回空解读且不报错', () => {
    const out = explainLabResultsForPatient([]);
    expect(out.plainExplanations).toEqual([]);
    expect(out.possibleCauses).toEqual([]);
    expect(out.careAdvice.length).toBeGreaterThan(0);
    expect(out.followUpNeeded.level).toBe('none');
  });
});

describe('explainLabResultsForPatient - 风险分级', () => {
  it('正常结果 -> normal 且无需随访', () => {
    const out = explainLabResultsForPatient([
      make({ numericValue: 130, abnormalFlag: 'N', value: '130 g/L' }),
    ]);
    expect(out.plainExplanations[0].level).toBe('normal');
    expect(out.followUpNeeded.level).toBe('none');
    expect(out.followUpNeeded.needed).toBe(false);
  });

  it('略偏高/偏低 -> routine 随访', () => {
    const out = explainLabResultsForPatient([
      make({ itemCode: 'GLU', itemName: '血糖', numericValue: 8.5, abnormalFlag: 'H', value: '8.5 mmol/L', refLow: 3.9, refHigh: 6.1 }),
    ]);
    expect(out.plainExplanations[0].level).toBe('high');
    expect(out.followUpNeeded.level).toBe('routine');
    expect(out.followUpNeeded.needed).toBe(true);
    // 偏高项目应给出可能原因与照护建议
    expect(out.possibleCauses.join('\n')).toContain('血糖');
    expect(out.careAdvice.length).toBeGreaterThan(0);
  });

  it('危急值（isCritical 或 HH/LL）-> urgent 尽快就医', () => {
    const out = explainLabResultsForPatient([
      make({ itemCode: 'K', itemName: '血钾', numericValue: 6.8, abnormalFlag: 'HH', isCritical: true, value: '6.8 mmol/L', refLow: 3.5, refHigh: 5.3 }),
    ]);
    expect(out.plainExplanations[0].level).toBe('critical');
    expect(out.followUpNeeded.level).toBe('urgent');
    expect(out.followUpNeeded.suggestion).toContain('尽快');
  });

  it('无数值但有 H 标志 -> high 分级', () => {
    const out = explainLabResultsForPatient([
      make({ numericValue: null, value: '阳性', abnormalFlag: 'H' }),
    ]);
    // 无数值时按标志判读
    expect(out.plainExplanations[0].level).toBe('high');
  });
});

describe('explainLabResultsForPatient - 建议生成', () => {
  it('异常项目生成针对性照护建议 + 通用兜底 + 免责声明', () => {
    const out = explainLabResultsForPatient([
      make({ itemCode: 'ALT', itemName: '谷丙转氨酶', numericValue: 120, abnormalFlag: 'H', value: '120 U/L', refLow: 0, refHigh: 40 }),
    ]);
    const joined = out.careAdvice.join('\n');
    // 针对性建议（不饮酒/清淡）
    expect(joined).toContain('饮酒');
    // 通用兜底
    expect(joined).toContain('规律作息');
    // 医疗安全免责声明
    expect(joined).toContain('不能替代医生诊断');
  });

  it('老年患者画像追加个性化建议', () => {
    const out = explainLabResultsForPatient(
      [make({ numericValue: 100, abnormalFlag: 'L' })],
      { age: 68, gender: 'M', chronicConditions: ['高血压', '糖尿病'] },
    );
    const joined = out.careAdvice.join('\n');
    expect(joined).toContain('老年');
    expect(joined).toContain('高血压');
  });

  it('possibleCauses 去重', () => {
    const out = explainLabResultsForPatient([
      make({ itemCode: 'HGB', itemName: '血红蛋白', numericValue: 100, abnormalFlag: 'L' }),
      make({ itemCode: 'HGB', itemName: '血红蛋白', numericValue: 98, abnormalFlag: 'L' }),
    ]);
    // 两条偏低血红蛋白，可能原因文案应去重
    const count = out.possibleCauses.filter((c) => c.includes('贫血')).length;
    expect(count).toBeLessThanOrEqual(1);
  });
});
