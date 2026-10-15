/**
 * 健澜科技 jlmedaios - 手术麻醉智能助手（M121-B）纯函数单测
 *   （依据宪法第七章）
 *
 * 覆盖：
 *  - 风险评估：贫血 / 血小板低 / 电解质紊乱 / 肾功能异常 / 高出血风险手术 /
 *    抗凝药未停 / 困难气道 / 急诊误吸风险，ASA 分级推导与综合风险取最高档；
 *  - 药物与方案建议：困难气道触发可视喉镜、按体重估算丙泊酚剂量、
 *    长时手术触发 BIS 监测、高风险触发有创动脉压监测、切皮前抗生素；
 *  - 术中预警（并发症）：大出血 / 低体温 / 心律失常 / 过敏 / 低血压 / 低血糖；
 *  - 术后医嘱：PACU Aldrete、困难气道拔管观察、VTE、PONV、出院随访。
 *
 * 全部 mock 数据，不依赖数据库 / 时钟。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildSurgeryAssistant,
  type SurgeryAssistantData,
} from '../../src/bff/aggregators/surgeryAssistantAggregator';

function baseData(overrides: Partial<SurgeryAssistantData> = {}): SurgeryAssistantData {
  return {
    age: 45,
    gender: 'M',
    weightKg: 65,
    heightCm: 170,
    comorbidities: [],
    allergies: [],
    medications: [],
    airway: { mallampati: 2, mouthOpeningCm: 4.5, neckMobilityNormal: true },
    labs: [],
    surgery: {
      name: '腹腔镜阑尾切除术',
      estimatedDurationMin: 60,
      isEmergency: false,
      bleedingRisk: 'low',
      positioning: '仰卧',
    },
    ...overrides,
  };
}

describe('buildSurgeryAssistant · 风险评估', () => {
  it('健康患者 ASA=I，综合风险 low，items 为空', () => {
    const out = buildSurgeryAssistant('d1', 's1', 'p1', baseData());
    expect(out.riskAssessment.asaLevel).toBe('I');
    expect(out.riskAssessment.level).toBe('low');
    expect(out.riskAssessment.items).toEqual([]);
    expect(out.riskAssessment.summary).toContain('ASA I');
  });

  it('高龄 + 多种合并症 → ASA=III/IV，综合风险 high', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({
      age: 78,
      comorbidities: ['冠心病', '高血压', '2 型糖尿病'],
    }));
    expect(['III', 'IV']).toContain(out.riskAssessment.asaLevel);
    expect(out.riskAssessment.level).toBe('high');
    expect(out.riskAssessment.items.some((r) => r.code === 'severeComorbidity')).toBe(true);
  });

  it('Hb<90 / PLT<80 / 血钾异常 分别命中对应风险码', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({
      labs: [
        { code: 'Hb', name: '血红蛋白', value: 82, unit: 'g/L', flag: 'L' },
        { code: 'PLT', name: '血小板', value: 60, unit: '×10^9/L', flag: 'LL' },
        { code: 'K', name: '血钾', value: 2.9, unit: 'mmol/L', flag: 'LL' },
      ],
    }));
    const codes = out.riskAssessment.items.map((r) => r.code).sort();
    expect(codes).toContain('anemia');
    expect(codes).toContain('thrombocytopenia');
    expect(codes).toContain('electrolyte');
    expect(out.riskAssessment.level).toBe('high');
  });

  it('高出血风险手术 + 仍在用阿司匹林 → 命中 anticoagNotHeld / highBleedingRisk', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({
      medications: ['阿司匹林 100mg qd'],
      surgery: { ...baseData().surgery, bleedingRisk: 'high', name: '肝叶切除术' },
    }));
    expect(out.riskAssessment.items.some((r) => r.code === 'anticoagNotHeld')).toBe(true);
    expect(out.riskAssessment.items.some((r) => r.code === 'highBleedingRisk')).toBe(true);
  });

  it('Mallampati≥3 命中 difficultAirway；急诊手术命中 emergencySurgery', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({
      airway: { mallampati: 3, mouthOpeningCm: 4.0, neckMobilityNormal: true },
      surgery: { ...baseData().surgery, isEmergency: true },
    }));
    expect(out.riskAssessment.items.some((r) => r.code === 'difficultAirway')).toBe(true);
    expect(out.riskAssessment.items.some((r) => r.code === 'emergencySurgery')).toBe(true);
    expect(out.riskAssessment.summary).toContain('E');
  });

  it('入参不被修改（纯函数）', () => {
    const data = baseData({ labs: [{ code: 'Hb', name: '血红蛋白', value: 80, unit: 'g/L', flag: 'L' }] });
    const labsBefore = data.labs.map((l) => l.code).join(',');
    buildSurgeryAssistant('d', 's', 'p', data);
    expect(data.labs.map((l) => l.code).join(',')).toBe(labsBefore);
  });
});

describe('buildSurgeryAssistant · 麻醉方案建议（药物/气道/监测）', () => {
  it('困难气道触发「可视喉镜 + 纤支镜」high 优先级建议', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({
      airway: { mallampati: 4, mouthOpeningCm: 2.5, neckMobilityNormal: false },
    }));
    const airway = out.anesthesiaSuggestions.find((s) => s.type === 'airway');
    expect(airway?.priority).toBe('high');
    expect(airway?.text).toContain('可视喉镜');
  });

  it('诱导建议按体重估算丙泊酚剂量', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({ weightKg: 70 }));
    const induction = out.anesthesiaSuggestions.find((s) => s.type === 'induction');
    expect(induction?.text).toContain('丙泊酚');
    expect(induction?.text).toContain('105 mg');
  });

  it('长时手术（≥120min）触发 BIS 麻醉深度监测建议', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({
      surgery: { ...baseData().surgery, estimatedDurationMin: 180 },
    }));
    const maint = out.anesthesiaSuggestions.find((s) => s.type === 'maintenance');
    expect(maint?.text).toContain('BIS');
  });

  it('高风险患者触发有创动脉压 + 中心静脉置管建议', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({
      comorbidities: ['冠心病'],
      surgery: { ...baseData().surgery, bleedingRisk: 'high' },
    }));
    const mon = out.anesthesiaSuggestions.find((s) => s.type === 'monitoring');
    expect(mon?.priority).toBe('high');
    expect(mon?.text).toContain('有创动脉');
  });

  it('始终给出切皮前 30~60min 预防性抗生素建议', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData());
    const abx = out.anesthesiaSuggestions.find((s) => s.type === 'antibiotic');
    expect(abx?.text).toContain('切皮前');
  });

  it('建议按优先级 high→medium→low 排序', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({
      airway: { mallampati: 4, mouthOpeningCm: 3, neckMobilityNormal: true },
      comorbidities: ['冠心病'],
    }));
    const order = out.anesthesiaSuggestions.map((s) => s.priority);
    expect(order).toEqual([...order].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a] - { high: 0, medium: 1, low: 2 }[b])));
  });
});

describe('buildSurgeryAssistant · 术中并发症预警', () => {
  it('高出血风险手术 + 血小板低 → 触发 hemorrhage 高危预警', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({
      surgery: { ...baseData().surgery, bleedingRisk: 'high' },
      labs: [{ code: 'PLT', name: '血小板', value: 50, unit: '×10^9/L', flag: 'LL' }],
    }));
    const h = out.intraOpAlerts.find((a) => a.code === 'hemorrhage');
    expect(h?.level).toBe('high');
    expect(h?.advice).toContain('大量输血');
  });

  it('手术时长 ≥90min 触发低体温预警', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({
      surgery: { ...baseData().surgery, estimatedDurationMin: 120 },
    }));
    expect(out.intraOpAlerts.some((a) => a.code === 'hypothermia')).toBe(true);
  });

  it('合并冠心病或电解质紊乱 → 触发 arrhythmia 高危预警', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({
      comorbidities: ['冠心病'],
    }));
    const arr = out.intraOpAlerts.find((a) => a.code === 'arrhythmia');
    expect(arr?.level).toBe('high');
    expect(arr?.advice).toContain('ACLS');
  });

  it('存在过敏史 → 触发过敏预警', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({ allergies: ['青霉素', '肌松药'] }));
    const a = out.intraOpAlerts.find((x) => x.code === 'allergy');
    expect(a?.level).toBe('high');
    expect(a?.advice).toContain('肾上腺素');
  });

  it('糖尿病患者触发血糖异常预警', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({
      comorbidities: ['2 型糖尿病'],
      labs: [{ code: 'Glu', name: '血糖', value: 12.5, unit: 'mmol/L', flag: 'H' }],
    }));
    expect(out.intraOpAlerts.some((a) => a.code === 'hypoglycemia')).toBe(true);
  });

  it('始终存在低血压基础预警', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData());
    expect(out.intraOpAlerts.some((a) => a.code === 'hypotension')).toBe(true);
  });
});

describe('buildSurgeryAssistant · 术后医嘱', () => {
  it('PACU 始终给出 Aldrete 评分建议', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData());
    const pacu = out.postOpAdvice.find((p) => p.phase === 'pacu' && p.topic === 'Aldrete 评分');
    expect(pacu?.text).toContain('9 分');
  });

  it('困难气道患者 PACU 额外给出拔管后观察建议', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData({
      airway: { mallampati: 3, mouthOpeningCm: 4, neckMobilityNormal: true },
    }));
    const pacuAirway = out.postOpAdvice.find((p) => p.phase === 'pacu' && p.topic === '气道');
    expect(pacuAirway?.text).toContain('30 min');
  });

  it('病房阶段包含 VTE 预防与多模式镇痛', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData());
    expect(out.postOpAdvice.some((p) => p.phase === 'ward' && p.topic === 'VTE 预防')).toBe(true);
    expect(out.postOpAdvice.some((p) => p.phase === 'ward' && p.topic === '镇痛')).toBe(true);
  });

  it('出院阶段包含随访与返院告知', () => {
    const out = buildSurgeryAssistant('d', 's', 'p', baseData());
    const d = out.postOpAdvice.find((p) => p.phase === 'discharge');
    expect(d?.text).toContain('返院');
  });
});
