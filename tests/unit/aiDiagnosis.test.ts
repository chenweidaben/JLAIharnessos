/**
 * 健澜科技 jlmedaios - AI 影像病理纯函数单测（M203-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildAIDiagnosisReport,
  classifyPathologyGrade,
  detectLungNodule,
  type CellularFeatures,
  type ImageFeatures,
} from '../../src/bff/aggregators/aiDiagnosisAggregator';

describe('detectLungNodule', () => {
  it('大结节+不规则边界 → 建议活检', () => {
    const f: ImageFeatures = { density: 0.8, sizeMm: 15, irregularBorder: true, calcification: false };
    const r = detectLungNodule(f);
    expect(r.noduleDetected).toBe(true);
    expect(r.malignancyRisk).toBeGreaterThan(0.5);
    expect(r.recommendation).toContain('活检');
  });

  it('小结节+钙化 → 年度复查', () => {
    const f: ImageFeatures = { density: 0.3, sizeMm: 5, irregularBorder: false, calcification: true };
    const r = detectLungNodule(f);
    expect(r.recommendation).toBe('年度复查');
  });
});

describe('classifyPathologyGrade', () => {
  it('低分化癌', () => {
    const f: CellularFeatures = { nuclearPleomorphism: true, mitoticCount: 8, stromalInvasion: true };
    const r = classifyPathologyGrade(f);
    expect(r.grade).toContain('III');
  });

  it('高分化', () => {
    const f: CellularFeatures = { nuclearPleomorphism: false, mitoticCount: 1, stromalInvasion: false };
    const r = classifyPathologyGrade(f);
    expect(r.grade).toContain('I');
  });
});

describe('buildAIDiagnosisReport', () => {
  it('生成影像数据', () => {
    const r = buildAIDiagnosisReport('30d');
    expect(r.imaging.lungNodule).toBeGreaterThan(0);
  });

  it('生成病理数据', () => {
    const r = buildAIDiagnosisReport('30d');
    expect(r.pathology.cancerDetection).toBeGreaterThan(0);
  });

  it('生成性能数据', () => {
    const r = buildAIDiagnosisReport('30d');
    expect(r.performance.auc).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildAIDiagnosisReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
