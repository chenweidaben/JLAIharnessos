/**
 * 健澜科技 jlmedaios - AI 大脑 2.0 住院试点纯函数单测（M185-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildInpatientBrainV2,
  type InpatientInput,
} from '../../src/bff/aggregators/inpatientBrainV2Aggregator';

function makeInput(overrides: Partial<InpatientInput> = {}): InpatientInput {
  return {
    dept: '内科',
    date: '2026-10-16',
    totalBeds: 50,
    occupiedBeds: 40,
    inPatients: 40,
    dischargedToday: 5,
    admittedToday: 5,
    doctors: [
      { doctorId: 'd1', name: '张', bedsManaged: 10, ordersToday: 15, surgeriesToday: 1 },
    ],
    nurses: [
      { nurseId: 'n1', name: '陈', bedsManaged: 5, nursingActionsToday: 20 },
    ],
    ...overrides,
  };
}

describe('buildInpatientBrainV2 床位使用率', () => {
  it('40/50 = 0.8', () => {
    const r = buildInpatientBrainV2(makeInput());
    expect(r.bedOccupancyRate).toBeCloseTo(0.8, 5);
  });

  it('空床位不除零', () => {
    const r = buildInpatientBrainV2(makeInput({ totalBeds: 0, occupiedBeds: 0 }));
    expect(r.bedOccupancyRate).toBe(0);
  });
});

describe('buildInpatientBrainV2 负荷计算', () => {
  it('医生高负荷：管床18+医嘱35+手术2', () => {
    const r = buildInpatientBrainV2(makeInput({
      doctors: [{ doctorId: 'd1', name: '张', bedsManaged: 18, ordersToday: 35, surgeriesToday: 2 }],
    }));
    expect(r.doctorLoad[0].level).toBe('high');
  });

  it('护士低负荷', () => {
    const r = buildInpatientBrainV2(makeInput({
      nurses: [{ nurseId: 'n1', name: '陈', bedsManaged: 3, nursingActionsToday: 10 }],
    }));
    expect(r.nurseLoad[0].level).toBe('low');
  });
});

describe('buildInpatientBrainV2 预测与建议', () => {
  it('高床位率生成跨科协调建议', () => {
    const r = buildInpatientBrainV2(makeInput({ occupiedBeds: 49, totalBeds: 50 }));
    expect(r.bedOccupancyRate).toBeGreaterThanOrEqual(0.95);
    expect(r.suggestions.some((s) => s.type === 'cross_dept_transfer')).toBe(true);
  });

  it('预测包含1/2/4小时三个点', () => {
    const r = buildInpatientBrainV2(makeInput());
    expect(r.forecast.map((f) => f.hoursAhead)).toEqual([1, 2, 4]);
  });
});
