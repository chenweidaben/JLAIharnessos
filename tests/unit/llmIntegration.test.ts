/**
 * 健澜科技 jlmedaios - 大模型集成纯函数单测（M201-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildLLMIntegrationReport,
  buildRAGPrompt,
  evaluateLLMResponse,
} from '../../src/bff/aggregators/llmIntegrationAggregator';

describe('buildRAGPrompt', () => {
  it('生成带引用的 Prompt', () => {
    const prompt = buildRAGPrompt('高血压用药', ['指南推荐ACEI', '目标血压<140/90']);
    expect(prompt).toContain('高血压用药');
    expect(prompt).toContain('[1]');
  });
});

describe('evaluateLLMResponse', () => {
  it('高质量响应 → 高分', () => {
    const r = evaluateLLMResponse('根据指南推荐...', { relevance: 0.9, accuracy: 0.9, completeness: 0.8, safety: 1 });
    expect(r.score).toBe(1);
  });

  it('低质量响应 → 有问题', () => {
    const r = evaluateLLMResponse('无法确定', { relevance: 0.4, accuracy: 0.5, completeness: 0.5, safety: 0.8 });
    expect(r.issues.length).toBeGreaterThan(0);
  });
});

describe('buildLLMIntegrationReport', () => {
  it('生成模型数据', () => {
    const r = buildLLMIntegrationReport('30d');
    expect(r.models.total).toBeGreaterThan(0);
  });

  it('生成RAG数据', () => {
    const r = buildLLMIntegrationReport('30d');
    expect(r.rag.knowledgeBases).toBeGreaterThan(0);
  });

  it('生成治理数据', () => {
    const r = buildLLMIntegrationReport('30d');
    expect(r.governance.hallucinationRate).toBeGreaterThanOrEqual(0);
  });

  it('生成建议', () => {
    const r = buildLLMIntegrationReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
