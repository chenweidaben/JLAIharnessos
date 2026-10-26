/**
 * 健澜AI原生医院操作系统OS - 策略路由单元测试（S-03）
 *
 * 覆盖：条件匹配与优先级、权重分流、会话粘性一致性哈希、主备健康判定与降级、
 * 影子标记透传、无匹配规则回退、规则台账校验、路由事件留痕与重置。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import {
  getModelRegistry,
  _resetModelRegistry,
  type ModelCard,
} from '@/bff/agents/modelRegistry.js';
import {
  getModelRouteRegistry,
  _resetModelRouteRegistry,
  selectModel,
  listRouteEvents,
  _resetRouteEvents,
  validateRouteRule,
  type ModelRouteRule,
  type RouteRequest,
} from '@/bff/agents/modelRouter.js';

/** 构造合法测试卡片 */
function makeCard(overrides: Partial<ModelCard> = {}): ModelCard {
  return {
    id: 'main-large-001',
    displayName: '主力大模型',
    provider: 'openai-compatible',
    endpointRef: 'cred-radar-main',
    model: 'radar-main-70b',
    tier: 'primary',
    role: 'main-large',
    contextWindow: 128_000,
    capabilities: ['长文本', '中文'],
    riskLevel: 'medium',
    defaultParams: { temperature: 0.2, topP: 0.9, maxTokens: 4096 },
    knowledgeDependencies: [],
    departmentScope: [],
    scenarioTags: [],
    owner: '陈维',
    releasedAt: '2026-10-20T08:00:00.000Z',
    version: '1.0.0',
    status: 'active',
    sessionSticky: false,
    health: {
      checkedAt: '2026-10-20T08:00:00.000Z',
      available: true,
      consecutiveFailures: 0,
      circuitOpen: false,
    },
    ...overrides,
  };
}

/** 构造合法测试路由规则 */
function makeRule(overrides: Partial<ModelRouteRule> = {}): ModelRouteRule {
  return {
    id: 'rule-main',
    priority: 10,
    match: {},
    modelId: 'main-large-001',
    trafficWeight: 1,
    enabled: true,
    ...overrides,
  };
}

const UNHEALTHY = {
  checkedAt: '2026-10-26T08:00:00.000Z',
  available: false,
  consecutiveFailures: 3,
  circuitOpen: true,
  lastError: 'upstream 503',
};

beforeEach(() => {
  _resetModelRegistry();
  _resetModelRouteRegistry();
  _resetRouteEvents();

  const registry = getModelRegistry();
  registry.register(makeCard({ id: 'main-large-001', fallbackModelId: 'main-medium-001' }));
  registry.register(makeCard({ id: 'main-medium-001', role: 'main-medium' }));
  registry.register(makeCard({ id: 'aux-embedding-001', tier: 'auxiliary', role: 'embedding' }));
  // 熔断主用，备用为健康向量模型
  registry.register(makeCard({ id: 'flaky-001', fallbackModelId: 'aux-embedding-001', health: UNHEALTHY }));
  // 熔断主用，未配置备用
  registry.register(makeCard({ id: 'flaky-no-fallback-001', health: UNHEALTHY }));
  // 熔断主用，备用模型未登记
  registry.register(
    makeCard({ id: 'flaky-fallback-bad-001', fallbackModelId: 'aux-embedding-bad-001', health: UNHEALTHY }),
  );
});

// ============================================================================
// 条件匹配
// ============================================================================

