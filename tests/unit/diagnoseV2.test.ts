/**
 * 健澜科技 jlmedaios - AI 辅助诊断深化·更多病种 V2（M174-C）单测
 *
 * 覆盖：
 *   - expandDiagnosisLibraryV2：内置 16 病种 + 外部追加 + 去重；
 *   - improveDifferentialDiagnosisV2：症状/病史/化验联合推理，化验阳性加分、
 *     化验方向矛盾扣分，红旗提示；
 *   - suggestTreatmentPlanV2：按诊断反查治疗方案 + 老年/妊娠/肾病个体化提示。
 *
 * 医疗安全：所有用例仅校验规则引擎输出结构与排序，不构成任何真实诊断结论。
 * 【持续优化与新场景】新增专科病种后应在此补充对应用例。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  BUILTIN_DISEASE_COUNT_V2,
  expandDiagnosisLibraryV2,
  improveDifferentialDiagnosisV2,
  suggestTreatmentPlanV2,
} from '../../src/bff/aggregators/diagnoseV2Aggregator';

describe('expandDiagnosisLibraryV2 病种库 V2 扩展', () => {
  it('内置 16 病种，覆盖神经/泌尿/血液/风湿免疫四大系统', () => {
    expect(BUILTIN_DISEASE_COUNT_V2).toBe(16);
    const lib = expandDiagnosisLibraryV2();
    expect(lib.total).toBe(16);
    expect(lib.bySpecialty['神经']).toBe(4);
    expect(lib.bySpecialty['泌尿']).toBe(4);
    expect(lib.bySpecialty['血液']).toBe(4);
    expect(lib.bySpecialty['风湿免疫']).toBe(4);
    expect(lib.disclaimer).toContain('辅助诊断');
  });

  it('外部追加新病种合并入库，按 diagnosis 去重', () => {
    const lib = expandDiagnosisLibraryV2([
      { diagnosis: '多发性硬化', icd10: 'G35.x00', specialty: '神经' },
      { diagnosis: '脑梗死(急性缺血性卒中)', icd10: 'I63.900' }, // 已存在，应去重
      { diagnosis: '', icd10: '' }, // 空名，应忽略
    ]);
    expect(lib.added).toBe(1);
    expect(lib.total).toBe(17);
    expect(lib.diseases.some((d) => d.diagnosis === '多发性硬化')).toBe(true);
  });

  it('无入参时返回内置库且 added=0', () => {
    const lib = expandDiagnosisLibraryV2();
    expect(lib.added).toBe(0);
    expect(lib.total).toBe(16);
  });
});

describe('improveDifferentialDiagnosisV2 鉴别诊断 V2', () => {
  it('偏瘫+口角歪斜+言语不清+突发+房颤：Top1 命中脑梗死并触发卒中红旗', () => {
    const r = improveDifferentialDiagnosisV2(
      [{ name: '偏瘫' }, { name: '口角歪斜' }, { name: '言语不清' }, { name: '突发' }],
      ['心房颤动', '高血压'],
      [{ name: 'ct', abnormal: 'low' }],
    );
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.candidates[0].diagnosis).toContain('脑梗死');
    expect(r.candidates[0].evidence.length).toBeGreaterThan(0);
    expect(r.alerts.some((a) => a.includes('卒中'))).toBe(true);
  });

  it('突发剧烈头痛+呕吐+高血压：命中脑出血并触发红旗提示', () => {
    const r = improveDifferentialDiagnosisV2(
      [{ name: '突发剧烈头痛' }, { name: '呕吐' }, { name: '意识改变' }],
      ['高血压'],
      [{ name: 'ct', abnormal: 'high' }],
    );
    expect(r.candidates.some((c) => c.diagnosis.includes('脑出血'))).toBe(true);
    expect(r.alerts.some((a) => a.includes('脑出血'))).toBe(true);
  });

  it('抽搐+意识丧失+舌咬伤：命中癫痫并触发癫痫持续状态红旗', () => {
    const r = improveDifferentialDiagnosisV2(
      [{ name: '抽搐' }, { name: '意识丧失' }, { name: '舌咬伤' }],
      [],
      [{ name: '脑电图', abnormal: 'positive' }],
    );
    expect(r.candidates.some((c) => c.diagnosis.includes('癫痫'))).toBe(true);
    expect(r.alerts.some((a) => a.includes('癫痫'))).toBe(true);
  });

  it('尿频尿急尿痛+发热+腰痛：命中尿路感染并触发肾盂肾炎红旗', () => {
    const r = improveDifferentialDiagnosisV2(
      [{ name: '尿频' }, { name: '尿急' }, { name: '尿痛' }, { name: '腰痛' }, { name: '发热' }],
      [],
      [{ name: '尿培养', abnormal: 'positive' }],
    );
    expect(r.candidates[0].diagnosis).toContain('尿路感染');
    expect(r.alerts.some((a) => a.includes('肾盂肾炎'))).toBe(true);
  });

  it('腰腹绞痛+血尿：命中肾结石', () => {
    const r = improveDifferentialDiagnosisV2(
      [{ name: '腰腹部绞痛' }, { name: '血尿' }],
      ['痛风'],
      [],
    );
    expect(r.candidates.some((c) => c.diagnosis.includes('肾结石'))).toBe(true);
  });

  it('乏力+面色苍白+血红蛋白低：命中贫血', () => {
    const r = improveDifferentialDiagnosisV2(
      [{ name: '乏力' }, { name: '面色苍白' }],
      ['月经过多'],
      [{ name: '血红蛋白', abnormal: 'low' }, { name: '铁蛋白', abnormal: 'low' }],
    );
    expect(r.candidates[0].diagnosis).toContain('贫血');
  });

  it('对称性多关节肿痛+晨僵+抗CCP阳性：Top1 命中类风湿关节炎', () => {
    const r = improveDifferentialDiagnosisV2(
      [{ name: '对称性多关节肿痛' }, { name: '晨僵' }],
      [],
      [{ name: '抗ccp', abnormal: 'positive' }, { name: '类风湿因子', abnormal: 'positive' }],
    );
    expect(r.candidates[0].diagnosis).toContain('类风湿关节炎');
  });

  it('化验方向矛盾时记录矛盾证据：抗CCP预期阳性但阴性，应标注矛盾', () => {
    const r = improveDifferentialDiagnosisV2(
      [{ name: '对称性多关节肿痛' }, { name: '晨僵' }],
      [],
      [{ name: '抗ccp', abnormal: 'negative' }],
    );
    const ra = r.candidates.find((c) => c.diagnosis.includes('类风湿关节炎'));
    expect(ra).toBeDefined();
    // 抗CCP 预期阳性、实际阴性 → 与预期方向矛盾
    expect(ra!.labEvidence.some((x) => x.includes('矛盾'))).toBe(true);
  });

  it('无任何匹配时返回默认红旗提示', () => {
    const r = improveDifferentialDiagnosisV2([{ name: '偶发鼻塞' }], [], []);
    expect(r.alerts.length).toBeGreaterThan(0);
    expect(r.disclaimer).toContain('辅助诊断');
  });
});

describe('suggestTreatmentPlanV2 治疗方案 V2', () => {
  it('按诊断名反查脑梗死，返回一线溶栓/抗血小板/他汀方案', () => {
    const t = suggestTreatmentPlanV2('脑梗死(急性缺血性卒中)', { age: 68, comorbidities: ['高血压', '糖尿病'] });
    expect(t.diagnosis).toContain('脑梗死');
    expect(t.specialty).toBe('神经');
    expect(t.meds.length).toBeGreaterThan(0);
    expect(t.meds.some((m) => m.role === '一线')).toBe(true);
    expect(t.personalizedNotes.some((n) => n.includes('老年'))).toBe(true);
    expect(t.disclaimer).toContain('辅助诊断');
  });

  it('按 ICD10 反查类风湿关节炎，返回 MTX 锚定药', () => {
    const t = suggestTreatmentPlanV2('M05.900', {});
    expect(t.diagnosis).toContain('类风湿关节炎');
    expect(t.meds.some((m) => m.name.includes('甲氨蝶呤'))).toBe(true);
  });

  it('妊娠患者提示避免致畸药(MTX/丙戊酸钠)', () => {
    const t = suggestTreatmentPlanV2('慢性肾脏病(CKD)', { age: 30, pregnant: true, comorbidities: ['慢性肾病', '糖尿病'] });
    expect(t.personalizedNotes.some((n) => n.includes('妊娠'))).toBe(true);
    expect(t.personalizedNotes.some((n) => n.includes('慢性肾病'))).toBe(true);
  });

  it('未收录诊断返回空方案并给出提示', () => {
    const t = suggestTreatmentPlanV2('未知疾病XYZ', {});
    expect(t.meds.length).toBe(0);
    expect(t.personalizedNotes.some((n) => n.includes('未在 V2 病种库中匹配'))).toBe(true);
  });

  it('抗凝/出血风险合并症提示 NSAIDs 谨慎', () => {
    const t = suggestTreatmentPlanV2('肾结石(上尿路结石)', { age: 70, comorbidities: ['华法林', '出血'] });
    expect(t.personalizedNotes.some((n) => n.includes('抗凝'))).toBe(true);
  });
});
