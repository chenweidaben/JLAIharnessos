/**
 * 健澜科技 jlmedaios - 纪检监察纯函数单测（M194-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessIntegrityRisk,
  buildDisciplineInspectionReport,
  classifyDisciplineAction,
  type PositionData,
} from '../../src/bff/aggregators/disciplineInspectionAggregator';

describe('assessIntegrityRisk', () => {
  it('三权在握 → 高风险', () => {
    const data: PositionData = { position: '院长', hasApprovalPower: true, hasProcurementPower: true, hasFinancePower: true };
    expect(assessIntegrityRisk(data)).toBe('high');
  });

  it('单权 → 中风险', () => {
    const data: PositionData = { position: '科长', hasApprovalPower: true, hasProcurementPower: false, hasFinancePower: false };
    expect(assessIntegrityRisk(data)).toBe('medium');
  });

  it('无权 → 低风险', () => {
    const data: PositionData = { position: '普通职工', hasApprovalPower: false, hasProcurementPower: false, hasFinancePower: false };
    expect(assessIntegrityRisk(data)).toBe('low');
  });
});

describe('classifyDisciplineAction', () => {
  it('警告 → 轻 1 级', () => {
    expect(classifyDisciplineAction('warning')).toEqual({ severity: '轻', level: 1 });
  });

  it('开除 → 最重 5 级', () => {
    expect(classifyDisciplineAction('expulsion').level).toBe(5);
  });
});

describe('buildDisciplineInspectionReport', () => {
  it('生成组织数据', () => {
    const r = buildDisciplineInspectionReport('纪委办公室', '30d');
    expect(r.organization.members).toBeGreaterThan(0);
  });

  it('生成风险点', () => {
    const r = buildDisciplineInspectionReport('纪委办公室', '30d');
    expect(r.riskPoints.total).toBeGreaterThan(0);
  });

  it('生成监督检查', () => {
    const r = buildDisciplineInspectionReport('纪委办公室', '30d');
    expect(r.supervision.inspections).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildDisciplineInspectionReport('纪委办公室', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
