/**
 * 健澜科技 jlmedaios - 介入内镜纯函数单测（M203-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessEndoscopyQuality,
  buildInterventionalReport,
  classifyInterventionalRisk,
  type ProcedureData,
} from '../../src/bff/aggregators/interventionalAggregator';

describe('classifyInterventionalRisk', () => {
  it('高龄+长时+取栓 → 高风险', () => {
    const p: ProcedureData = { type: '取栓', durationMin: 150, patientAge: 75 };
    const r = classifyInterventionalRisk(p);
    expect(r.level).toBe('高风险');
  });

  it('年轻+短时EMR → 低风险', () => {
    const p: ProcedureData = { type: 'EMR', durationMin: 30, patientAge: 45 };
    const r = classifyInterventionalRisk(p);
    expect(r.level).toBe('低风险');
  });
});

describe('assessEndoscopyQuality', () => {
  it('ESD 超 2 小时 → 待改进', () => {
    const p: ProcedureData = { type: 'ESD', durationMin: 150, patientAge: 60 };
    const r = assessEndoscopyQuality(p);
    expect(r.quality).toBe('待改进');
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('常规胃镜 → 优秀', () => {
    const p: ProcedureData = { type: 'EMR', durationMin: 20, patientAge: 50 };
    const r = assessEndoscopyQuality(p);
    expect(r.quality).toBe('优秀');
  });
});

describe('buildInterventionalReport', () => {
  it('生成心血管数据', () => {
    const r = buildInterventionalReport('30d');
    expect(r.cardiac.pci).toBeGreaterThan(0);
  });

  it('生成内镜数据', () => {
    const r = buildInterventionalReport('30d');
    expect(r.endoscopy.gastroscopy).toBeGreaterThan(0);
  });

  it('生成质量数据', () => {
    const r = buildInterventionalReport('30d');
    expect(r.quality.successRate).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildInterventionalReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
