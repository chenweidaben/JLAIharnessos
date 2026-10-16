/**
 * 健澜科技 jlmedaios - M159-D 数据质量治理单测（中期路线图，纯函数层）
 *
 * 覆盖：
 *  - checkDataQuality：完整性(非空率≥95%)/准确性(值域+格式)/一致性(跨表外键)/
 *    及时性(更新≤24h)/唯一性(主键无重复) 五维正反例；
 *  - generateDataQualityReport：五维汇总、综合评分、整体态势 healthy/warning/critical；
 *  - identifyDataIssues：把不达标维度展开成带严重度的问题清单。
 *
 * 全部为内存样本断言，不依赖数据库与网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  checkDataQuality,
  generateDataQualityReport,
  identifyDataIssues,
  type Row,
} from '../../src/bff/aggregators/dataQualityAggregator';

const NOW = new Date('2026-10-16T08:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

describe('M159-D 数据质量治理', () => {
  /* ------------------------- 完整性 completeness ------------------------- */
  describe('checkDataQuality · 完整性', () => {
    it('非空率≥95% 判定通过；低于阈值判定失败', () => {
      const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({
        mrn: i === 0 ? null : `MRN-${i}`,
      }));
      const r = checkDataQuality('clinical.patients', 'mrn', {
        dimension: 'completeness',
        rows,
        threshold: 95,
      });
      expect(r.dimension).toBe('completeness');
      expect(r.totalRows).toBe(10);
      expect(r.passedRows).toBe(9);
      expect(r.failedRows).toBe(1);
      expect(r.passRate).toBe(90);
      expect(r.status).toBe('fail');
      expect(r.failedValues).toHaveLength(1);
    });

    it('全部非空 → 通过', () => {
      const rows: Row[] = [{ mrn: 'MRN-1' }, { mrn: 'MRN-2' }];
      const r = checkDataQuality('clinical.patients', 'mrn', {
        dimension: 'completeness',
        rows,
        threshold: 95,
      });
      expect(r.passRate).toBe(100);
      expect(r.status).toBe('pass');
    });

    it('空字符串与纯空白视为缺失', () => {
      const rows: Row[] = [{ mrn: '' }, { mrn: '   ' }, { mrn: 'MRN-ok' }];
      const r = checkDataQuality('clinical.patients', 'mrn', {
        dimension: 'completeness',
        rows,
        threshold: 95,
      });
      expect(r.passedRows).toBe(1);
      expect(r.failedRows).toBe(2);
    });
  });

  /* ------------------------- 准确性 accuracy ------------------------- */
  describe('checkDataQuality · 准确性', () => {
    it('值域白名单外的值判失败', () => {
      const rows: Row[] = [{ gender: '男' }, { gender: '女' }, { gender: '保密' }];
      const r = checkDataQuality('clinical.patients', 'gender', {
        dimension: 'accuracy',
        rows,
        domain: ['男', '女', '未知', '未说明'],
      });
      expect(r.passedRows).toBe(2);
      expect(r.failedRows).toBe(1);
      expect(r.failedValues).toContain('保密');
      expect(r.status).toBe('fail');
    });

    it('格式正则不匹配判失败', () => {
      const rows: Row[] = [{ phone: '13800138000' }, { phone: 'not-a-phone' }];
      const r = checkDataQuality('clinical.patients', 'phone', {
        dimension: 'accuracy',
        rows,
        formatRegex: /^1\d{10}$/,
      });
      expect(r.passedRows).toBe(1);
      expect(r.failedRows).toBe(1);
    });

    it('未配置值域/格式 → 按通过跳过，不误报', () => {
      const rows: Row[] = [{ note: 'x' }, { note: null }];
      const r = checkDataQuality('clinical.patients', 'note', {
        dimension: 'accuracy',
        rows,
      });
      expect(r.status).toBe('pass');
      expect(r.failedRows).toBe(0);
    });
  });

  /* ------------------------- 一致性 consistency ------------------------- */
  describe('checkDataQuality · 一致性', () => {
    it('外键在被引用表中存在 → 通过；不存在 → 失败', () => {
      const refRows: Row[] = [{ id: 'p1' }, { id: 'p2' }];
      const rows: Row[] = [
        { patient_id: 'p1' },
        { patient_id: 'p2' },
        { patient_id: 'pX' }, // 悬空外键
      ];
      const r = checkDataQuality('clinical.visits', 'patient_id', {
        dimension: 'consistency',
        rows,
        refRows,
        refField: 'id',
      });
      expect(r.passedRows).toBe(2);
      expect(r.failedRows).toBe(1);
      expect(r.failedValues).toContain('pX');
      expect(r.status).toBe('fail');
    });

    it('空值由完整性兜底，一致性不重复计失败', () => {
      const refRows: Row[] = [{ id: 'p1' }];
      const rows: Row[] = [{ patient_id: 'p1' }, { patient_id: null }];
      const r = checkDataQuality('clinical.visits', 'patient_id', {
        dimension: 'consistency',
        rows,
        refRows,
        refField: 'id',
      });
      expect(r.passedRows).toBe(2);
      expect(r.failedRows).toBe(0);
    });
  });

  /* ------------------------- 及时性 timeliness ------------------------- */
  describe('checkDataQuality · 及时性', () => {
    it('24h 内更新 → 通过；超过 24h → 失败', () => {
      const rows: Row[] = [
        { updated_at: hoursAgo(2) },
        { updated_at: hoursAgo(50) }, // 陈旧
      ];
      const r = checkDataQuality('clinical.visits', 'updated_at', {
        dimension: 'timeliness',
        rows,
        timeField: 'updated_at',
        maxAgeHours: 24,
        now: NOW,
      });
      expect(r.passedRows).toBe(1);
      expect(r.failedRows).toBe(1);
      expect(r.status).toBe('fail');
    });

    it('不可解析的时间戳视为不及时', () => {
      const rows: Row[] = [{ updated_at: 'not-a-date' }];
      const r = checkDataQuality('clinical.visits', 'updated_at', {
        dimension: 'timeliness',
        rows,
        timeField: 'updated_at',
        maxAgeHours: 24,
        now: NOW,
      });
      expect(r.failedRows).toBe(1);
    });
  });

  /* ------------------------- 唯一性 uniqueness ------------------------- */
  describe('checkDataQuality · 唯一性', () => {
    it('主键重复 → 失败', () => {
      const rows: Row[] = [{ id: 'a' }, { id: 'a' }, { id: 'b' }];
      const r = checkDataQuality('clinical.patients', 'id', {
        dimension: 'uniqueness',
        rows,
        pkField: 'id',
      });
      expect(r.passedRows).toBe(1);
      expect(r.failedRows).toBe(2);
      expect(r.status).toBe('fail');
    });

    it('主键全部唯一 → 通过', () => {
      const rows: Row[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      const r = checkDataQuality('clinical.patients', 'id', {
        dimension: 'uniqueness',
        rows,
        pkField: 'id',
      });
      expect(r.passRate).toBe(100);
      expect(r.status).toBe('pass');
    });
  });

  /* ------------------------- 报告生成 ------------------------- */
  describe('generateDataQualityReport', () => {
    it('健康数据集 → healthy，五维齐全', () => {
      const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({
        id: `u${i}`,
        mrn: `MRN-${i}`,
        gender: i % 2 === 0 ? '男' : '女',
        patient_id: `u${i}`,
        updated_at: hoursAgo(2),
      }));
      const report = generateDataQualityReport('clinical.patients', 'today', {
        rows,
        refRows: rows,
        pkField: 'id',
        timeField: 'updated_at',
        now: NOW,
      });
      expect(report.table).toBe('clinical.patients');
      expect(report.period).toBe('today');
      expect(report.dimensionResults).toHaveLength(5);
      expect(report.overallScore).toBeGreaterThanOrEqual(95);
      expect(report.status).toBe('healthy');
      expect(report.summary.total).toBe(5);
    });

    it('混入缺失/重复 → critical，问题清单展开', () => {
      const rows: Row[] = [
        { id: 'a', mrn: 'MRN-a', gender: '男', patient_id: 'a', updated_at: hoursAgo(2) },
        { id: 'a', mrn: null, gender: '保密', patient_id: 'ghost', updated_at: hoursAgo(999) },
        { id: 'b', mrn: 'MRN-b', gender: '女', patient_id: 'b', updated_at: hoursAgo(3) },
      ];
      const report = generateDataQualityReport('clinical.visits', 'today', {
        rows,
        refRows: rows,
        pkField: 'id',
        timeField: 'updated_at',
        now: NOW,
      });
      // 至少完整性/唯一性/一致性/及时性 命中失败
      expect(report.overallScore).toBeLessThan(95);
      expect(['warning', 'critical']).toContain(report.status);
      expect(report.issues.length).toBeGreaterThan(0);
      // 问题必须带严重度与样本
      for (const issue of report.issues) {
        expect(['high', 'medium', 'low']).toContain(issue.severity);
        expect(issue.count).toBeGreaterThan(0);
      }
    });

    it('空表 → 100 分 healthy，不误报', () => {
      const report = generateDataQualityReport('clinical.empty', 'today', {
        rows: [],
        now: NOW,
      });
      expect(report.overallScore).toBe(100);
      expect(report.status).toBe('healthy');
      expect(report.issues).toHaveLength(0);
    });
  });

  /* ------------------------- 问题定位 ------------------------- */
  describe('identifyDataIssues', () => {
    it('定位出不达标维度，含维度标签与严重度', () => {
      const rows: Row[] = [
        { id: 'a', mrn: 'MRN-a' },
        { id: 'a', mrn: null }, // 重复 id + 空 mrn
      ];
      const issues = identifyDataIssues('clinical.patients', 'mrn', {
        rows,
        pkField: 'id',
        refRows: rows,
        refField: 'id',
        now: NOW,
      });
      expect(issues.length).toBeGreaterThanOrEqual(1);
      const dims = issues.map((i) => i.dimension);
      // 唯一性与完整性都应命中
      expect(dims).toContain('uniqueness');
      expect(dims).toContain('completeness');
      for (const is of issues) {
        expect(is.table).toBe('clinical.patients');
        expect(is.field).toBe('mrn');
        expect(is.description.length).toBeGreaterThan(0);
      }
    });

    it('干净数据 → 无问题', () => {
      const rows: Row[] = [
        { id: 'a', mrn: 'MRN-a', updated_at: hoursAgo(2) },
      ];
      const issues = identifyDataIssues('clinical.patients', 'mrn', {
        rows,
        pkField: 'id',
        timeField: 'updated_at',
        refRows: rows,
        now: NOW,
      });
      expect(issues).toHaveLength(0);
    });
  });
});