describe('selectModel - 条件匹配', () => {
  it('department 条件命中与不命中', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-dept', match: { department: '心血管内科' }, modelId: 'main-large-001' }),
    );
    expect(selectModel({ department: '心血管内科' }).modelId).toBe('main-large-001');
    expect(selectModel({ department: '呼吸内科' }).modelId).toBeUndefined();
  });

  it('scenario 条件命中与不命中', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-scenario', match: { scenario: '门诊病历' }, modelId: 'main-large-001' }),
    );
    expect(selectModel({ scenario: '门诊病历' }).modelId).toBe('main-large-001');
    expect(selectModel({ scenario: '住院病程' }).modelId).toBeUndefined();
  });

  it('agentId 条件命中与不命中', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-agent', match: { agentId: 'medical-record-writer' }, modelId: 'main-large-001' }),
    );
    expect(selectModel({ agentId: 'medical-record-writer' }).modelId).toBe('main-large-001');
    expect(selectModel({ agentId: 'qc-reviewer' }).modelId).toBeUndefined();
  });

  it('contextLength 条件命中与不命中', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-length', match: { contextLength: 'long' }, modelId: 'main-large-001' }),
    );
    expect(selectModel({ contextLength: 'long' }).modelId).toBe('main-large-001');
    expect(selectModel({ contextLength: 'short' }).modelId).toBeUndefined();
  });

  it('latencyTier 条件命中与不命中', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-latency', match: { latencyTier: 'low' }, modelId: 'main-medium-001' }),
    );
    expect(selectModel({ latencyTier: 'low' }).modelId).toBe('main-medium-001');
    expect(selectModel({ latencyTier: 'high' }).modelId).toBeUndefined();
  });

  it('costTier 条件命中与不命中', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-cost', match: { costTier: 'high' }, modelId: 'main-large-001' }),
    );
    expect(selectModel({ costTier: 'high' }).modelId).toBe('main-large-001');
    expect(selectModel({ costTier: 'low' }).modelId).toBeUndefined();
  });

  it('多条件取交集命中；缺少任一条件不命中', () => {
    getModelRouteRegistry().registerRule(
      makeRule({
        id: 'rule-intersect',
        match: { department: '心血管内科', scenario: '门诊病历' },
        modelId: 'main-large-001',
      }),
    );
    expect(selectModel({ department: '心血管内科', scenario: '门诊病历' }).modelId).toBe('main-large-001');
    expect(selectModel({ department: '心血管内科' }).modelId).toBeUndefined();
    expect(selectModel({ scenario: '门诊病历' }).modelId).toBeUndefined();
  });

  it('enabled=false 的规则跳过不参与匹配', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-disabled', enabled: false, modelId: 'main-large-001' }),
    );
    expect(selectModel({}).modelId).toBeUndefined();
  });

  it('高 priority 规则优先于低 priority 规则', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-low', priority: 1, match: { department: '心血管内科' }, modelId: 'main-medium-001' }),
    );
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-high', priority: 100, match: { department: '心血管内科' }, modelId: 'main-large-001' }),
    );
    const decision = selectModel({ department: '心血管内科' });
    expect(decision.matchedRuleId).toBe('rule-high');
    expect(decision.modelId).toBe('main-large-001');
  });
});

// ============================================================================
// 权重分流
// ============================================================================

describe('selectModel - 权重分流', () => {
  beforeEach(() => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-a', priority: 10, modelId: 'main-large-001', trafficWeight: 0.7 }),
    );
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-b', priority: 10, modelId: 'main-medium-001', trafficWeight: 0.3 }),
    );
  });

  it('随机值落在 0.7 区间选中规则 a', () => {
    const decision = selectModel({}, { random: () => 0.05 });
    expect(decision.modelId).toBe('main-large-001');
    expect(decision.matchedRuleId).toBe('rule-a');
    expect(decision.stickyKey).toBe('none');
    expect(decision.stickyBucket).toBeUndefined();
  });

  it('随机值落在 0.7~1.0 区间选中规则 b', () => {
    const decision = selectModel({}, { random: () => 0.75 });
    expect(decision.modelId).toBe('main-medium-001');
    expect(decision.matchedRuleId).toBe('rule-b');
  });

  it('非粘性请求在固定随机源下结果确定', () => {
    const first = selectModel({}, { random: () => 0.42 });
    const second = selectModel({}, { random: () => 0.42 });
    expect(first.modelId).toBe(second.modelId);
    expect(first.stickyBucket).toBeUndefined();
  });
});

// ============================================================================
// 会话粘性一致性哈希
// ============================================================================

