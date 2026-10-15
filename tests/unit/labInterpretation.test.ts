/**
 * 健澜科技 jlmedaios - 检验检查智能解读单测（M121-C）
 *
 * 纯函数、确定性、无 I/O。覆盖异常检测 / 趋势分析 / 可能原因与随访建议 / 患者脱敏。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  buildLabInterpretation,
  maskPatientId,
  type LabResultItem,
} from '../../src/bff/aggregators/labInterpretationAggregator.js';

const WBC = (value: number): LabResultItem => ({
  markerCode: 'WBC', markerName: '白细胞', value, unit: '10^9/L', refLow: 4, refHigh: 10,
});
const HGB = (value: number): LabResultItem => ({
  markerCode: 'HGB', markerName: '血红蛋白', value, unit: 'g/L', refLow: 115, refHigh: 150,
});

describe('M121-C 异常检测', () => {
  it('偏高 -> flag=high，deviationPct 为正', () => {
    const r = buildLabInterpretation('doc_1', 'pat_0001', [WBC(12)]);
    expect(r.abnormalMarkers).toHaveLength(1);
    expect(r.abnormalMarkers[0].flag).toBe('high');
    expect(r.abnormalMarkers[0].deviationPct).toBeGreaterThan(0);
  });

  it('偏低 -> flag=low，deviationPct 为负', () => {
    const r = buildLabInterpretation('doc_1', 'pat_0001', [HGB(100)]);
    expect(r.abnormalMarkers).toHaveLength(1);
    expect(r.abnormalMarkers[0].flag).toBe('low');
    expect(r.abnormalMarkers[0].deviationPct).toBeLessThan(0);
  });

  it('偏离超过 50% -> critical_high / critical_low', () => {
    const high = buildLabInterpretation('doc_1', 'pat_0001', [WBC(16)]); // 16 vs 10 -> +60%
    expect(high.abnormalMarkers[0].flag).toBe('critical_high');
    const low = buildLabInterpretation('doc_1', 'pat_0001', [HGB(50)]); // 50 vs 115 -> -56.5%
    expect(low.abnormalMarkers[0].flag).toBe('critical_low');
  });

  it('全部正常 -> abnormalMarkers 为空', () => {
    const r = buildLabInterpretation('doc_1', 'pat_0001', [WBC(7), HGB(130)]);
    expect(r.abnormalMarkers).toHaveLength(0);
  });

  it('NaN / 非法条目被跳过，不污染结果', () => {
    const r = buildLabInterpretation('doc_1', 'pat_0001', [
      WBC(7),
      { markerCode: 'XX', markerName: '坏数据', value: Number.NaN, unit: '', refLow: 0, refHigh: 10 },
    ]);
    expect(r.abnormalMarkers).toHaveLength(0);
    expect(r.trends).toHaveLength(1);
  });
});

describe('M121-C 趋势分析', () => {
  it('较既往上升 >5% -> direction=up，changePct 正确', () => {
    const r = buildLabInterpretation('doc_1', 'pat_0001', [WBC(12)], [WBC(9)]);
    const t = r.trends.find((x) => x.markerCode === 'WBC');
    expect(t?.direction).toBe('up');
    expect(t?.changePct).toBeCloseTo(((12 - 9) / 9) * 100, 1);
  });

  it('变化 <5% -> direction=flat', () => {
    const r = buildLabInterpretation('doc_1', 'pat_0001', [WBC(10.2)], [WBC(10)]);
    expect(r.trends[0].direction).toBe('flat');
  });

  it('无既往对照 -> direction=new，previousValue=null', () => {
    const r = buildLabInterpretation('doc_1', 'pat_0001', [HGB(130)], []);
    const t = r.trends.find((x) => x.markerCode === 'HGB');
    expect(t?.direction).toBe('new');
    expect(t?.previousValue).toBeNull();
    expect(t?.changePct).toBeNull();
  });
});

describe('M121-C 可能原因与随访建议', () => {
  it('已知指标 WBC 偏高 -> 命中内置原因库', () => {
    const r = buildLabInterpretation('doc_1', 'pat_0001', [WBC(12)]);
    const c = r.possibleCauses.find((x) => x.markerCode === 'WBC');
    expect(c?.causes.length).toBeGreaterThan(0);
    expect(c?.causes.join('；')).toContain('细菌感染');
  });

  it('未知指标 -> 保守通用原因', () => {
    const r = buildLabInterpretation('doc_1', 'pat_0001', [
      { markerCode: 'XXX', markerName: '未知项', value: 200, unit: 'U/L', refLow: 0, refHigh: 100 },
    ]);
    expect(r.possibleCauses[0].causes[0]).toContain('建议结合临床病史与复查');
  });

  it('危急值 -> high 优先级建议（立即复核）', () => {
    const r = buildLabInterpretation('doc_1', 'pat_0001', [WBC(16)]);
    const high = r.followUpSuggestions.find((s) => s.priority === 'high');
    expect(high).toBeDefined();
    expect(high?.action).toContain('立即复核');
  });

  it('全部正常 -> low 优先级常规随访建议', () => {
    const r = buildLabInterpretation('doc_1', 'pat_0001', [WBC(7), HGB(130)]);
    expect(r.abnormalMarkers).toHaveLength(0);
    const low = r.followUpSuggestions.find((s) => s.priority === 'low');
    expect(low).toBeDefined();
    expect(low?.title).toContain('未见明显异常');
  });
});

describe('M121-C 患者脱敏与输出契约', () => {
  it('maskPatientId 仅保留尾 4 位', () => {
    expect(maskPatientId('pat_demo_0001')).toBe('***0001');
    expect(maskPatientId('ab')).toBe('****');
    expect(maskPatientId('')).toBe('***');
  });

  it('返回体含脱敏患者标识、医师 ID 原样、免责声明', () => {
    const r = buildLabInterpretation('doc_9', 'pat_demo_0001', [WBC(7)]);
    expect(r.doctorId).toBe('doc_9');
    expect(r.patientIdMasked).toBe('***0001');
    expect(r.patientIdMasked).not.toContain('demo');
    expect(r.disclaimer).toContain('不构成诊断');
    expect(typeof r.generatedAt).toBe('string');
  });
});
