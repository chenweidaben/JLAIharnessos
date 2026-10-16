/**
 * 健澜科技 jlmedaios - AI 辅助诊断深化·更多病种与鉴别诊断（M168-A）单测
 *
 * 覆盖：
 *   - expandDiagnosisLibrary：内置 17 病种 + 外部追加 + 去重；
 *   - improveDifferentialDiagnosis：症状/病史/化验联合推理，化验阳性加分、
 *     化验方向矛盾扣分，红旗提示；
 *   - suggestTreatmentPlan：按诊断反查治疗方案 + 老年/妊娠/肾病个体化提示；
 *   - checkDiagnosisConsistency：支持证据 / 缺失证据 / 矛盾点 / 下一步建议。
 *
 * 医疗安全：所有用例仅校验规则引擎输出结构与排序，不构成任何真实诊断结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  BUILTIN_DISEASE_COUNT,
  checkDiagnosisConsistency,
  expandDiagnosisLibrary,
  improveDifferentialDiagnosis,
  suggestTreatmentPlan,
} from '../../src/bff/aggregators/diagnoseDeepAggregator';

describe('expandDiagnosisLibrary 病种库扩展', () => {
  it('内置 17 病种，覆盖消化/呼吸/心血管/内分泌四大系统', () => {
    expect(BUILTIN_DISEASE_COUNT).toBe(17);
    const lib = expandDiagnosisLibrary();
    expect(lib.total).toBe(17);
    expect(lib.bySpecialty['消化']).toBe(5);
    expect(lib.bySpecialty['呼吸']).toBe(4);
    expect(lib.bySpecialty['心血管']).toBe(4);
    expect(lib.bySpecialty['内分泌']).toBe(4);
    expect(lib.disclaimer).toContain('辅助诊断');
  });

  it('外部追加新病种合并入库，按 diagnosis 去重', () => {
    const lib = expandDiagnosisLibrary([
      { diagnosis: '类风湿关节炎', icd10: 'M05.900', specialty: '内分泌' },
      { diagnosis: '病毒性肝炎(乙型/丙型)', icd10: 'B18.100' }, // 已存在，应去重
      { diagnosis: '', icd10: '' }, // 空名，应忽略
    ]);
    expect(lib.added).toBe(1);
    expect(lib.total).toBe(18);
    expect(lib.diseases.some((d) => d.diagnosis === '类风湿关节炎')).toBe(true);
  });

  it('无入参时返回内置库且 added=0', () => {
    const lib = expandDiagnosisLibrary();
    expect(lib.added).toBe(0);
    expect(lib.total).toBe(17);
  });
});

describe('improveDifferentialDiagnosis 鉴别诊断深化', () => {
  it('右上腹痛+油腻饮食+发热，Top1 命中急性胆囊炎', () => {
    const r = improveDifferentialDiagnosis(
      [{ name: '右上腹痛' }, { name: '恶心' }, { name: '发热' }, { name: '油腻饮食诱发' }],
      ['胆囊结石'],
      [],
    );
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.candidates[0].diagnosis).toContain('急性胆囊炎');
    expect(r.candidates[0].evidence.length).toBeGreaterThan(0);
  });

  it('突发撕裂样胸背痛+高血压：返回主动脉夹层并触发红旗提示', () => {
    const r = improveDifferentialDiagnosis(
      [{ name: '撕裂样胸背痛' }],
      ['高血压'],
      [],
    );
    expect(r.candidates.some((c) => c.diagnosis.includes('主动脉夹层'))).toBe(true);
    expect(r.alerts.some((a) => a.includes('主动脉夹层'))).toBe(true);
  });

  it('化验阳性直接加分：血尿酸升高+第一跖趾关节痛，痛风 Top1', () => {
    const r = improveDifferentialDiagnosis(
      [{ name: '第一跖趾关节红肿热痛' }, { name: '夜间痛醒' }],
      [],
      [{ name: '血尿酸', value: 520, abnormal: 'high' }],
    );
    expect(r.candidates[0].diagnosis).toContain('痛风');
    expect(r.candidates[0].labEvidence.some((l) => l.includes('尿酸'))).toBe(true);
  });

  it('化验方向矛盾扣分：预期 TSH 升高但 TSH 降低时，甲减候选 labEvidence 含矛盾', () => {
    const r = improveDifferentialDiagnosis(
      [{ name: '乏力' }, { name: '怕冷' }],
      [],
      [{ name: 'TSH', value: 0.1, abnormal: 'low' }],
    );
    const hypo = r.candidates.find((c) => c.diagnosis.includes('甲状腺功能减退'));
    expect(hypo).toBeDefined();
    expect(hypo!.labEvidence.some((l) => l.includes('矛盾'))).toBe(true);
  });

  it('空输入返回兜底提示，不抛错', () => {
    const r = improveDifferentialDiagnosis([], [], []);
    expect(Array.isArray(r.candidates)).toBe(true);
    expect(r.alerts.length).toBeGreaterThan(0);
    expect(r.disclaimer).toContain('辅助诊断');
  });
});

describe('suggestTreatmentPlan 治疗方案推荐', () => {
  it('痛风返回 NSAIDs/秋水仙碱/降尿酸药与低嘌呤生活方式', () => {
    const t = suggestTreatmentPlan('痛风(急性关节炎期)', {});
    expect(t.diagnosis).toContain('痛风');
    expect(t.meds.some((m) => m.name.includes('NSAIDs'))).toBe(true);
    expect(t.meds.some((m) => m.name.includes('秋水仙碱'))).toBe(true);
    expect(t.lifestyle.some((l) => l.includes('嘌呤'))).toBe(true);
  });

  it('老年+慢性肾病患者：个体化提示包含老年与肾功能调整', () => {
    const t = suggestTreatmentPlan('慢性心力衰竭', {
      age: 72,
      comorbidities: ['慢性肾病'],
    });
    expect(t.personalizedNotes.some((n) => n.includes('老年'))).toBe(true);
    expect(t.personalizedNotes.some((n) => n.includes('肾'))).toBe(true);
  });

  it('妊娠患者提示经产科评估', () => {
    const t = suggestTreatmentPlan('支气管哮喘', { pregnant: true });
    expect(t.personalizedNotes.some((n) => n.includes('产科'))).toBe(true);
  });

  it('未知诊断返回空 meds 且给出提示', () => {
    const t = suggestTreatmentPlan('外星人综合征', {});
    expect(t.meds).toEqual([]);
    expect(t.personalizedNotes.some((n) => n.includes('未在病种库'))).toBe(true);
  });
});

describe('checkDiagnosisConsistency 诊断一致性检查', () => {
  it('典型心衰症状+BNP 升高：一致且 score≥0.5', () => {
    const r = checkDiagnosisConsistency(
      '慢性心力衰竭',
      [{ name: '呼吸困难' }, { name: '端坐呼吸' }, { name: '下肢水肿' }],
      [{ name: 'BNP', value: 800, abnormal: 'high' }],
    );
    expect(r.consistent).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0.5);
    expect(r.supporting.some((s) => s.includes('BNP'))).toBe(true);
  });

  it('诊断为痛风但血尿酸正常：出现矛盾且 consistent=false', () => {
    const r = checkDiagnosisConsistency(
      '痛风(急性关节炎期)',
      [{ name: '第一跖趾关节痛' }],
      [{ name: '血尿酸', value: 320, abnormal: 'normal' }],
    );
    expect(r.conflicts.some((c) => c.includes('尿酸'))).toBe(true);
    expect(r.consistent).toBe(false);
    expect(r.recommendation).toContain('矛盾');
  });

  it('症状与该病种完全不匹配：recommendation 提示重新采集病史', () => {
    const r = checkDiagnosisConsistency(
      '甲状腺功能亢进(Graves 病)',
      [{ name: '右上腹痛' }, { name: '油腻饮食诱发' }],
      [],
    );
    expect(r.recommendation).toContain('重新采集');
  });

  it('未知诊断返回 consistent=false 且不抛错', () => {
    const r = checkDiagnosisConsistency('外星人综合征', [], []);
    expect(r.consistent).toBe(false);
    expect(r.conflicts.length).toBeGreaterThan(0);
  });
});
