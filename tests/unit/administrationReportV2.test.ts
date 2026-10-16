/**
 * 健澜科技 jlmedaios - 行政办公 V2 纯函数单测（M228-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessDocumentQuality,
  buildAdministrationReportV2,
  trackSupervision,
} from '../../src/bff/aggregators/administrationReportV2Aggregator';

describe('assessDocumentQuality', () => {
  it('100份公文 → 90.9% 不合格', () => {
    expect(assessDocumentQuality(100).qualified).toBe(false);
  });

  it('105份公文 → 95.5% 合格', () => {
    expect(assessDocumentQuality(105).qualified).toBe(true);
  });
});

describe('trackSupervision', () => {
  it('"已完成"事项 → 已完成', () => {
    expect(trackSupervision('已完成事项').status).toBe('已完成');
  });

  it('"逾期"事项 → 已逾期', () => {
    expect(trackSupervision('逾期事项').overdue).toBe(true);
  });
});

describe('buildAdministrationReportV2', () => {
  it('生成公文数据', () => {
    const r = buildAdministrationReportV2('30d');
    expect(r.document.received).toBeGreaterThan(0);
  });

  it('生成会议数据', () => {
    const r = buildAdministrationReportV2('30d');
    expect(r.meeting.resolutions).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildAdministrationReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