describe('selectModel - 会话粘性', () => {
  it('stickyKey=patientId：同一 patientId 连续两次决策模型一致', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-a', priority: 10, modelId: 'main-large-001', trafficWeight: 0.5, stickyKey: 'patientId' }),
    );
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-b', priority: 10, modelId: 'main-medium-001', trafficWeight: 0.5, stickyKey: 'patientId' }),
    );

    const req: RouteRequest = { patientId: 'P001' };
    const first = selectModel(req, { random: () => 0.99 });
    const second = selectModel(req, { random: () => 0.01 });
    expect(first.modelId).toBe(second.modelId);
    expect(first.stickyKey).toBe('patientId');
    expect(first.stickyBucket).toBeDefined();
  });

  it('stickyKey=visitId：同一 visitId 连续两次决策模型一致', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-a', priority: 10, modelId: 'main-large-001', trafficWeight: 0.5, stickyKey: 'visitId' }),
    );
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-b', priority: 10, modelId: 'main-medium-001', trafficWeight: 0.5, stickyKey: 'visitId' }),
    );

    const req: RouteRequest = { visitId: 'V20261026001' };
    const first = selectModel(req, { random: () => 0.99 });
    const second = selectModel(req, { random: () => 0.01 });
    expect(first.modelId).toBe(second.modelId);
    expect(first.stickyKey).toBe('visitId');
  });

  it('stickyKey=none 不启用粘性，不记录粘性桶位', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-a', priority: 10, modelId: 'main-large-001', trafficWeight: 1, stickyKey: 'none' }),
    );
    const decision = selectModel({ patientId: 'P001' });
    expect(decision.stickyKey).toBe('none');
    expect(decision.stickyBucket).toBeUndefined();
  });

  it('声明 patientId 粘性但标识缺失时退化为权重分流', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-a', priority: 10, modelId: 'main-large-001', trafficWeight: 0.5, stickyKey: 'patientId' }),
    );
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-b', priority: 10, modelId: 'main-medium-001', trafficWeight: 0.5, stickyKey: 'patientId' }),
    );
    const decision = selectModel({}, { random: () => 0.99 });
    expect(decision.modelId).toBe('main-medium-001');
    expect(decision.stickyKey).toBe('none');
    expect(decision.stickyBucket).toBeUndefined();
  });
});

// ============================================================================
// 健康判定与主备降级
// ============================================================================

describe('selectModel - 主备切换', () => {
  it('主用健康：选中主用，记录配置的备用模型 ID，degraded=false', () => {
    getModelRouteRegistry().registerRule(makeRule({ modelId: 'main-large-001' }));
    const decision = selectModel({});
    expect(decision.modelId).toBe('main-large-001');
    expect(decision.fallbackModelId).toBe('main-medium-001');
    expect(decision.degraded).toBe(false);
    expect(decision.routeReason).toContain('健康可用');
  });

  it('主用熔断且备用健康：切换至备用，保留原主用 ID 为 fallbackModelId，degraded=false', () => {
    getModelRouteRegistry().registerRule(makeRule({ id: 'rule-flaky', modelId: 'flaky-001' }));
    const decision = selectModel({});
    expect(decision.modelId).toBe('aux-embedding-001');
    expect(decision.fallbackModelId).toBe('flaky-001');
    expect(decision.degraded).toBe(false);
    expect(decision.routeReason).toContain('切换至备用');

    const event = listRouteEvents()[0];
    expect(event.modelId).toBe('aux-embedding-001');
    expect(event.fallbackModelId).toBe('flaky-001');
  });

  it('备用模型未登记：degraded=true，modelId 保留主用 ID 供审计定位', () => {
    getModelRouteRegistry().registerRule(makeRule({ id: 'rule-bad-fallback', modelId: 'flaky-fallback-bad-001' }));
    const decision = selectModel({});
    expect(decision.degraded).toBe(true);
    expect(decision.degradedReason).toContain('主备均不可用');
    expect(decision.modelId).toBe('flaky-fallback-bad-001');
    expect(decision.fallbackModelId).toBe('aux-embedding-bad-001');
  });

  it('主用不可用且未配置备用：degraded=true 并说明兜底口径', () => {
    getModelRouteRegistry().registerRule(makeRule({ id: 'rule-no-fallback', modelId: 'flaky-no-fallback-001' }));
    const decision = selectModel({});
    expect(decision.degraded).toBe(true);
    expect(decision.degradedReason).toContain('转人工/模板兜底');
    expect(decision.modelId).toBe('flaky-no-fallback-001');
    expect(decision.fallbackModelId).toBeUndefined();
  });

  it('规则引用卡片未登记：degraded=true，modelId 保留规则引用 ID', () => {
    getModelRouteRegistry().registerRule(makeRule({ id: 'rule-ghost', modelId: 'ghost-001' }));
    const decision = selectModel({});
    expect(decision.degraded).toBe(true);
    expect(decision.modelId).toBe('ghost-001');
    expect(decision.degradedReason).toContain('主备均不可用');
  });
});

