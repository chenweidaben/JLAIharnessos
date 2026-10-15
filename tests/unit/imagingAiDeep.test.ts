/**
 * 健澜科技 jlmedaios - 医学影像 AI 能力深化 · 病灶级纯函数单测（M152-A）
 *
 * 【AI能力深化】覆盖：
 *   - analyzeLesion：病灶检测（CT/MRI/X-ray/Ultrasound 四模态鉴别诊断）；
 *   - 置信度计算：基准 + 征象加权 + 大小截断 + 区间钳制；
 *   - generateImagingStructuredReport：studyUid 透传 / 报告分节 / 鉴别诊断汇总 / disclaimer。
 * 纯函数、无 I/O、无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  analyzeLesion,
  generateImagingStructuredReport,
  IMAGING_DEEP_DISCLAIMER,
} from '../../src/bff/aggregators/imagingAiDeepAggregator.js';

describe('M152-A 病灶检测 analyzeLesion', () => {
  it('未检出病灶 -> lesionDetected=false，整体置信度 0.1，无病灶条目', () => {
    const r = analyzeLesion({ lesionDetected: false }, 'CT');
    expect(r.lesionDetected).toBe(false);
    expect(r.lesions).toEqual([]);
    expect(r.overallConfidence).toBe(0.1);
    expect(r.differentialList).toEqual([]);
    expect(r.disclaimer).toBe(IMAGING_DEEP_DISCLAIMER);
  });

  it('空特征对象不抛错，按未检出处理', () => {
    const r = analyzeLesion({}, 'MRI');
    expect(r.lesionDetected).toBe(false);
    expect(r.overallConfidence).toBe(0.1);
  });

  it('CT 毛刺状结节 -> 鉴别诊断含周围型肺癌，定位/大小落库', () => {
    const r = analyzeLesion(
      {
        lesionDetected: true,
        lesionLocation: '右肺上叶',
        lesionSizeMm: 20,
        boundary: 'spiculated',
      },
      'CT',
    );
    expect(r.lesionDetected).toBe(true);
    expect(r.lesions).toHaveLength(1);
    const l = r.lesions[0];
    expect(l.lesionLocation).toBe('右肺上叶');
    expect(l.lesionSize).toBe('约 20.0 mm');
    expect(l.differentialList).toContain('周围型肺癌');
    expect(l.severity).toBe('moderate');
  });

  it('MRI 伴瘤周水肿 -> 鉴别诊断含胶质瘤/转移瘤', () => {
    const r = analyzeLesion(
      { lesionDetected: true, lesionLocation: '左额叶', lesionSizeMm: 15, perilesionalEdema: true },
      'MRI',
    );
    expect(r.lesions[0].differentialList).toEqual(['胶质瘤', '脑转移瘤', '脑膜瘤']);
  });

  it('超声无回声 -> 鉴别诊断以囊肿为首', () => {
    const r = analyzeLesion(
      { lesionDetected: true, lesionLocation: '肝 S7 段', lesionSizeMm: 12, densityOrSignal: 'anechoic' },
      'Ultrasound',
    );
    expect(r.lesions[0].differentialList[0]).toBe('囊肿');
  });

  it('X 线不规则骨病变 -> 鉴别诊断含骨肿瘤', () => {
    const r = analyzeLesion(
      { lesionDetected: true, lesionLocation: '左股骨近端', lesionSizeMm: 40, boundary: 'irregular' },
      'X-ray',
    );
    expect(r.lesions[0].differentialList).toContain('骨肿瘤');
  });
});

describe('M152-A 置信度计算', () => {
  it('基准 0.55 + 毛刺 0.15 + 大小截断 0.15 = 0.85', () => {
    const r = analyzeLesion(
      { lesionDetected: true, lesionSizeMm: 20, boundary: 'spiculated' },
      'CT',
    );
    // 0.55 + 0.15 + min(20/100, 0.15)=0.15 = 0.85
    expect(r.overallConfidence).toBeCloseTo(0.85, 3);
    expect(r.lesions[0].confidence).toBeCloseTo(0.85, 3);
  });

  it('叠加肿大淋巴结 +0.1 -> 0.95，且严重程度升为 severe', () => {
    const r = analyzeLesion(
      {
        lesionDetected: true,
        lesionSizeMm: 20,
        boundary: 'spiculated',
        lymphNodeEnlarged: true,
      },
      'CT',
    );
    expect(r.overallConfidence).toBeCloseTo(0.95, 3);
    expect(r.lesions[0].severity).toBe('severe');
  });

  it('极大病灶大小贡献截断在 0.15，置信度不越界', () => {
    const r = analyzeLesion(
      { lesionDetected: true, lesionSizeMm: 300, boundary: 'spiculated', lymphNodeEnlarged: true },
      'CT',
    );
    // 0.55+0.15+0.10+0.15 = 0.95
    expect(r.overallConfidence).toBeLessThanOrEqual(1);
    expect(r.overallConfidence).toBeCloseTo(0.95, 3);
  });

  it('非法尺寸（NaN/负数）按 0 处理，不抛错', () => {
    const r = analyzeLesion(
      { lesionDetected: true, lesionSizeMm: Number.NaN, boundary: 'spiculated' },
      'CT',
    );
    expect(r.lesions[0].lesionSize).toBe('未测量');
    // 0.55 + 0.15 + 0(size) = 0.70
    expect(r.overallConfidence).toBeCloseTo(0.7, 3);
  });
});

describe('M152-A 结构化报告 generateImagingStructuredReport', () => {
  it('studyUid 透传并派生 reportId，分节/鉴别诊断/disclaimer 齐全', () => {
    const a = analyzeLesion(
      { lesionDetected: true, lesionLocation: '右肺上叶', lesionSizeMm: 20, boundary: 'spiculated' },
      'CT',
    );
    const rep = generateImagingStructuredReport('STUDY-0001', a.lesions);
    expect(rep.studyUid).toBe('STUDY-0001');
    expect(rep.reportId).toBe('SR-STUDY-0001');
    expect(rep.modality).toBe('CT');
    expect(rep.impression).toContain('右肺上叶');
    expect(rep.impression).toContain('约 20.0 mm');
    expect(rep.sections.length).toBeGreaterThan(0);
    expect(rep.differentialDiagnosis).toContain('周围型肺癌');
    expect(rep.recommendation.length).toBeGreaterThan(0);
    expect(rep.disclaimer).toBe(IMAGING_DEEP_DISCLAIMER);
  });

  it('MRI 病灶 -> 报告模态识别为 MRI', () => {
    const a = analyzeLesion(
      { lesionDetected: true, lesionLocation: '左额叶', lesionSizeMm: 15, perilesionalEdema: true },
      'MRI',
    );
    const rep = generateImagingStructuredReport('STU-MRI-9', a.lesions);
    expect(rep.modality).toBe('MRI');
  });

  it('空病灶列表 -> 报告默认未见异常，鉴别诊断为空', () => {
    const rep = generateImagingStructuredReport('STU-EMPTY', []);
    expect(rep.impression).toContain('未见明确占位');
    expect(rep.differentialDiagnosis).toEqual([]);
    expect(rep.sections[0].items[0]).toContain('未见明确异常');
  });

  it('缺省 studyUid 回退为 UNKNOWN-STUDY', () => {
    const rep = generateImagingStructuredReport('   ', []);
    expect(rep.studyUid).toBe('UNKNOWN-STUDY');
    expect(rep.reportId).toBe('SR-UNKNOWN-STUDY');
  });
});
