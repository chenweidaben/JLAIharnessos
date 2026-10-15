/**
 * 健澜科技 jlmedaios - 医院数据中台 · 数据集市聚合器单测（M150-C）
 *
 * 覆盖：
 *   1. 集市构建 buildDataMart：字段对齐、初始行数、参数校验；
 *   2. 集市刷新 refreshDataMart：刷新后 row_count 变化、last_refreshed 更新、
 *      refreshCount 递增、未登记集市 404；
 *   3. 数据预览 getDataMartDetail / buildPreview：预览行存在且确定性。
 * 与持久化解耦，不触库（bun:test）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  baseRowCount,
  buildDataMart,
  buildPreview,
  computeRefreshedRowCount,
  DataMartError,
  getDataMartDetail,
  listDataMarts,
  refreshDataMart,
  seedDataMarts,
} from '../../src/bff/aggregators/dataMartAggregator';

describe('buildDataMart（集市构建）', () => {
  it('按入参构建集市，字段对齐、初始行数非零、状态 ready', () => {
    const mart = buildDataMart('ut_opd_daily', 'dwd.visit_detail', 'daily');
    expect(mart.martName).toBe('ut_opd_daily');
    expect(mart.sourceTable).toBe('dwd.visit_detail');
    expect(mart.refreshFreq).toBe('daily');
    expect(mart.status).toBe('ready');
    expect(mart.refreshCount).toBe(0);
    expect(mart.rowCount).toBeGreaterThan(0);
    expect(mart.lastRefreshed).not.toBeNull();
  });

  it('同一集市名初始行数确定性一致', () => {
    expect(baseRowCount('ut_opd_daily')).toBe(baseRowCount('ut_opd_daily'));
    // 不同集市名初始行数不同（量级分布）
    expect(baseRowCount('ut_opd_daily')).not.toBe(baseRowCount('ut_inp_ops'));
  });

  it('非法 martName / sourceTable / refreshFreq 抛 400', () => {
    expect(() => buildDataMart('Bad Name!', 'dwd.visit_detail', 'daily')).toThrow(DataMartError);
    expect(() => buildDataMart('ut_bad_src', 'not-a-table', 'daily')).toThrow(DataMartError);
    // @ts-expect-error 故意传非法频率
    expect(() => buildDataMart('ut_bad_freq', 'dwd.visit_detail', 'hourly')).toThrow(DataMartError);
  });
});

describe('refreshDataMart（集市刷新）', () => {
  it('刷新后 row_count 变化、last_refreshed 更新、refreshCount 递增', () => {
    const before = buildDataMart('ut_refresh_demo', 'dwd.visit_detail', 'daily');
    const res = refreshDataMart('ut_refresh_demo');

    expect(res.martName).toBe('ut_refresh_demo');
    expect(res.previousRowCount).toBe(before.rowCount);
    expect(res.rowCount).not.toBe(before.rowCount);
    expect(res.changedRows).toBe(res.rowCount - res.previousRowCount);
    expect(res.refreshCount).toBe(1);
    expect(res.lastRefreshed).not.toBeNull();

    // 连续刷新：行数持续增长、次数递增
    const res2 = refreshDataMart('ut_refresh_demo');
    expect(res2.rowCount).toBeGreaterThan(res.rowCount);
    expect(res2.refreshCount).toBe(2);

    const after = getDataMartDetail('ut_refresh_demo');
    expect(after?.rowCount).toBe(res2.rowCount);
    expect(after?.refreshCount).toBe(2);
  });

  it('computeRefreshedRowCount 每次都在旧值上增加', () => {
    const a = computeRefreshedRowCount('ut_refresh_demo', 1000);
    expect(a).toBeGreaterThan(1000);
  });

  it('刷新未登记集市抛 404', () => {
    expect(() => refreshDataMart('ut_not_exist_mart')).toThrow(DataMartError);
  });
});

describe('数据预览', () => {
  it('getDataMartDetail 返回含 preview 的详情', () => {
    buildDataMart('ut_preview_mart', 'dwd.fee_item_detail', 'daily');
    const detail = getDataMartDetail('ut_preview_mart');
    expect(detail).not.toBeNull();
    expect(detail!.preview.length).toBeGreaterThan(0);
    for (const row of detail!.preview) {
      expect(row.label).toBeTruthy();
      expect(typeof row.value).toBe('number');
      expect(typeof row.deltaPct).toBe('number');
    }
  });

  it('同一集市同一行数预览确定性一致；行数变化后预览随之变化', () => {
    buildDataMart('ut_preview_deter', 'dwd.visit_detail', 'daily');
    const p1 = buildPreview('ut_preview_deter', 1234);
    const p2 = buildPreview('ut_preview_deter', 1234);
    expect(p1).toEqual(p2);

    refreshDataMart('ut_preview_deter');
    const detail = getDataMartDetail('ut_preview_deter');
    const p3 = detail!.preview;
    // 行数变了，预览当期值应随之不同（非静态数据）
    const sum = (arr: typeof p3) => arr.reduce((s, r) => s + r.value, 0);
    expect(sum(p3)).not.toBe(sum(p1));
  });

  it('未登记集市详情返回 null', () => {
    expect(getDataMartDetail('ut_ghost_mart')).toBeNull();
  });
});

describe('seedDataMarts（内置六大集市）', () => {
  it('构建门诊日/周/月、住院、药品、质控共六个集市且幂等', () => {
    const first = seedDataMarts();
    expect(first.length).toBe(6);
    const names = first.map((m) => m.martName).sort();
    expect(names).toEqual(
      [
        'drug_consumption',
        'inpatient_ops',
        'opd_ops_daily',
        'opd_ops_monthly',
        'opd_ops_weekly',
        'qc_indicators',
      ].sort(),
    );
    // 幂等：重复 seed 不重复登记
    seedDataMarts();
    const all = listDataMarts().filter((m) =>
      [
        'opd_ops_daily',
        'opd_ops_weekly',
        'opd_ops_monthly',
        'inpatient_ops',
        'drug_consumption',
        'qc_indicators',
      ].includes(m.martName),
    );
    expect(all.length).toBe(6);
  });
});