// ============================================================================
// 影子模型标记
// ============================================================================

describe('selectModel - 影子模型标记', () => {
  it('shadowModelId 透传到决策与事件，shadow=true，本切片不发起影子调用', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-shadow', modelId: 'main-large-001', shadowModelId: 'shadow-001' }),
    );
    const decision = selectModel({});
    expect(decision.shadow).toBe(true);
    expect(decision.shadowModelId).toBe('shadow-001');

    const event = listRouteEvents()[0];
    expect(event.shadowModelId).toBe('shadow-001');
  });
});

// ============================================================================
// 无匹配规则
// ============================================================================

describe('selectModel - 无匹配规则回退', () => {
  it('无匹配规则时 modelId=undefined，沿用既有默认 provider 路径，不强制选模型', () => {
    const decision = selectModel({ department: '心血管内科', scenario: '门诊病历' });
    expect(decision.modelId).toBeUndefined();
    expect(decision.degraded).toBe(false);
    expect(decision.shadow).toBe(false);
    expect(decision.stickyKey).toBe('none');
    expect(decision.routeReason).toContain('无匹配规则');
  });
});

// ============================================================================
// 规则台账校验
// ============================================================================

describe('validateRouteRule - 规则字段校验', () => {
  it('合法规则返回空错误数组', () => {
    expect(validateRouteRule(makeRule())).toEqual([]);
  });

  it('weight 越界（大于 1 / 小于 0）被拒绝', () => {
    expect(validateRouteRule(makeRule({ trafficWeight: 1.2 })).some((e) => e.includes('trafficWeight'))).toBe(true);
    expect(validateRouteRule(makeRule({ trafficWeight: -0.1 })).some((e) => e.includes('trafficWeight'))).toBe(true);
  });

  it('空 id / 空 modelId 被拒绝', () => {
    expect(validateRouteRule(makeRule({ id: '' })).some((e) => e.includes('id'))).toBe(true);
    expect(validateRouteRule(makeRule({ modelId: '' })).some((e) => e.includes('modelId'))).toBe(true);
  });

  it('非法 stickyKey / contextLength 枚举被拒绝', () => {
    expect(
      validateRouteRule(makeRule({ stickyKey: 'roomId' as never })).some((e) => e.includes('stickyKey')),
    ).toBe(true);
    expect(
      validateRouteRule(makeRule({ match: { contextLength: 'huge' as never } })).some((e) => e.includes('contextLength')),
    ).toBe(true);
  });

  it('priority 非有限数值、enabled 非布尔被拒绝', () => {
    expect(validateRouteRule(makeRule({ priority: Number.NaN })).some((e) => e.includes('priority'))).toBe(true);
    expect(validateRouteRule(makeRule({ enabled: 'yes' as never })).some((e) => e.includes('enabled'))).toBe(true);
  });

  it('registerRule 重复 id 拒绝；非法规则拒绝并抛中文错误', () => {
    getModelRouteRegistry().registerRule(makeRule({ id: 'dup-rule' }));
    expect(() => getModelRouteRegistry().registerRule(makeRule({ id: 'dup-rule' }))).toThrow(/RT-002/);
    expect(() => getModelRouteRegistry().registerRule(makeRule({ id: 'bad-rule', trafficWeight: 2 }))).toThrow(/RT-001/);
  });
});

