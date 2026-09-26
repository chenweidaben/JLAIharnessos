/**
 * 健澜科技 jlmedaios - 急诊分诊评分单测（M1-B1）
 *
 * 覆盖 NEWS2 / GCS / FAST / LAMS / 主诉分级 / 规则就高分级 / 综合评分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { describe, expect, it } from 'bun:test';

import {
  assessTriage,
  complaintLevel,
  complaintPoints,
  defaultGcsFromConsciousness,
  fast,
  gcs,
  lams,
  news2,
  painBonus,
  ruleSuggestedLevel,
  totalPoints,
  vitalPoints,
  type TriageAssessmentInput,
  type TriageVitals,
} from '@/emergency/scoring.js';

describe('NEWS2', () => {
  it('生命体征平稳为 0 分、低风险', () => {
    const r = news2({
      respiration: 16, spo2: 98, temperature: 36.8, systolic: 125, pulse: 75,
      consciousness: 'alert', supplementalO2: false,
    });
    expect(r.score).toBe(0);
    expect(r.risk).toBe('low');
    expect(r.singleParameterThree).toBe(false);
  });

  it('呼吸频率各区间判分正确', () => {
    expect(news2({ respiration: 7 }).breakdown.respiration).toBe(3);
    expect(news2({ respiration: 10 }).breakdown.respiration).toBe(1);
    expect(news2({ respiration: 23 }).breakdown.respiration).toBe(2);
    expect(news2({ respiration: 28 }).breakdown.respiration).toBe(3);
  });

  it('血氧饱和度各区间判分正确', () => {
    expect(news2({ spo2: 90 }).breakdown.spo2).toBe(3);
    expect(news2({ spo2: 93 }).breakdown.spo2).toBe(2);
    expect(news2({ spo2: 95 }).breakdown.spo2).toBe(1);
    expect(news2({ spo2: 97 }).breakdown.spo2).toBe(0);
  });

  it('吸氧加 2 分', () => {
    expect(news2({ supplementalO2: true }).breakdown.o2).toBe(2);
    expect(news2({ supplementalO2: false }).breakdown.o2).toBe(0);
  });

  it('体温/收缩压/心率边界判分', () => {
    expect(news2({ temperature: 34.5 }).breakdown.temperature).toBe(3);
    expect(news2({ temperature: 38.6 }).breakdown.temperature).toBe(1);
    expect(news2({ temperature: 39.4 }).breakdown.temperature).toBe(2);
    expect(news2({ systolic: 88 }).breakdown.systolic).toBe(3);
    expect(news2({ systolic: 221 }).breakdown.systolic).toBe(3);
    expect(news2({ pulse: 38 }).breakdown.pulse).toBe(3);
    expect(news2({ pulse: 135 }).breakdown.pulse).toBe(3);
  });

  it('非清醒意识加 3 分', () => {
    expect(news2({ consciousness: 'verbal' }).breakdown.consciousness).toBe(3);
    expect(news2({ consciousness: 'alert' }).breakdown.consciousness).toBe(0);
  });

  it('总分≥7 高危；单项 3 分至少中危', () => {
    const high = news2({ respiration: 28, spo2: 90, systolic: 88 });
    expect(high.score).toBe(9);
    expect(high.risk).toBe('high');
    const single = news2({ respiration: 28 });
    expect(single.risk).toBe('medium');
  });
});

describe('GCS', () => {
  it('正常 15 分、轻度', () => {
    const r = gcs({ eye: 4, verbal: 5, motor: 6 });
    expect(r.total).toBe(15);
    expect(r.severity).toBe('mild');
  });

  it('重度昏迷 ≤8 分', () => {
    expect(gcs({ eye: 2, verbal: 1, motor: 2 }).total).toBe(5);
    expect(gcs({ eye: 2, verbal: 1, motor: 2 }).severity).toBe('severe');
  });

  it('中度 9–12 分', () => {
    expect(gcs({ eye: 3, verbal: 3, motor: 5 }).severity).toBe('moderate');
  });

  it('越界分项被钳制到合法范围', () => {
    const r = gcs({ eye: 99, verbal: -5, motor: 0 });
    expect(r.eye).toBe(4);
    expect(r.verbal).toBe(1);
    expect(r.motor).toBe(1);
  });

  it('由意识推断缺省 GCS', () => {
    expect(defaultGcsFromConsciousness('unresponsive').total).toBe(4);
    expect(defaultGcsFromConsciousness('pain').total).toBe(8);
    expect(defaultGcsFromConsciousness('verbal').total).toBe(12);
    expect(defaultGcsFromConsciousness('alert').total).toBe(15);
    expect(defaultGcsFromConsciousness(undefined).total).toBe(15);
  });
});

describe('卒中量表 FAST / LAMS', () => {
  it('FAST 全阴为阴性', () => {
    expect(fast({}).positive).toBe(false);
  });
  it('FAST 任一项阳性即阳性', () => {
    expect(fast({ fastFace: true }).positive).toBe(true);
    expect(fast({ fastArm: true }).arm).toBe(true);
    expect(fast({ fastSpeech: true }).speech).toBe(true);
  });

  it('LAMS 0 分为低 LVO 可能', () => {
    expect(lams({}).lvoLikelihood).toBe('low');
  });
  it('LAMS 1–3 为可能，≥4 为高度 LVO', () => {
    const possible = lams({ lamsFace: 1 });
    expect(possible.total).toBe(1);
    expect(possible.lvoLikelihood).toBe('possible');
    const high = lams({ lamsFace: 1, lamsArm: 2, lamsGrip: 1 });
    expect(high.total).toBe(4);
    expect(high.lvoLikelihood).toBe('high');
  });
  it('LAMS 非法/缺省输入按 0 处理', () => {
    expect(lams({ lamsFace: null, lamsArm: NaN as never }).total).toBe(0);
  });
});

describe('主诉关键词分级', () => {
  it('濒危主诉判 Ⅰ 级', () => {
    expect(complaintLevel('心搏骤停，正在CPR')).toBe(1);
    expect(complaintLevel('昏迷、休克')).toBe(1);
  });
  it('危重主诉判 Ⅱ 级', () => {
    expect(complaintLevel('持续胸痛伴大汗')).toBe(2);
    expect(complaintLevel('突发口角歪斜、言语不清')).toBe(2);
  });
  it('急症主诉判 Ⅲ 级', () => {
    expect(complaintLevel('高热39度伴呕吐')).toBe(3);
    expect(complaintLevel('持续性腹痛')).toBe(3);
  });
  it('非急症主诉判 Ⅳ 级', () => {
    expect(complaintLevel('感冒咳嗽，来开点药')).toBe(4);
  });
  it('空主诉/无命中按 Ⅳ 级', () => {
    expect(complaintLevel('')).toBe(4);
    expect(complaintLevel('随便看看')).toBe(4);
  });
});

describe('规则引擎就高分级', () => {
  const base = (over: Partial<TriageAssessmentInput>): TriageAssessmentInput => ({
    vitals: {
      respiration: 16, spo2: 98, temperature: 36.8, systolic: 125, pulse: 75,
      consciousness: 'alert',
    },
    ...over,
  });

  it('心搏骤停直接 Ⅰ 级', () => {
    const r = ruleSuggestedLevel(base({ cardiacArrest: true }));
    expect(r.level).toBe(1);
    expect(r.objectiveReasons.join()).toMatch(/骤停/);
  });

  it('严重低氧 SpO₂≤85 判 Ⅰ 级', () => {
    expect(ruleSuggestedLevel(base({ vitals: { spo2: 80 } })).level).toBe(1);
  });

  it('灾难体征判 Ⅰ 级', () => {
    expect(ruleSuggestedLevel(base({ catastrophe: true })).level).toBe(1);
  });

  it('深昏迷 GCS≤6 判 Ⅰ 级', () => {
    const r = ruleSuggestedLevel(
      base({ vitals: { consciousness: 'unresponsive' }, gcs: { eye: 1, verbal: 1, motor: 2 } }),
    );
    expect(r.level).toBe(1);
  });

  it('NEWS2≥12 判 Ⅰ 级', () => {
    const r = ruleSuggestedLevel(
      base({ vitals: { respiration: 28, spo2: 90, systolic: 88, pulse: 135 } }),
    );
    expect(r.level).toBe(1);
  });

  it('NEWS2≥7 / 低氧 / 低血压 / FAST 阳性判 Ⅱ 级', () => {
    expect(ruleSuggestedLevel(base({ vitals: { spo2: 91 } })).level).toBe(2);
    expect(ruleSuggestedLevel(base({ vitals: { systolic: 88 } })).level).toBe(2);
    expect(ruleSuggestedLevel(base({ stroke: { fastFace: true } })).level).toBe(2);
    expect(ruleSuggestedLevel(base({ vitals: { consciousness: 'verbal' } })).level).toBe(2);
  });

  it('LAMS≥4 判 Ⅱ 级', () => {
    const r = ruleSuggestedLevel(
      base({ stroke: { lamsFace: 1, lamsArm: 2, lamsGrip: 1 } }),
    );
    expect(r.level).toBe(2);
  });

  it('中危 NEWS2≥5 / 高热 / 剧痛判 Ⅲ 级', () => {
    // 呼吸23(2)+心率115(2)+体温38.6(1)=5，不触发任何 Ⅱ 级规则
    expect(
      ruleSuggestedLevel(
        base({ vitals: { respiration: 23, pulse: 115, temperature: 38.6 } }),
      ).level,
    ).toBe(3);
    expect(ruleSuggestedLevel(base({ vitals: { temperature: 39.2 } })).level).toBe(3);
    expect(ruleSuggestedLevel(base({ vitals: { painScore: 8 } })).level).toBe(3);
  });

  it('平稳患者 Ⅳ 级', () => {
    expect(ruleSuggestedLevel(base({ chiefComplaint: '轻微擦伤' })).level).toBe(4);
  });

  it('主诉濒危时即使客观分落在 Ⅱ 档也就高到 Ⅰ 级', () => {
    const r = ruleSuggestedLevel(
      base({ chiefComplaint: '心搏骤停', vitals: { spo2: 91 } }),
    );
    expect(r.level).toBe(1);
  });
});

describe('综合评分', () => {
  it('生命体征基线 4 分，危重加权', () => {
    expect(vitalPoints({})).toBe(4);
    expect(vitalPoints({ spo2: 88 })).toBe(16);
    expect(vitalPoints({ systolic: 85 })).toBe(16);
    expect(vitalPoints({ consciousness: 'unresponsive' })).toBe(18);
    expect(vitalPoints({ consciousness: 'verbal' })).toBe(12);
    expect(vitalPoints({ temperature: 39.2 })).toBe(7);
  });

  it('主诉评分 Ⅰ=35/Ⅱ=28/Ⅲ=16/Ⅳ=6', () => {
    expect(complaintPoints(1)).toBe(35);
    expect(complaintPoints(2)).toBe(28);
    expect(complaintPoints(3)).toBe(16);
    expect(complaintPoints(4)).toBe(6);
  });

  it('疼痛加分', () => {
    expect(painBonus(8)).toBe(6);
    expect(painBonus(5)).toBe(3);
    expect(painBonus(2)).toBe(0);
    expect(painBonus(null)).toBe(0);
  });

  it('totalPoints 为三项之和', () => {
    const v: TriageVitals = { consciousness: 'alert', spo2: 98 };
    expect(totalPoints(v, 4)).toBe(4 + 6 + 0);
  });
});

describe('assessTriage 完整评估', () => {
  it('一次性产出 NEWS/GCS/FAST/LAMS/规则与综合分', () => {
    const a = assessTriage({
      vitals: { respiration: 16, spo2: 98, systolic: 125, pulse: 75, consciousness: 'alert' },
      chiefComplaint: '轻微擦伤',
    });
    expect(a.gcs?.total).toBe(15);
    expect(a.rule.level).toBe(4);
    expect(a.totalScore).toBe(a.vitalScore + a.complaintScore);
    expect(a.fast.positive).toBe(false);
  });
});
