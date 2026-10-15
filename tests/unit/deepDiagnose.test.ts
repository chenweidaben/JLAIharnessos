/**
 * 健澜科技 jlmedaios - AI 辅助诊断深化（M154-A）：深度诊断纯函数单测
 *
 * 覆盖：
 *   - deepDiagnose：Top5 可能诊断（带置信度/ICD10/专科/依据）、鉴别诊断、
 *     建议检验/影像、红旗风险、disclaimer；
 *   - differentialDiagnosis：病程（急性/慢性）与严重度对可能性的修正；
 *   - suggestLabTests / suggestImaging：按诊断名与 ICD10 反查检验/影像建议。
 *
 * 医疗安全：所有用例仅校验规则引擎输出结构与排序，不构成任何真实诊断结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  deepDiagnose,
  DISEASE_LIBRARY_SIZE,
  differentialDiagnosis,
  suggestImaging,
  suggestLabTests,
} from '../../src/bff/aggregators/deepDiagnoseAggregator';

describe('deepDiagnose 深度诊断', () => {
  it('胸痛+放射+55岁男性+高血压，Top1 命中冠心病且带 ICD10/专科/依据', () => {
    const d = deepDiagnose(
      { age: 55, gender: 'male', vitals: {} },
      [{ name: '胸痛', onset: '压榨样 向左肩背放射' }],
      { chronicDiseases: ['高血压', '糖尿病'] },
    );
    expect(d.deepId).toMatch(/^deepdiag_/);
    expect(d.topCandidates.length).toBeGreaterThanOrEqual(1);
    expect(d.topCandidates[0].diagnosis).toContain('冠心病');
    expect(d.topCandidates[0].icd10).toBe('I21.x00');
    expect(d.topCandidates[0].specialty).toBe('心血管');
    expect(d.topCandidates[0].evidence.length).toBeGreaterThan(0);
    // 置信度边界 0~0.95
    for (const c of d.topCandidates) {
      expect(c.confidence).toBeGreaterThan(0);
      expect(c.confidence).toBeLessThanOrEqual(0.95);
    }
  });

  it('返回 Top5 且置信度严格降序', () => {
    const d = deepDiagnose(
      { age: 70, gender: 'female', vitals: { temperature: 38.5, spo2: 91 } },
      [{ name: '发热' }, { name: '咳嗽' }, { name: '咳痰' }, { name: '气促' }],
      {},
    );
    expect(d.topCandidates.length).toBeLessThanOrEqual(5);
    expect(d.topCandidates[0].diagnosis).toContain('肺炎');
    for (let i = 1; i < d.topCandidates.length; i++) {
      expect(d.topCandidates[i - 1].confidence).toBeGreaterThanOrEqual(
        d.topCandidates[i].confidence,
      );
    }
  });

  it('低氧+气促老年患者，建议影像含胸部CT且检验含动脉血气', () => {
    const d = deepDiagnose(
      { age: 72, vitals: { spo2: 90, temperature: 38.8 } },
      [{ name: '发热' }, { name: '咳嗽' }, { name: '脓痰' }, { name: '气促' }],
      {},
    );
    expect(d.imaging.some((im) => im.modality.includes('CT'))).toBe(true);
    expect(d.labTests.some((l) => l.name.includes('动脉血气'))).toBe(true);
  });

  it('突发呼吸困难+咯血+低氧，Top 含肺栓塞且影像 CTPA 为 STAT', () => {
    const d = deepDiagnose(
      { age: 60, vitals: { heartRate: 110, spo2: 89 } },
      [{ name: '突发呼吸困难' }, { name: '胸痛' }, { name: '咯血' }],
      { chronicDiseases: ['下肢静脉血栓'] },
    );
    expect(d.topCandidates.some((c) => c.diagnosis.includes('肺栓塞'))).toBe(true);
    expect(d.imaging.some((im) => im.modality.includes('CTPA') && im.urgency === 'stat')).toBe(true);
  });

  it('呕血+黑便+低血压触发 critical 消化道出血风险', () => {
    const d = deepDiagnose(
      { age: 58, vitals: { heartRate: 110, systolic: 85 } },
      [{ name: '呕血' }, { name: '黑便' }, { name: '头晕' }],
      {},
    );
    expect(d.topCandidates.some((c) => c.diagnosis.includes('消化道出血'))).toBe(true);
    expect(d.riskWarnings.some((r) => r.level === 'critical')).toBe(true);
  });

  it('空输入返回待查兜底，不抛错且仍带 disclaimer', () => {
    const d = deepDiagnose({}, [], {});
    expect(d.topCandidates[0].diagnosis).toContain('待查');
    expect(d.disclaimer).toContain('辅助诊断，最终由医生确认');
  });

  it('disclaimer 固定出现且病种库覆盖四大系统共 16 种', () => {
    const d = deepDiagnose(
      { age: 50 },
      [{ name: '多饮' }, { name: '多尿' }],
      {},
    );
    expect(d.disclaimer).toContain('辅助诊断');
    expect(DISEASE_LIBRARY_SIZE).toBe(16);
  });
});

describe('differentialDiagnosis 鉴别诊断（病程/严重度修正）', () => {
  it('急性胸痛(2h, 严重度3)返回降序鉴别列表，且含鉴别要点', () => {
    const list = differentialDiagnosis(
      [{ name: '胸痛', onset: '压榨样放射' }],
      2,
      3,
    );
    expect(list.length).toBeGreaterThan(0);
    for (const d of list) {
      expect(d.discriminator.length).toBeGreaterThan(0);
      expect(d.likelihood).toBeLessThanOrEqual(0.95);
    }
    //  likelihood 降序
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].likelihood).toBeGreaterThanOrEqual(list[i].likelihood);
    }
  });

  it('慢性(≥7天)多饮多尿患者，鉴别列表以糖尿病类靠前', () => {
    const list = differentialDiagnosis(
      [{ name: '多饮' }, { name: '多尿' }, { name: '消瘦' }],
      24 * 14,
      1,
    );
    expect(list[0].diagnosis).toContain('糖尿病');
  });
});

describe('suggestLabTests / suggestImaging 反查', () => {
  it('按诊断名反查：急性胰腺炎返回急查淀粉酶与腹部CT', () => {
    const labs = suggestLabTests('急性胰腺炎');
    const imaging = suggestImaging('急性胰腺炎');
    expect(labs.some((l) => l.name.includes('淀粉酶') && l.priority === 'urgent')).toBe(true);
    expect(imaging.some((im) => im.modality.includes('CT'))).toBe(true);
  });

  it('按 ICD10 反查与按诊断名结果一致', () => {
    const byName = suggestLabTests('急性胰腺炎');
    const byIcd = suggestLabTests('K85.900');
    expect(byIcd.length).toBe(byName.length);
    expect(byIcd[0].name).toBe(byName[0].name);
  });

  it('未知诊断返回空数组，不抛错', () => {
    expect(suggestLabTests('外星人综合征')).toEqual([]);
    expect(suggestImaging('外星人综合征')).toEqual([]);
    expect(suggestLabTests('')).toEqual([]);
  });

  it('甲亢返回甲功急查与甲状腺超声', () => {
    const labs = suggestLabTests('甲状腺功能亢进');
    const imaging = suggestImaging('甲状腺功能亢进');
    expect(labs.some((l) => l.name.includes('甲状腺功能'))).toBe(true);
    expect(imaging.some((im) => im.modality.includes('甲状腺超声'))).toBe(true);
  });
});