describe('ModelRouteRegistry - validateWeights 权重和校验', () => {
  it('同优先级启用规则权重和为 1 时通过', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-a', priority: 10, modelId: 'main-large-001', trafficWeight: 0.7 }),
    );
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-b', priority: 10, modelId: 'main-medium-001', trafficWeight: 0.3 }),
    );
    expect(getModelRouteRegistry().validateWeights()).toEqual([]);
  });

  it('同优先级权重和不为 1 返回中文错误并指明规则', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-a', priority: 10, modelId: 'main-large-001', trafficWeight: 0.6 }),
    );
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-b', priority: 10, modelId: 'main-medium-001', trafficWeight: 0.3 }),
    );
    const errors = getModelRouteRegistry().validateWeights();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('优先级 10');
    expect(errors[0]).toContain('rule-a');
  });

  it('未启用规则不参与权重和核算', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-a', priority: 10, modelId: 'main-large-001', trafficWeight: 1, enabled: true }),
    );
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-b', priority: 10, modelId: 'main-medium-001', trafficWeight: 0, enabled: false }),
    );
    expect(getModelRouteRegistry().validateWeights()).toEqual([]);
  });

  it('不同优先级组独立核算，仅异常组报错', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-ok-a', priority: 1, modelId: 'main-large-001', trafficWeight: 0.5 }),
    );
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-ok-b', priority: 1, modelId: 'main-medium-001', trafficWeight: 0.5 }),
    );
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-bad-a', priority: 2, modelId: 'main-large-001', trafficWeight: 0.6 }),
    );
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-bad-b', priority: 2, modelId: 'main-medium-001', trafficWeight: 0.3 }),
    );
    const errors = getModelRouteRegistry().validateWeights();
    expect(errors.some((e) => e.includes('优先级 2'))).toBe(true);
    expect(errors.some((e) => e.includes('优先级 1'))).toBe(false);
  });
});

// ============================================================================
// 路由事件留痕
// ============================================================================

describe('selectModel - 路由事件留痕', () => {
  it('每次决策产生一条事件，seq 自增，字段完整', () => {
    getModelRouteRegistry().registerRule(
      makeRule({ id: 'rule-event', modelId: 'main-large-001', shadowModelId: 'shadow-001' }),
    );
    selectModel({ agentId: 'medical-record-writer', scenario: '门诊病历', patientId: 'P001' });
    selectModel({ agentId: 'medical-record-writer', scenario: '门诊病历', patientId: 'P002' });

    const events = listRouteEvents();
    expect(events).toHaveLength(2);
    expect(events[0].seq).toBe(1);
    expect(events[1].seq).toBe(2);
    for (const event of events) {
      expect(event.ruleId).toBe('rule-event');
      expect(event.modelId).toBe('main-large-001');
      expect(event.shadowModelId).toBe('shadow-001');
      expect(event.stickyKey).toBe('none');
      expect(event.agentId).toBe('medical-record-writer');
      expect(event.scenario).toBe('门诊病历');
      expect(event.degraded).toBe(false);
      expect(event.routeReason).toBeTruthy();
      expect(event.at).toBeTruthy();
    }
  });

  it('降级决策事件记录 degraded=true 与降级原因', () => {
    getModelRouteRegistry().registerRule(makeRule({ id: 'rule-degraded', modelId: 'flaky-no-fallback-001' }));
    selectModel({ scenario: '质控' });
    const event = listRouteEvents()[0];
    expect(event.degraded).toBe(true);
    expect(event.modelId).toBe('flaky-no-fallback-001');
    expect(event.scenario).toBe('质控');
  });

  it('_resetRouteEvents 清空事件台账并复位序号', () => {
    getModelRouteRegistry().registerRule(makeRule({ modelId: 'main-large-001' }));
    selectModel({});
    expect(listRouteEvents()).toHaveLength(1);
    _resetRouteEvents();
    expect(listRouteEvents()).toHaveLength(0);
  });
});
