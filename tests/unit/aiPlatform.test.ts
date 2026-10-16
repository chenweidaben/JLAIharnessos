/**
 * 健澜科技 jlmedaios - AI 中台纯函数单测（M196-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildAIPlatformReport,
  monitorModelPerformance,
  registerModel,
  type ModelData,
  type ModelPerformance,
} from '../../src/bff/aggregators/aiPlatformAggregator';

describe('registerModel', () => {
  it('生成模型 ID', () => {
    const model: ModelData = { name: 'lung-cancer', version: '1.0', type: 'detection', framework: 'pytorch' };
    const r = registerModel(model);
    expect(r.modelId).toBe('lung-cancer-v1.0');
    expect(r.registered).toBe(true);
  });
});

describe('monitorModelPerformance', () => {
  it('漂移大 → critical', () => {
    const perf: ModelPerformance = { modelId: 'm1', accuracy: 0.9, latencyMs: 100, drift: 0.3 };
    expect(monitorModelPerformance(perf).status).toBe('critical');
  });

  it('低准确率 → degraded', () => {
    const perf: ModelPerformance = { modelId: 'm1', accuracy: 0.8, latencyMs: 100, drift: 0.1 };
    expect(monitorModelPerformance(perf).status).toBe('degraded');
  });

  it('健康 → healthy', () => {
    const perf: ModelPerformance = { modelId: 'm1', accuracy: 0.95, latencyMs: 50, drift: 0.05 };
    expect(monitorModelPerformance(perf).status).toBe('healthy');
  });
});

describe('buildAIPlatformReport', () => {
  it('生成模型注册', () => {
    const r = buildAIPlatformReport('30d');
    expect(r.modelRegistry.registered).toBeGreaterThan(0);
  });

  it('生成推理数据', () => {
    const r = buildAIPlatformReport('30d');
    expect(r.inference.requests).toBeGreaterThan(0);
  });

  it('生成 AI 应用', () => {
    const r = buildAIPlatformReport('30d');
    expect(r.aiApplications.cdss).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildAIPlatformReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
