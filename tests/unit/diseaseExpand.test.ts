/**
 * 健澜科技 jlmedaios - AI 能力深化：更多病种与更准诊断 单测（M163-C）
 *
 * 覆盖：
 *   1. expandDiseaseLibrary：基础 16 病种入库、合法新病种追加、重复/缺 ICD/缺症状拒收；
 *   2. improveDiagnosisAccuracy：正确反馈提升准确率、小样本收缩、低准确率入复核清单；
 *   3. addDifferentialDiagnosis：增补鉴别诊断、去重、缺鉴别要点跳过、未命中病种安全降级；
 *   4. suggestFurtherExamination：按病种推荐检查、红旗提升紧急度、已完成检查剔除、
 *      高龄卒中影像强制 stat。
 * 纯函数、无 I/O、无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  addDifferentialDiagnosis,
  BASE_DISEASE_LIBRARY,
  expandDiseaseLibrary,
  improveDiagnosisAccuracy,
  suggestFurtherExamination,
} from '../../src/bff/aggregators/diseaseExpandAggregator.js';

describe('M163-C expandDiseaseLibrary 病种扩展', () => {
  it('内置基础库恰好覆盖四大专科 16 个病种', () => {
    expect(BASE_DISEASE_LIBRARY.length).toBe(16);
    const names = BASE_DISEASE_LIBRARY.map((d) => d.name);
    // 神经 4
    expect(names).toContain('脑卒中');
    expect(names).toContain('帕金森病');
    expect(names).toContain('癫痫');
    expect(names).toContain('偏头痛');
    // 泌尿 4
    expect(names).toContain('急性肾炎');
    expect(names).toContain('尿路感染');
    expect(names).toContain('肾结石');
    expect(names).toContain('前列腺增生');
    // 血液 4
    expect(names).toContain('贫血');
    expect(names).toContain('急性白血病');
    expect(names).toContain('淋巴瘤');
    expect(names).toContain('凝血障碍');
    // 风湿免疫 4
    expect(names).toContain('类风湿关节炎');
    expect(names).toContain('系统性红斑狼疮');
    expect(names).toContain('干燥综合征');
    expect(names).toContain('强直性脊柱炎');
  });

  it('每个病种都有医学词典要素：ICD/症状/体征/鉴别/检查', () => {
    for (const d of BASE_DISEASE_LIBRARY) {
      expect(d.icd10.length).toBeGreaterThan(0);
      expect(d.typicalSymptoms.length).toBeGreaterThanOrEqual(3);
      expect(d.signs.length).toBeGreaterThanOrEqual(1);
      expect(d.differential.length).toBeGreaterThanOrEqual(2);
      expect(d.furtherExams.length).toBeGreaterThanOrEqual(2);
      // 鉴别诊断必须带鉴别要点
      for (const diff of d.differential) {
        expect(diff.discriminator.length).toBeGreaterThan(0);
      }
    }
  });

  it('合法新病种成功入库，total 递增', () => {
    const res = expandDiseaseLibrary([
      { name: '三叉神经痛', icd10: 'G50.0', specialty: '神经', typicalSymptoms: ['面部发作性电击样剧痛'] },
    ]);
    expect(res.added.length).toBe(1);
    expect(res.rejected).toHaveLength(0);
    expect(res.total).toBe(17);
    expect(res.library.some((d) => d.name === '三叉神经痛')).toBe(true);
  });

  it('重复病种 / 缺 ICD / 缺症状 / 非法专科 一律拒收并留痕', () => {
    const res = expandDiseaseLibrary([
      { name: '脑卒中', icd10: 'I64', specialty: '神经', typicalSymptoms: ['重复'] }, // 重名
      { name: '缺编码病', specialty: '神经', typicalSymptoms: ['症状'] }, // 缺 ICD
      { name: '缺症状病', icd10: 'X00.0', specialty: '神经' }, // 缺症状
      { name: '非法专科病', icd10: 'X00.0', specialty: '眼科' as never, typicalSymptoms: ['症状'] }, // 非法专科
      { name: '  ', icd10: 'X00.0', specialty: '神经', typicalSymptoms: ['症状'] }, // 空名
    ]);
    expect(res.added).toHaveLength(0);
    expect(res.rejected.length).toBe(5);
    expect(res.total).toBe(16);
  });

  it('空/非法输入安全降级为仅基础库', () => {
    const res = expandDiseaseLibrary(undefined);
    expect(res.total).toBe(16);
    expect(res.added).toHaveLength(0);
  });
});

describe('M163-C improveDiagnosisAccuracy 准确率再校准', () => {
  it('正确反馈占优时准确率上升，漂移为正', () => {
    const res = improveDiagnosisAccuracy(
      [{ disease: '脑卒中', accuracy: 0.7, sampleCount: 20 }],
      [
        { disease: '脑卒中', correct: true },
        { disease: '脑卒中', correct: true },
        { disease: '脑卒中', correct: true },
      ],
    );
    const u = res.updated.find((x) => x.disease === '脑卒中')!;
    // (0.7×20 + 3)/(20+3) = 17/23 ≈ 0.739
    expect(u.accuracy).toBeGreaterThan(0.7);
    expect(u.drift).toBeGreaterThan(0);
    expect(u.sampleCount).toBe(23);
  });

  it('错误反馈占优时准确率下降，且病种进入复核清单', () => {
    const res = improveDiagnosisAccuracy(
      [{ disease: '罕见病XYZ', accuracy: 0.62, sampleCount: 50 }],
      Array.from({ length: 8 }, () => ({ disease: '罕见病XYZ', correct: false })),
    );
    const u = res.updated.find((x) => x.disease === '罕见病XYZ')!;
    expect(u.accuracy).toBeLessThan(0.6);
    expect(res.reviewList).toContain('罕见病XYZ');
  });

  it('模型中不存在的新病种以反馈实测率起步', () => {
    const res = improveDiagnosisAccuracy(
      [],
      [
        { disease: '癫痫', correct: true },
        { disease: '癫痫', correct: true },
        { disease: '癫痫', correct: true },
        { disease: '癫痫', correct: false },
      ],
    );
    const u = res.updated.find((x) => x.disease === '癫痫')!;
    expect(u.sampleCount).toBe(4);
    // 冷启动收缩：0.75×0.7 + 0.65×0.3 = 0.72
    expect(u.accuracy).toBeCloseTo(0.72, 2);
  });

  it('准确率钳制在合理区间且反馈数回传', () => {
    const res = improveDiagnosisAccuracy(
      [{ disease: '贫血', accuracy: 0.97, sampleCount: 100 }],
      Array.from({ length: 20 }, () => ({ disease: '贫血', correct: true })),
    );
    const u = res.updated.find((x) => x.disease === '贫血')!;
    expect(u.accuracy).toBeLessThanOrEqual(0.98);
    expect(res.feedbackCount).toBe(20);
  });
});

describe('M163-C addDifferentialDiagnosis 鉴别诊断增补', () => {
  it('为脑卒中增补新的鉴别诊断，去重且不改原词典', () => {
    const res = addDifferentialDiagnosis('脑卒中', [
      { diagnosis: '癔症性瘫痪', discriminator: '症状与体征不符、有心理诱因、暗示治疗有效' },
    ]);
    expect(res.matched).toBe(true);
    expect(res.entry!.differential.some((d) => d.diagnosis === '癔症性瘫痪')).toBe(true);
    expect(res.skipped).toHaveLength(0);
    // 原词典未被污染
    expect(BASE_DISEASE_LIBRARY.find((d) => d.name === '脑卒中')!.differential.some((d) => d.diagnosis === '癔症性瘫痪')).toBe(false);
  });

  it('缺鉴别要点与重复条目被跳过', () => {
    const res = addDifferentialDiagnosis('癫痫', [
      { diagnosis: '', discriminator: '有要点但空病名' },
      { diagnosis: '晕厥', discriminator: '' }, // 缺要点（晕厥本来就在库里也会被去重）
    ]);
    expect(res.matched).toBe(true);
    expect(res.skipped.length).toBeGreaterThanOrEqual(1);
  });

  it('未命中病种安全降级 matched=false', () => {
    const res = addDifferentialDiagnosis('不存在的病', [{ diagnosis: 'x', discriminator: 'y' }]);
    expect(res.matched).toBe(false);
    expect(res.entry).toBeNull();
  });
});

describe('M163-C suggestFurtherExamination 检查推荐', () => {
  it('脑卒中推荐头颅 CT/MRI 等检查，且按紧急度排序', () => {
    const res = suggestFurtherExamination('脑卒中', { age: 72, hasRedFlag: true });
    expect(res.diagnosis).toBe('脑卒中');
    expect(res.icd10).toBe('I64');
    expect(res.exams.some((e) => e.name.includes('CT'))).toBe(true);
    expect(res.exams.some((e) => e.name.includes('MRI'))).toBe(true);
    // 高龄卒中 + 红旗：所有影像至少 urgent，首位应为 stat
    expect(res.exams[0].urgency).toBe('stat');
    expect(res.redFlagWarnings.length).toBeGreaterThan(0);
  });

  it('已完成的检查自动剔除（不重复开单）', () => {
    const res = suggestFurtherExamination('贫血', { completedExams: ['血常规 + 网织红细胞计数'] });
    expect(res.exams.some((e) => e.name.includes('血常规'))).toBe(false);
    expect(res.exams.length).toBeGreaterThan(0);
  });

  it('类风湿关节炎推荐抗 CCP 与双手 X 线', () => {
    const res = suggestFurtherExamination('类风湿关节炎', {});
    expect(res.exams.some((e) => e.name.includes('抗 CCP'))).toBe(true);
    expect(res.exams.some((e) => e.category === '影像')).toBe(true);
  });

  it('未知病种安全降级为空检查清单', () => {
    const res = suggestFurtherExamination('罕见病XYZ', {});
    expect(res.exams).toHaveLength(0);
    expect(res.specialty).toBeNull();
  });
});
