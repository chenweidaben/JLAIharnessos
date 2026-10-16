/**
 * 健澜科技 jlmedaios - 大数据平台纯函数单测（M196-A）
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessDataQuality,
  buildBigDataPlatformReport,
  buildDataCatalog,
  type DataAsset,
  type DataQualityData,
} from '../../src/bff/aggregators/bigDataPlatformAggregator';

describe('assessDataQuality', () => {
  it('高质量 → A 级', () => {
    const data: DataQualityData = { completeness: 0.98, accuracy: 0.99, consistency: 0.97, timeliness: 0.96 };
    const r = assessDataQuality(data);
    expect(r.grade).toBe('A');
  });

  it('低质量 → D 级', () => {
    const data: DataQualityData = { completeness: 0.5, accuracy: 0.6, consistency: 0.55, timeliness: 0.5 };
    const r = assessDataQuality(data);
    expect(r.grade).toBe('D');
  });
});

describe('buildDataCatalog', () => {
  it('生成目录条目', () => {
    const assets: DataAsset[] = [{ domain: '临床', tables: 100, volumeTB: 20 }];
    const catalog = buildDataCatalog(assets);
    expect(catalog[0].domain).toBe('临床');
  });
});

describe('buildBigDataPlatformReport', () => {
  it('生成采集数据', () => {
    const r = buildBigDataPlatformReport('30d');
    expect(r.ingestion.sources).toBeGreaterThan(0);
  });

  it('生成存储数据', () => {
    const r = buildBigDataPlatformReport('30d');
    expect(r.storage.dataLakeTB).toBeGreaterThan(0);
  });

  it('生成服务数据', () => {
    const r = buildBigDataPlatformReport('30d');
    expect(r.services.apis).toBeGreaterThan(0);
  });

  it('生成治理数据', () => {
    const r = buildBigDataPlatformReport('30d');
    expect(r.governance.qualityScore).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildBigDataPlatformReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
