/**
 * 健澜科技 jlmedaios - 大数据 V2 纯函数单测（M215-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessDataQuality,
  buildBigDataReportV2,
  buildDataPipeline,
} from '../../src/bff/aggregators/bigDataReportV2Aggregator';

describe('assessDataQuality', () => {
  it('[0.98, 0.97, 0.96] → 0.97 优秀', () => {
    const r = assessDataQuality(0.98, 0.97, 0.96);
    expect(r.level).toBe('优秀');
  });

  it('[0.8, 0.82, 0.83] → 0.817 待改进', () => {
    const r = assessDataQuality(0.8, 0.82, 0.83);
    expect(r.level).toBe('待改进');
  });
});

describe('buildDataPipeline', () => {
  it('构建管道', () => {
    const r = buildDataPipeline('HIS', 'ODS');
    expect(r.pipeline).toBe('HIS -> ODS');
  });
});

describe('buildBigDataReportV2', () => {
  it('生成采集数据', () => {
    const r = buildBigDataReportV2('30d');
    expect(r.collection.business).toBeGreaterThan(0);
  });

  it('生成存储数据', () => {
    const r = buildBigDataReportV2('30d');
    expect(r.storage.ods).toBeGreaterThan(0);
  });

  it('生成计算数据', () => {
    const r = buildBigDataReportV2('30d');
    expect(r.compute.batch).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildBigDataReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
