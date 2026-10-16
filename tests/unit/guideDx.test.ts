/**
 * 健澜科技 jlmedaios - 临床指南对齐纯函数单测（M160-C）
 *
 * 覆盖：
 *   ① 指南诊断：高血压≥140/90 分级、糖尿病 HbA1c/FPG 切点、冠心病典型胸痛+危险因素、
 *      肺炎 CURB-65 分层（须有新发浸润影方诊断）；
 *   ② 治疗检查：是否落在指南一线治疗内（高血压/糖尿病/冠心病/肺炎分支）；
 *   ③ 指南建议：generateGuidelineSuggestion 返回一线治疗/目标/监测；
 *   ④ 偏离分析：缺失必选项判 major、覆盖不足判 minor、完全对齐判 aligned。
 *
 * 全部纯函数，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  checkTreatmentGuideline,
  deviationFromGuideline,
  generateGuidelineSuggestion,
  guideBasedDiagnosis,
  BP_THRESHOLDS,
  DM_THRESHOLDS,
} from '../../src/bff/aggregators/guideDxAggregator';

describe('M160-C 指南对齐诊断', () => {
  it('高血压：≥140/90 命中并分级（中国高血压指南2024）', () => {
    const r = guideBasedDiagnosis([], {}, { systolic: 165, diastolic: 102 });
    const htn = r.assessments.find((a) => a.condition === 'hypertension')!;
    expect(htn.diagnosed).toBe(true);
    expect(htn.severity).toContain('2级');
    expect(htn.guideline).toContain('2024');
    // 未达切点
    const r2 = guideBasedDiagnosis([], {}, { systolic: 120, diastolic: 78 });
    expect(r2.assessments.find((a) => a.condition === 'hypertension')!.diagnosed).toBe(false);
  });

  it('糖尿病：HbA1c≥6.5% / FPG≥7.0 命中（CDS 2024）', () => {
    const r = guideBasedDiagnosis(['多饮', '多尿'], {}, { hba1c: 7.8, fastingGlucose: 8.1 });
    const dm = r.assessments.find((a) => a.condition === 'diabetes')!;
    expect(dm.diagnosed).toBe(true);
    expect(dm.guideline).toContain('CDS');
    expect(DM_THRESHOLDS.hba1c).toBe(6.5);
    expect(DM_THRESHOLDS.hba1cTarget).toBe(7.0);
  });

  it('冠心病：典型缺血胸痛+≥2危险因素方提示（ESC 2024）', () => {
    const r = guideBasedDiagnosis(
      [{ name: '胸痛', onset: '压榨样 活动后加重' }],
      { chronicDiseases: ['高血压', '糖尿病'], smoking: true },
      {},
    );
    const chd = r.assessments.find((a) => a.condition === 'chd')!;
    expect(chd.diagnosed).toBe(true);
    expect(chd.guideline).toContain('ESC');
    // 危险因素不足 → 不诊断
    const r2 = guideBasedDiagnosis([{ name: '胸痛', onset: '压榨样' }], { chronicDiseases: [] }, {});
    expect(r2.assessments.find((a) => a.condition === 'chd')!.diagnosed).toBe(false);
  });

  it('肺炎：呼吸道症状+新发浸润影方诊断，CURB-65 分层（IDSA/ATS 2019）', () => {
    const r = guideBasedDiagnosis(['发热', '咳嗽', '咳痰'], {}, {
      newInfiltrate: true, age: 72, respiratoryRate: 30, systolic: 110, diastolic: 72,
    });
    const cap = r.assessments.find((a) => a.condition === 'pneumonia')!;
    expect(cap.diagnosed).toBe(true);
    expect(cap.severity).toContain('CURB-65=2');
    // 无浸润影 → 不诊断
    const r2 = guideBasedDiagnosis(['发热', '咳嗽'], {}, { age: 70 });
    expect(r2.assessments.find((a) => a.condition === 'pneumonia')!.diagnosed).toBe(false);
  });

  it('首要诊断优先级：冠心病急症优先', () => {
    const r = guideBasedDiagnosis(
      [{ name: '胸痛', onset: '压榨样 放射' }],
      { chronicDiseases: ['高血压', '高血脂'], smoking: true },
      { systolic: 150, diastolic: 95 },
    );
    expect(r.primary?.condition).toBe('chd');
  });

  it('血压常量表与指南切点一致', () => {
    expect(BP_THRESHOLDS.officeDiagnosis).toEqual({ systolic: 140, diastolic: 90 });
  });
});

describe('M160-C 治疗指南核查', () => {
  it('冠心病：缺双联抗血小板/他汀 → 不达标', () => {
    const ck = checkTreatmentGuideline('冠心病', { drugs: ['硝酸甘油'], interventions: [] });
    expect(ck.compliant).toBe(false);
    expect(ck.score).toBeLessThan(80);
    expect(ck.issues.some((i) => i.message.includes('双联抗血小板'))).toBe(true);
  });

  it('冠心病：阿司匹林+替格瑞洛+他汀+β受体阻滞剂 → 合规', () => {
    const ck = checkTreatmentGuideline('冠心病', {
      drugs: ['阿司匹林', '替格瑞洛', '阿托伐他汀', '美托洛尔'],
      interventions: ['心电监护'],
    });
    expect(ck.compliant).toBe(true);
    expect(ck.score).toBeGreaterThanOrEqual(80);
  });

  it('糖尿病：一线二甲双胍命中 → 合规', () => {
    const ck = checkTreatmentGuideline('2型糖尿病', { drugs: ['二甲双胍'], interventions: ['运动饮食'] });
    expect(ck.compliant).toBe(true);
  });

  it('肺炎：经验性抗感染命中', () => {
    const ck = checkTreatmentGuideline('社区获得性肺炎', { drugs: ['阿莫西林'], interventions: ['氧疗', '退热化痰'] });
    expect(ck.compliant).toBe(true);
  });

  it('未识别病种返回提示', () => {
    const ck = checkTreatmentGuideline('偏头痛', { drugs: ['布洛芬'] });
    expect(ck.score).toBe(0);
  });
});

describe('M160-C 指南建议与偏离分析', () => {
  it('生成指南建议：含一线治疗/目标/监测', () => {
    const s = generateGuidelineSuggestion('高血压');
    expect(s).not.toBeNull();
    expect(s!.label).toBe('原发性高血压');
    expect(s!.firstLine.length).toBeGreaterThan(0);
    expect(s!.targets.join()).toContain('140/90');
    expect(generateGuidelineSuggestion('不存在病')).toBeNull();
  });

  it('偏离分析：冠心病缺失P2Y12 → 显著偏离', () => {
    const d = deviationFromGuideline('冠心病', ['阿司匹林', '阿托伐他汀'], ['双联抗血小板', '高强度他汀', 'β受体阻滞剂']);
    expect(d.overallAlignment).toBe('major');
    expect(d.deviations.some((x) => x.item.includes('P2Y12'))).toBe(true);
  });

  it('偏离分析：治疗齐全 → 基本对齐', () => {
    const d = deviationFromGuideline('2型糖尿病', ['二甲双胍', '生活方式干预'], []);
    expect(d.overallAlignment).toBe('aligned');
    expect(d.deviationCount).toBe(0);
  });
});
