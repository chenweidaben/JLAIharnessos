/**
 * 健澜科技 jlmedaios - 医学影像 AI 辅助纯函数单测（M138-A · 新业务场景）
 *
 * 覆盖：
 *   - analyzeImaging：胸片 / CT / X光 三类入参的命中与未命中；
 *   - 置信度计算：单条置信度、整体置信度加权平均、normal 分支；
 *   - generateImagingReport：所见 / 印象 / 建议 / disclaimer 拼装。
 * 纯函数、无 I/O、无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  analyzeImaging,
  generateImagingReport,
  IMAGING_AI_DISCLAIMER,
  type Finding,
} from '../../src/bff/aggregators/imagingAiAggregator.js';

describe('M138-A 胸片分析（chest_xray）', () => {
  it('无特征输入 -> normal，整体置信度 0.1', () => {
    const r = analyzeImaging('chest_xray', {});
    expect(r.normal).toBe(true);
    expect(r.findings).toEqual([]);
    expect(r.overallConfidence).toBe(0.1);
    expect(r.disclaimer).toBe(IMAGING_AI_DISCLAIMER);
  });

  it('透亮度 0.75 -> 肺炎，置信度落在 [0.4+0.75*0.5, 0.97]', () => {
    const r = analyzeImaging('chest_xray', { opacityScore: 0.75 });
    expect(r.normal).toBe(false);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].code).toBe('pneumonia');
    expect(r.findings[0].severity).toBe('moderate');
    // 0.4 + 0.75*0.5 = 0.775
    expect(r.findings[0].confidence).toBeCloseTo(0.775, 3);
    expect(r.overallConfidence).toBeCloseTo(0.775, 3);
  });

  it('结节 8mm -> 肺结节；3mm 以下不触发', () => {
    const hit = analyzeImaging('chest_xray', { noduleSizeMm: 8 });
    expect(hit.findings.find((x) => x.code === 'nodule')).toBeDefined();
    expect(hit.findings[0].severity).toBe('moderate');

    const miss = analyzeImaging('chest_xray', { noduleSizeMm: 2 });
    expect(miss.findings.find((x) => x.code === 'nodule')).toBeUndefined();
  });

  it('胸腔积液 -> effusion，置信度 0.85', () => {
    const r = analyzeImaging('chest_xray', { pleuralEffusion: true });
    const eff = r.findings.find((x) => x.code === 'effusion');
    expect(eff).toBeDefined();
    expect(eff?.confidence).toBe(0.85);
  });

  it('多项命中时整体置信度 = 各条置信度平均', () => {
    const r = analyzeImaging('chest_xray', {
      opacityScore: 0.6,       // pneumonia conf = 0.4+0.6*0.5 = 0.7
      noduleSizeMm: 6,         // nodule conf = 0.5+6/100 = 0.56
      pleuralEffusion: true,   // effusion conf = 0.85
    });
    expect(r.findings).toHaveLength(3);
    const expected = (0.7 + 0.56 + 0.85) / 3;
    expect(r.overallConfidence).toBeCloseTo(expected, 3);
  });
});

describe('M138-A CT 分析（ct）', () => {
  it('颅内出血 -> hemorrhage，重度，置信度 0.95', () => {
    const r = analyzeImaging('ct', { intracranialHemorrhage: true });
    expect(r.findings[0].code).toBe('hemorrhage');
    expect(r.findings[0].severity).toBe('severe');
    expect(r.findings[0].confidence).toBe(0.95);
  });

  it('骨折线 -> fracture，置信度 0.9', () => {
    const r = analyzeImaging('ct', { fractureDetected: true });
    expect(r.findings[0].code).toBe('fracture');
    expect(r.findings[0].confidence).toBe(0.9);
  });

  it('占位 20mm -> mass；5mm 以下不触发', () => {
    const hit = analyzeImaging('ct', { massSizeMm: 20 });
    const m = hit.findings.find((x) => x.code === 'mass');
    expect(m).toBeDefined();
    // 0.6 + 20/100 = 0.8
    expect(m?.confidence).toBeCloseTo(0.8, 3);
    expect(m?.severity).toBe('moderate');

    const miss = analyzeImaging('ct', { massSizeMm: 4 });
    expect(miss.findings.find((x) => x.code === 'mass')).toBeUndefined();
  });
});

describe('M138-A X光分析（xray）', () => {
  it('骨折 + 肺炎同时命中', () => {
    const r = analyzeImaging('xray', { fractureDetected: true, opacityScore: 0.9 });
    expect(r.findings).toHaveLength(2);
    expect(r.findings.find((x) => x.code === 'fracture')).toBeDefined();
    expect(r.findings.find((x) => x.code === 'pneumonia')).toBeDefined();
  });

  it('空特征 -> normal', () => {
    const r = analyzeImaging('xray', {});
    expect(r.normal).toBe(true);
  });
});

describe('M138-A 置信度边界与容错', () => {
  it('非法输入（NaN / 负数 / 缺字段）不抛错，按 0 处理', () => {
    const r = analyzeImaging('chest_xray', {
      opacityScore: Number.NaN,
      noduleSizeMm: -5,
      pleuralEffusion: false,
    });
    expect(r.normal).toBe(true);
  });

  it('opacityScore > 1 被截断到 1，置信度不超过 0.9', () => {
    const r = analyzeImaging('xray', { opacityScore: 5 });
    const p = r.findings.find((x) => x.code === 'pneumonia');
    expect(p?.confidence).toBeLessThanOrEqual(0.9);
  });
});

describe('M138-A 报告生成 generateImagingReport', () => {
  const findings: Finding[] = [
    {
      code: 'pneumonia',
      name: '肺部感染（肺炎可能）',
      severity: 'moderate',
      confidence: 0.775,
      description: '肺野透亮度降低。',
    },
    {
      code: 'effusion',
      name: '胸腔积液',
      severity: 'moderate',
      confidence: 0.85,
      description: '肋膈角变钝。',
    },
  ];

  it('标题 / 发现条数 / 印象拼接', () => {
    const rep = generateImagingReport('chest_xray', findings);
    expect(rep.title).toBe('胸片影像 AI 辅助报告');
    expect(rep.findings).toHaveLength(2);
    expect(rep.impression).toBe('肺部感染（肺炎可能）；胸腔积液');
    expect(rep.recommendations.length).toBeGreaterThan(0);
    expect(rep.disclaimer).toBe(IMAGING_AI_DISCLAIMER);
  });

  it('无发现 -> 报告默认"未见明显异常"', () => {
    const rep = generateImagingReport('ct', []);
    expect(rep.impression).toBe('未见明显异常（AI 初筛）');
    expect(rep.findings[0]).toContain('未见明显异常');
  });
});
