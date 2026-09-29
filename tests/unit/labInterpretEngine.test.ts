/**
 * 健澜科技 jlmedaios - 检验解读引擎纯函数单测（M3-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import { interpretLabResults } from '../../src/bff/aggregators/labInterpretAggregator';
import type { LabResultRow } from '../../src/db/repositories/labInterpretRepo';

function mk(p: Partial<LabResultRow>): LabResultRow {
  return {
    id: p.id ?? 'x',
    itemName: p.itemName ?? '项',
    itemCode: p.itemCode ?? null,
    value: p.value ?? null,
    numericValue: p.numericValue ?? null,
    unit: p.unit ?? null,
    refLow: p.refLow ?? null,
    refHigh: p.refHigh ?? null,
    abnormalFlag: p.abnormalFlag ?? 'N',
    isCritical: p.isCritical ?? false,
    resultTime: p.resultTime ?? null,
  };
}

describe('interpretLabResults', () => {
  it('全部正常：异常0、危急0', () => {
    const out = interpretLabResults([
      mk({ itemName: '白细胞', abnormalFlag: 'N', numericValue: '6.5', refLow: '3.5', refHigh: '9.5' }),
      mk({ itemName: '血红蛋白', abnormalFlag: 'N', numericValue: '130', refLow: '120', refHigh: '160' }),
    ]);
    expect(out.itemCount).toBe(2);
    expect(out.abnormalCount).toBe(0);
    expect(out.criticalCount).toBe(0);
    expect(out.summary).toContain('未见明显异常');
  });

  it('HH/LL 识别为危急值', () => {
    const out = interpretLabResults([
      mk({ itemName: '肌钙蛋白I', abnormalFlag: 'HH', numericValue: '0.15', refLow: '0', refHigh: '0.04', isCritical: true }),
      mk({ itemName: '白细胞', abnormalFlag: 'H', numericValue: '12', refLow: '3.5', refHigh: '9.5' }),
    ]);
    expect(out.abnormalCount).toBe(2);
    expect(out.criticalCount).toBe(1);
    expect(out.criticalItems[0].item).toBe('肌钙蛋白I');
    expect(out.summary).toContain('危急项');
  });

  it('无标志但超区间按数值判定', () => {
    const out = interpretLabResults([
      mk({ itemName: '钾', abnormalFlag: 'N', numericValue: '6.2', refLow: '3.5', refHigh: '5.0' }),
    ]);
    expect(out.abnormalCount).toBe(1);
    expect(out.abnormalItems[0].flag).toBe('H');
  });

  it('低于下限判 L', () => {
    const out = interpretLabResults([
      mk({ itemName: '钠', abnormalFlag: 'N', numericValue: '125', refLow: '135', refHigh: '145' }),
    ]);
    expect(out.abnormalItems[0].flag).toBe('L');
  });

  it('空结果不崩', () => {
    const out = interpretLabResults([]);
    expect(out.itemCount).toBe(0);
    expect(out.abnormalCount).toBe(0);
  });

  it('草稿声明需医师签名', () => {
    const out = interpretLabResults([mk({ abnormalFlag: 'HH', isCritical: true })]);
    expect(out.summary).toContain('医师复核签名');
  });
});
