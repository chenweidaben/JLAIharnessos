/**
 * 健澜科技 jlmedaios - 住院医生智能助手（M120-B）纯函数单测
 *   （依据宪法第七章）
 *
 * 覆盖：
 *  - 病情聚合：keySigns 取最新体征、vitals 乱序不影响走向判定、纯函数不改入参；
 *  - 风险判断：体温 / 心率 / 血压 / SpO₂ / 呼吸 阈值，检验 HH/LL 危急值、H/L 异常，
 *    整体风险等级取最高一档；
 *  - 建议生成：高风险触发紧急医嘱/会诊，危急值触发复核建议，相似恶化病例触发会诊建议，
 *    无风险时给出默认随访建议，建议按优先级排序；
 *  - 相似病例：按 matchScore 降序取 Top3，takeaway 按转归生成。
 *
 * 全部 mock 数据，不依赖数据库 / 时钟。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildInpatientAssistant,
  type InpatientAssistantData,
} from '../../src/bff/aggregators/inpatientAssistantAggregator';

const DAY = '2026-10-16';

function baseData(overrides: Partial<InpatientAssistantData> = {}): InpatientAssistantData {
  return {
    diagnosis: '社区获得性肺炎',
    age: 56,
    comorbidities: ['高血压'],
    vitals: [],
    labs: [],
    similarCases: [],
    ...overrides,
  };
}

describe('buildInpatientAssistant · 病情聚合', () => {
  it('空体征时 trend 为 stable，keySigns 为空数组', () => {
    const out = buildInpatientAssistant('d1', 'p1', 'w1', baseData());
    expect(out.trend.direction).toBe('stable');
    expect(out.trend.keySigns).toEqual([]);
  });

  it('keySigns 取时间最新的一条体征，且不修改入参顺序', () => {
    const vitals = [
      { time: `${DAY}T14:00:00+08:00`, temperatureC: 38.8, heartRate: 110, systolicBp: 100, diastolicBp: 62, spo2: 92, respiratoryRate: 22 },
      { time: `${DAY}T06:00:00+08:00`, temperatureC: 37.0, heartRate: 80, systolicBp: 122, diastolicBp: 78, spo2: 97, respiratoryRate: 16 },
    ];
    const out = buildInpatientAssistant('d1', 'p1', 'w1', baseData({ vitals }));
    // 最新一条是 14:00 的 38.8℃
    expect(out.trend.keySigns.find((s) => s.label === '体温')?.value).toBe('38.8℃');
    // 入参未被排序修改
    expect(vitals[0].time).toBe(`${DAY}T14:00:00+08:00`);
  });

  it('体征较基线全面好转 → direction=improving', () => {
    const vitals = [
      { time: `${DAY}T06:00:00+08:00`, temperatureC: 37.8, heartRate: 102, systolicBp: 105, diastolicBp: 68, spo2: 94, respiratoryRate: 20 },
      { time: `${DAY}T14:00:00+08:00`, temperatureC: 36.9, heartRate: 80, systolicBp: 125, diastolicBp: 78, spo2: 98, respiratoryRate: 16 },
    ];
    const out = buildInpatientAssistant('d1', 'p1', 'w1', baseData({ vitals }));
    expect(out.trend.direction).toBe('improving');
  });
});

describe('buildInpatientAssistant · 风险判断', () => {
  it('体温 ≥38.5℃ 判 high，≥37.3℃ 判 medium', () => {
    const high = buildInpatientAssistant('d', 'p', 'w', baseData({
      vitals: [{ time: `${DAY}T14:00:00+08:00`, temperatureC: 39.1 }],
    }));
    expect(high.riskAlert.items.find((r) => r.code === 'fever')?.level).toBe('high');

    const mid = buildInpatientAssistant('d', 'p', 'w', baseData({
      vitals: [{ time: `${DAY}T14:00:00+08:00`, temperatureC: 37.6 }],
    }));
    expect(mid.riskAlert.items.find((r) => r.code === 'fever')?.level).toBe('medium');
  });

  it('心率 / 血压 / SpO₂ / 呼吸阈值命中对应风险码', () => {
    const out = buildInpatientAssistant('d', 'p', 'w', baseData({
      vitals: [{ time: `${DAY}T14:00:00+08:00`, heartRate: 125, systolicBp: 85, diastolicBp: 55, spo2: 88, respiratoryRate: 26 }],
    }));
    const codes = out.riskAlert.items.map((r) => r.code).sort();
    expect(codes).toEqual(['hypotension', 'hypoxemia', 'tachycardia', 'tachypnea']);
    expect(out.riskAlert.items.every((r) => r.level === 'high')).toBe(true);
    expect(out.riskAlert.level).toBe('high');
  });

  it('检验 HH/LL 危急值 high，H/L 异常 medium', () => {
    const out = buildInpatientAssistant('d', 'p', 'w', baseData({
      labs: [
        { code: 'K', name: '血钾', value: 2.8, unit: 'mmol/L', flag: 'LL' },
        { code: 'WBC', name: '白细胞', value: 12.4, unit: '×10^9/L', flag: 'H' },
        { code: 'Na', name: '血钠', value: 140, unit: 'mmol/L', flag: 'N' },
      ],
    }));
    const critical = out.riskAlert.items.find((r) => r.code === 'criticalLab');
    const abnormal = out.riskAlert.items.find((r) => r.code === 'abnormalLab');
    expect(critical?.level).toBe('high');
    expect(abnormal?.level).toBe('medium');
    expect(out.riskAlert.items.find((r) => r.code === 'abnormalLab' && r.message.includes('血钠'))).toBeUndefined();
  });

  it('无任何异常时 riskAlert.level=none', () => {
    const out = buildInpatientAssistant('d', 'p', 'w', baseData({
      vitals: [{ time: `${DAY}T14:00:00+08:00`, temperatureC: 36.8, heartRate: 78, systolicBp: 122, diastolicBp: 76, spo2: 98, respiratoryRate: 16 }],
      labs: [{ code: 'WBC', name: '白细胞', value: 7.0, unit: '×10^9/L', flag: 'N' }],
    }));
    expect(out.riskAlert.level).toBe('none');
    expect(out.riskAlert.items).toEqual([]);
  });
});

describe('buildInpatientAssistant · 建议生成', () => {
  it('高热触发「急查血常规+CRP」紧急医嘱', () => {
    const out = buildInpatientAssistant('d', 'p', 'w', baseData({
      vitals: [{ time: `${DAY}T14:00:00+08:00`, temperatureC: 39.0 }],
    }));
    const s = out.suggestions.find((x) => x.text.includes('血常规'));
    expect(s?.priority).toBe('high');
    expect(s?.type).toBe('order');
  });

  it('危急值触发复核建议并电话告知上级', () => {
    const out = buildInpatientAssistant('d', 'p', 'w', baseData({
      labs: [{ code: 'K', name: '血钾', value: 2.8, unit: 'mmol/L', flag: 'LL' }],
    }));
    const s = out.suggestions.find((x) => x.text.includes('危急值'));
    expect(s?.priority).toBe('high');
    expect(s?.type).toBe('review');
    expect(s?.evidence).toContain('LL');
  });

  it('相似病例恶化且相似度≥60% 触发会诊建议', () => {
    const out = buildInpatientAssistant('d', 'p', 'w', baseData({
      similarCases: [
        { patientId: 'P****0001', diagnosis: '社区获得性肺炎', losDays: 9, outcome: 'deteriorated', matchScore: 0.82 },
      ],
    }));
    const s = out.suggestions.find((x) => x.type === 'consult');
    expect(s?.text).toContain('上级查房');
    expect(s?.evidence).toContain('P****0001');
  });

  it('无任何风险时给出默认随访建议', () => {
    const out = buildInpatientAssistant('d', 'p', 'w', baseData());
    expect(out.suggestions).toHaveLength(1);
    expect(out.suggestions[0].priority).toBe('low');
    expect(out.suggestions[0].text).toContain('暂无紧急事项');
  });

  it('建议按优先级 high→medium→low 排序', () => {
    const out = buildInpatientAssistant('d', 'p', 'w', baseData({
      age: 78,
      comorbidities: ['高血压', '糖尿病', '冠心病'],
      vitals: [{ time: `${DAY}T14:00:00+08:00`, temperatureC: 39.0 }],
      labs: [{ code: 'K', name: '血钾', value: 2.8, unit: 'mmol/L', flag: 'LL' }],
    }));
    const order = out.suggestions.map((s) => s.priority);
    expect(order).toEqual([...order].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a] - { high: 0, medium: 1, low: 2 }[b])));
  });
});

describe('buildInpatientAssistant · 相似病例', () => {
  it('按 matchScore 降序取 Top3，并附 takeaway', () => {
    const out = buildInpatientAssistant('d', 'p', 'w', baseData({
      similarCases: [
        { patientId: 'P****1', diagnosis: 'X', losDays: 5, outcome: 'improved', matchScore: 0.5 },
        { patientId: 'P****2', diagnosis: 'X', losDays: 8, outcome: 'unchanged', matchScore: 0.9 },
        { patientId: 'P****3', diagnosis: 'X', losDays: 9, outcome: 'deteriorated', matchScore: 0.7 },
        { patientId: 'P****4', diagnosis: 'X', losDays: 4, outcome: 'improved', matchScore: 0.6 },
      ],
    }));
    expect(out.similarCases.map((c) => c.patientId)).toEqual(['P****2', 'P****3', 'P****4']);
    expect(out.similarCases[0].takeaway).toContain('迁延');
    expect(out.similarCases[1].takeaway).toContain('恶化');
  });

  it('空相似病例返回空数组，不抛错', () => {
    const out = buildInpatientAssistant('d', 'p', 'w', baseData());
    expect(out.similarCases).toEqual([]);
  });
});
