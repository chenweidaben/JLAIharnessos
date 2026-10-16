/**
 * 健澜科技 jlmedaios - 微服务 V2 纯函数单测（M216-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildMicroserviceReportV2,
  configureCircuitBreaker,
  designServiceBoundary,
} from '../../src/bff/aggregators/microserviceReportV2Aggregator';

describe('designServiceBoundary', () => {
  it('3 限界上下文 → 3 服务', () => {
    const r = designServiceBoundary(['患者', '医生', '药品']);
    expect(r.services).toBe(3);
  });
});

describe('configureCircuitBreaker', () => {
  it('失败率 0.6 → 熔断', () => {
    const r = configureCircuitBreaker(0.6);
    expect(r.open).toBe(true);
  });

  it('失败率 0.3 → 不熔断', () => {
    const r = configureCircuitBreaker(0.3);
    expect(r.open).toBe(false);
  });
});

describe('buildMicroserviceReportV2', () => {
  it('生成服务拆分数据', () => {
    const r = buildMicroserviceReportV2('30d');
    expect(r.serviceSplit.services).toBeGreaterThan(0);
  });

  it('生成API数据', () => {
    const r = buildMicroserviceReportV2('30d');
    expect(r.api.rest).toBeGreaterThan(0);
  });

  it('生成事务数据', () => {
    const r = buildMicroserviceReportV2('30d');
    expect(r.transaction.saga).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildMicroserviceReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
