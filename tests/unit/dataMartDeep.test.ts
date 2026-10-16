/**
 * 健澜科技 jlmedaios - 医院数据中台深化 · 数据资产治理 单测（M164-A）「数据中台与AI大脑」
 *
 * 覆盖：资产清单 buildDataAssetCatalog、血缘追踪 traceDataLineage、
 *       敏感分级 classifyDataSensitivity、数据服务 generateDataService。
 * 纯函数、无 I/O、无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDataAssetCatalog,
  classifyDataSensitivity,
  generateDataService,
  traceDataLineage,
} from '../../src/bff/aggregators/dataMartDeepAggregator.js';

describe('M164-A 数据资产清单 buildDataAssetCatalog', () => {
  it('产出多层级表与字段，且汇总计数自洽', () => {
    const catalog = buildDataAssetCatalog();
    expect(catalog.tables.length).toBeGreaterThanOrEqual(3);

    const summedCols = catalog.tables.reduce((s, t) => s + t.columns.length, 0);
    expect(catalog.summary.columnCount).toBe(summedCols);

    const summedPii = catalog.tables.reduce(
      (s, t) => s + t.columns.filter((c) => c.isPii).length,
      0,
    );
    expect(catalog.summary.piiColumnCount).toBe(summedPii);

    expect(catalog.summary.tableCount).toBe(catalog.tables.length);
    expect(catalog.summary.avgQuality).toBeGreaterThan(0);
    expect(catalog.summary.avgQuality).toBeLessThanOrEqual(100);
  });

  it('每张表都带质量三维分（完整性/准确性/一致性）与问题清单', () => {
    const catalog = buildDataAssetCatalog();
    for (const t of catalog.tables) {
      expect(t.quality.completeness).toBeGreaterThan(0);
      expect(t.quality.accuracy).toBeGreaterThan(0);
      expect(t.quality.consistency).toBeGreaterThan(0);
      expect(t.quality.issues.length).toBeGreaterThan(0);
      expect(t.rowCount).toBeGreaterThan(0);
    }
  });

  it('身份证号字段被识别为 L4 绝密且标记 PII', () => {
    const catalog = buildDataAssetCatalog();
    const visit = catalog.tables.find((t) => t.table === 'visit_detail')!;
    const idCard = visit.columns.find((c) => c.column === 'id_card')!;
    expect(idCard.sensitivity).toBe('L4');
    expect(idCard.isPii).toBe(true);
  });
});

describe('M164-A 敏感分级 classifyDataSensitivity', () => {
  it('L4 绝密：证件号 / 生物特征 / 口令', () => {
    expect(classifyDataSensitivity('id_card')).toBe('L4');
    expect(classifyDataSensitivity('bank_card_no')).toBe('L4');
    expect(classifyDataSensitivity('login_password')).toBe('L4');
    expect(classifyDataSensitivity('face_feature')).toBe('L4');
  });

  it('L3 机密(PHI)：姓名 / 手机 / 诊断', () => {
    expect(classifyDataSensitivity('patient_name')).toBe('L3');
    expect(classifyDataSensitivity('mobile_phone')).toBe('L3');
    expect(classifyDataSensitivity('diagnosis_code')).toBe('L3');
  });

  it('L2 内部：科室 / 费用', () => {
    expect(classifyDataSensitivity('dept_code')).toBe('L2');
    expect(classifyDataSensitivity('total_amount')).toBe('L2');
  });

  it('L1 公开：性别 / 日期等聚合口径', () => {
    expect(classifyDataSensitivity('gender')).toBe('L1');
    expect(classifyDataSensitivity('stat_date')).toBe('L1');
  });

  it('空/非法输入安全降级为 L1', () => {
    expect(classifyDataSensitivity('')).toBe('L1');
    expect(classifyDataSensitivity(null as never)).toBe('L1');
  });
});

describe('M164-A 血缘追踪 traceDataLineage', () => {
  it('从 DWD 就诊明细可追溯到 ODS 来源与 ADS 应用', () => {
    const line = traceDataLineage('dwd.visit_detail');
    expect(line.table).toBe('dwd.visit_detail');
    expect(line.sources.length).toBeGreaterThan(0);
    expect(line.sources.every((s) => s.layer === 'ODS')).toBe(true);
    expect(line.applications.length).toBeGreaterThan(0);
    // path 应串起 来源 → 加工 → 应用
    expect(line.path[0]).toContain('ODS');
    expect(line.path).toContain('DWD:dwd.visit_detail');
    expect(line.path[line.path.length - 1]).toContain('ADS');
  });

  it('指定字段时链路节点标注该字段', () => {
    const line = traceDataLineage('dwd.visit_detail', 'diagnosis_code');
    expect(line.column).toBe('diagnosis_code');
    expect(line.path.join(' › ')).toContain('diagnosis_code');
  });

  it('未登记的表抛 NOT_FOUND', () => {
    expect(() => traceDataLineage('dwd.not_exists')).toThrow(/未在资产目录中找到/);
  });

  it('空 table 抛 BAD_REQUEST', () => {
    expect(() => traceDataLineage('')).toThrow();
  });
});

describe('M164-A 数据服务 generateDataService', () => {
  it('为 ADS 表生成标准化端点，L4 字段被剔除', () => {
    const svc = generateDataService('dwd.visit_detail');
    expect(svc.endpoint).toBe('/api/v1/data-service/dwd/visit_detail');
    expect(svc.method).toBe('GET');
    expect(svc.serviceId).toContain('visit_detail');
    // 身份证号 L4 绝不进入出参字段
    expect(svc.fields).not.toContain('id_card');
    // 触及姓名/手机等 L3 → requiresMask
    expect(svc.requiresMask).toBe(true);
    expect(svc.maxSensitivity).not.toBe('L4');
  });

  it('过滤条件收敛估算行数并生成参数化 SQL（无拼接）', () => {
    const svc = generateDataService('dws.dept_daily_summary', {
      filters: { dept_code: '0101', stat_date: '2026-10-16' },
      page: 1,
      pageSize: 20,
    });
    expect(svc.filters.dept_code).toBe('0101');
    expect(svc.estimatedRows).toBeLessThanOrEqual(120_000);
    // SQL 用 $n 占位符，禁止把过滤值拼进 SQL
    expect(svc.sql).toContain('$1');
    expect(svc.sql).not.toContain("'0101'");
    expect(svc.pageSize).toBe(20);
  });

  it('fields 白名单裁剪出参字段', () => {
    const svc = generateDataService('dwd.visit_detail', { fields: ['visit_id', 'gender'] });
    expect(svc.fields).toEqual(['visit_id', 'gender']);
  });

  it('未登记的表抛 NOT_FOUND', () => {
    expect(() => generateDataService('ads.missing')).toThrow(/未在资产目录中找到/);
  });
});
