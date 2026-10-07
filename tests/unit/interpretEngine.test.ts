/**
 * 健澜科技 jlmedaios - 解读规则引擎纯函数单测（M12-A）
 *
 * 覆盖：规则识别、computeTrends（上升/下降/稳定/无历史/除零）、prompt 构造与患者端安全、
 * safeParseLlmJson 防御性解析与形状校验（LlmShapeError）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  interpretLabResults,
  computeTrends,
  buildLabPrompt,
  buildImagingPrompt,
  safeParseLlmJson,
  extractJsonText,
  parseLabLlmOutput,
  parseImagingLlmOutput,
  LlmShapeError,
  PATIENT_SAFETY_RULES,
  type TrendSourceRow,
} from '../../src/medical-tools/interpret/interpretEngine';
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

describe('interpretLabResults（规则识别，迁移自 M3-E）', () => {
  it('HH/LL 识别为危急值', () => {
    const out = interpretLabResults([
      mk({ itemName: '肌钙蛋白I', abnormalFlag: 'HH', numericValue: '0.15', isCritical: true }),
      mk({ itemName: '白细胞', abnormalFlag: 'H', numericValue: '12', refLow: '3.5', refHigh: '9.5' }),
    ]);
    expect(out.abnormalCount).toBe(2);
    expect(out.criticalCount).toBe(1);
    expect(out.summary).toContain('医师复核签名');
  });

  it('空结果不崩', () => {
    const out = interpretLabResults([]);
    expect(out.itemCount).toBe(0);
    expect(out.abnormalCount).toBe(0);
  });
});

describe('computeTrends（确定性趋势）', () => {
  const history: TrendSourceRow[] = [
    { itemCode: 'WBC', itemName: '白细胞', numericValue: '9.0', unit: '10^9/L', resultTime: '2026-09-01T00:00:00Z' },
    { itemCode: 'K', itemName: '钾', numericValue: '4.0', unit: 'mmol/L', resultTime: '2026-09-01T00:00:00Z' },
  ];
  const current: LabResultRow[] = [
    mk({ itemName: '白细胞', itemCode: 'WBC', numericValue: '12.0', unit: '10^9/L', resultTime: '2026-10-01T00:00:00Z' }),
    mk({ itemName: '钾', itemCode: 'K', numericValue: '4.1', unit: 'mmol/L', resultTime: '2026-10-01T00:00:00Z' }),
    mk({ itemName: '血红蛋白', itemCode: 'HGB', numericValue: '130', unit: 'g/L', resultTime: '2026-10-01T00:00:00Z' }),
  ];

  it('上升：9 -> 12 判 rising', () => {
    const [wbc] = computeTrends(history, current);
    expect(wbc.direction).toBe('rising');
    expect(wbc.previous).toBe(9);
    expect(wbc.pct).toBeCloseTo(33.33, 1);
  });

  it('稳定：|pct|<=5% 判 stable', () => {
    const k = computeTrends(history, current).find((t) => t.code === 'K')!;
    expect(k.direction).toBe('stable');
    expect(k.pct).toBeCloseTo(2.5, 1);
  });

  it('无历史：HGB 判 no_history', () => {
    const hgb = computeTrends(history, current).find((t) => t.code === 'HGB')!;
    expect(hgb.direction).toBe('no_history');
    expect(hgb.previous).toBeNull();
    expect(hgb.pct).toBeNull();
  });

  it('下降：prev 高 current 低判 falling', () => {
    const hist: TrendSourceRow[] = [
      { itemCode: 'NA', itemName: '钠', numericValue: '150', unit: 'mmol/L', resultTime: '2026-09-01T00:00:00Z' },
    ];
    const cur = [mk({ itemName: '钠', itemCode: 'NA', numericValue: '135', resultTime: '2026-10-01T00:00:00Z' })];
    const [t] = computeTrends(hist, cur);
    expect(t.direction).toBe('falling');
    expect(t.delta).toBe(-15);
  });

  it('除零：previous=0 时 pct=null，方向按 delta 判定', () => {
    const hist: TrendSourceRow[] = [
      { itemCode: 'CROP', itemName: 'C反应蛋白', numericValue: '0', unit: 'mg/L', resultTime: '2026-09-01T00:00:00Z' },
    ];
    const cur = [mk({ itemName: 'C反应蛋白', itemCode: 'CROP', numericValue: '5', resultTime: '2026-10-01T00:00:00Z' })];
    const [t] = computeTrends(hist, cur);
    expect(t.pct).toBeNull();
    expect(t.direction).toBe('rising');
  });

  it('只取早于本次的最近一次历史', () => {
    const hist: TrendSourceRow[] = [
      { itemCode: 'W', itemName: 'W', numericValue: '10', unit: null, resultTime: '2026-08-01T00:00:00Z' },
      { itemCode: 'W', itemName: 'W', numericValue: '11', unit: null, resultTime: '2026-09-01T00:00:00Z' },
      { itemCode: 'W', itemName: 'W', numericValue: '99', unit: null, resultTime: '2026-11-01T00:00:00Z' }, // 晚于本次，忽略
    ];
    const cur = [mk({ itemName: 'W', itemCode: 'W', numericValue: '12', resultTime: '2026-10-01T00:00:00Z' })];
    const [t] = computeTrends(hist, cur);
    expect(t.previous).toBe(11);
  });
});

describe('buildLabPrompt / buildImagingPrompt（患者端安全）', () => {
  it('患者端 system 注入安全约束', () => {
    const { system } = buildLabPrompt(
      { patientLabel: '', department: '内科', ruleSummary: 'x', abnormalItems: [], criticalItems: [], trends: [] },
      'patient',
    );
    for (const rule of PATIENT_SAFETY_RULES) {
      expect(system).toContain(rule);
    }
  });

  it('医生端 system 要求结构化 JSON 键', () => {
    const { system } = buildImagingPrompt(
      { patientLabel: '', department: '放射科', modality: 'CT', examName: '头颅CT', bodyPart: '头颅', findings: 'f', impression: 'i' },
      'doctor',
    );
    expect(system).toContain('overallDirection');
  });
});

describe('safeParseLlmJson（防御性解析与形状校验）', () => {
  it('去除 ```json 围栏并取首尾花括号', () => {
    const raw = '```json\n{"a": 1, "b": "x"}\n```';
    const obj = safeParseLlmJson(raw, [{ key: 'b', type: 'string' }]);
    expect(obj.b).toBe('x');
  });

  it('缺必需字段抛 LlmShapeError', () => {
    expect(() => safeParseLlmJson('{"a": 1}', [{ key: 'b', type: 'string' }])).toThrow(LlmShapeError);
  });

  it('类型不符抛 LlmShapeError', () => {
    expect(() => safeParseLlmJson('{"a": 123}', [{ key: 'a', type: 'string' }])).toThrow(LlmShapeError);
  });

  it('非 JSON 文本抛 LlmShapeError', () => {
    expect(() => extractJsonText('抱歉我无法解读')).toThrow(LlmShapeError);
  });

  it('parseLabLlmOutput 患者端只要通俗总结+建议', () => {
    const out = parseLabLlmOutput('{"plainLanguageSummary":"通俗说","recommendations":[{"level":"low","text":"多喝水"}]}', 'patient');
    expect(out.plainLanguageSummary).toBe('通俗说');
    expect(out.recommendations.length).toBe(1);
  });

  it('parseImagingLlmOutput 医生端要求 explainedFindings 数组', () => {
    const raw = JSON.stringify({
      explainedFindings: [{ finding: '结节', explanation: '可能良性' }],
      overallDirection: '建议随访',
      recommendations: [{ level: 'medium', text: '3个月复查' }],
      plainLanguageSummary: '有个小结节，别太担心',
    });
    const out = parseImagingLlmOutput(raw, 'doctor');
    expect(out.explainedFindings.length).toBe(1);
    expect(out.overallDirection).toBe('建议随访');
  });
});
