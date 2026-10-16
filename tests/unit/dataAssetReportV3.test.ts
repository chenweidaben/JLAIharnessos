/**
 * 健澜科技 jlmedaios - 数据资产 V3 纯函数单测（M206-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDataAssetReportV3,
  classifyDataLevel,
  scoreDataQuality,
  type DataAssetItem,
  type DataQualityMetrics,
} from '../../src/bff/aggregators/dataAssetReportV3Aggregator';

describe('scoreDataQuality', () => {
  it('六维全 0.95 → 95', () => {
    const m: DataQualityMetrics = { completeness: 0.95, accuracy: 0.95, consistency: 0.95, timeliness: 0.95, uniqueness: 0.95, validity: 0.95 };
    expect(scoreDataQuality(m)).toBe(95);
  });
});

describe('classifyDataLevel', () => {
  it('核心数据 → 加密', () => {
    const item: DataAssetItem = { sensitivity: 'core', volume: 1000 };
    const r = classifyDataLevel(item);
    expect(r.level).toBe('核心数据');
    expect(r.encryption).toBe(true);
  });

  it('公开数据 → 不加密', () => {
    const item: DataAssetItem = { sensitivity: 'public', volume: 1000 };
    const r = classifyDataLevel(item);
    expect(r.encryption).toBe(false);
  });
});

describe('buildDataAssetReportV3', () => {
  it('生成目录数据', () => {
    const r = buildDataAssetReportV3('30d');
    expect(r.catalog.total).toBeGreaterThan(0);
  });

  it('生成质量数据', () => {
    const r = buildDataAssetReportV3('30d');
    expect(r.quality.sixDimAvg).toBeGreaterThan(0);
  });

  it('生成应用数据', () => {
    const r = buildDataAssetReportV3('30d');
    expect(r.applications.cdss).toBeGreaterThanOrEqual(0);
  });

  it('生成建议', () => {
    const r = buildDataAssetReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
