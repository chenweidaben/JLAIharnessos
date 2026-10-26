/**
 * 健澜AI原生医院操作系统OS - 模型注册表单元测试（S-02）
 *
 * 覆盖：登记/回读、必填与枚举校验、过滤器检索、健康快照合并写入、
 * 状态机迁移合法性、版本台账与 previousVersion 指针、退役留痕、深拷贝隔离。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import {
  getModelRegistry,
  _resetModelRegistry,
  validateModelCard,
  isValidStatusTransition,
  type ModelCard,
  type ModelRegistry,
  type ModelRegistryFilter,
} from '@/bff/agents/modelRegistry.js';

/** 构造合法测试卡片（可按用例覆盖字段） */
function makeCard(overrides: Partial<ModelCard> = {}): ModelCard {
  return {
    id: 'main-large-001',
    displayName: '主力大模型（门诊病历）',
    provider: 'openai-compatible',
    endpointRef: 'cred-radar-main',
    model: 'radar-main-70b',
    tier: 'primary',
    role: 'main-large',
    contextWindow: 128_000,
    capabilities: ['长文本', '中文', '表格理解'],
    riskLevel: 'medium',
    defaultParams: { temperature: 0.2, topP: 0.9, maxTokens: 4096 },
    knowledgeDependencies: ['kb-emr-standards'],
    departmentScope: [],
    scenarioTags: ['门诊病历', '会诊意见'],
    owner: '陈维',
    releasedAt: '2026-10-20T08:00:00.000Z',
    version: '1.0.0',
    status: 'draft',
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

let registry: ModelRegistry;

beforeEach(() => {
  _resetModelRegistry();
  registry = getModelRegistry();
});

// ============================================================================
// 登记与查询
// ============================================================================

describe('ModelRegistry - 登记与查询', () => {
  it('注册成功后可 getCard 回读，字段一致并补齐默认健康快照', () => {
    const registered = registry.register(makeCard());
    expect(registered.id).toBe('main-large-001');
    expect(registered.displayName).toBe('主力大模型（门诊病历）');

    const card = registry.getCard('main-large-001');
    expect(card).not.toBeUndefined();
    expect(card?.version).toBe('1.0.0');
    expect(card?.health.available).toBe(true);
    expect(card?.health.consecutiveFailures).toBe(0);
    expect(card?.health.circuitOpen).toBe(false);
    expect(card?.health.checkedAt).toBeTruthy();
  });

  it('重复 id 拒绝登记并抛出中文错误', () => {
    registry.register(makeCard());
    expect(() => registry.register(makeCard({ displayName: '另一张同名卡片' }))).toThrow(
      /REG-002.*main-large-001/,
    );
  });

  it('getCard 未登记返回 undefined；getCardOrThrow 抛中文错误', () => {
    expect(registry.getCard('not-registered-001')).toBeUndefined();
    expect(() => registry.getCardOrThrow('not-registered-001')).toThrow(
      /REG-001.*not-registered-001/,
    );
  });
});

// ============================================================================
// 纯函数校验 validateModelCard
// ============================================================================

describe('validateModelCard - 字段与枚举校验', () => {
  it('合法卡片返回空错误数组', () => {
    expect(validateModelCard(makeCard())).toEqual([]);
  });

  it('必填字段缺失/为空时返回对应错误', () => {
    const missing: Partial<ModelCard> = {
      id: '',
      displayName: '',
      endpointRef: '',
      model: '',
      owner: '',
      releasedAt: '',
      version: '',
    };
    const errors = validateModelCard(makeCard(missing));
    expect(errors.length).toBeGreaterThan(0);
    for (const field of ['id', 'displayName', 'endpointRef', 'model', 'owner', 'releasedAt', 'version']) {
      expect(errors.some((e) => e.includes(field))).toBe(true);
    }
  });

  it('未知 provider / tier / role / riskLevel / status 均被拒绝', () => {
    expect(validateModelCard(makeCard({ provider: 'gpt-cloud' as never })).some((e) => e.includes('provider'))).toBe(true);
    expect(validateModelCard(makeCard({ tier: 'mega' as never })).some((e) => e.includes('tier'))).toBe(true);
    expect(validateModelCard(makeCard({ role: 'voice' as never })).some((e) => e.includes('role'))).toBe(true);
    expect(validateModelCard(makeCard({ riskLevel: 'critical' as never })).some((e) => e.includes('riskLevel'))).toBe(true);
    expect(validateModelCard(makeCard({ status: 'archived' as never })).some((e) => e.includes('status'))).toBe(true);
  });

  it('默认参数越界与上下文窗口非法时返回错误', () => {
    expect(validateModelCard(makeCard({ defaultParams: { temperature: -0.1, topP: 0.9, maxTokens: 4096 } })).some((e) => e.includes('temperature'))).toBe(true);
    expect(validateModelCard(makeCard({ defaultParams: { temperature: 2.1, topP: 0.9, maxTokens: 4096 } })).some((e) => e.includes('temperature'))).toBe(true);
    expect(validateModelCard(makeCard({ defaultParams: { temperature: 0.2, topP: -0.1, maxTokens: 4096 } })).some((e) => e.includes('topP'))).toBe(true);
    expect(validateModelCard(makeCard({ defaultParams: { temperature: 0.2, topP: 1.1, maxTokens: 4096 } })).some((e) => e.includes('topP'))).toBe(true);
    expect(validateModelCard(makeCard({ defaultParams: { temperature: 0.2, topP: 0.9, maxTokens: 0 } })).some((e) => e.includes('maxTokens'))).toBe(true);
    expect(validateModelCard(makeCard({ contextWindow: 0 })).some((e) => e.includes('contextWindow'))).toBe(true);
  });

  it('sessionSticky 非布尔值被拒绝', () => {
    expect(
      validateModelCard(makeCard({ sessionSticky: 'yes' as never })).some((e) => e.includes('sessionSticky')),
    ).toBe(true);
  });

  it('数组字段不是字符串数组时返回错误', () => {
    expect(
      validateModelCard(makeCard({ capabilities: ['长文本', 123] as never[] })).some((e) =>
        e.includes('capabilities'),
      ),
    ).toBe(true);
  });

  it('register 汇总校验错误并抛中文错误', () => {
    expect(() => registry.register(makeCard({ id: '' }))).toThrow(/REG-007/);
  });
});

// ============================================================================
// listCards 过滤器
// ============================================================================

function seedFilterSet(): void {
  registry.register(makeCard({
    id: 'card-a',
    tier: 'primary',
    role: 'main-large',
    status: 'active',
    provider: 'openai-compatible',
    scenarioTags: ['门诊病历'],
    departmentScope: ['心血管内科'],
    capabilities: ['长文本'],
  }));
  registry.register(makeCard({
    id: 'card-b',
    tier: 'auxiliary',
    role: 'embedding',
    status: 'active',
    provider: 'local',
    scenarioTags: ['语义检索'],
    departmentScope: [],
    capabilities: ['向量召回'],
  }));
  registry.register(makeCard({
    id: 'card-c',
    tier: 'specialized',
    role: 'classifier',
    status: 'draft',
    provider: 'deepseek',
    scenarioTags: ['质控'],
    departmentScope: ['呼吸内科'],
    capabilities: ['敏感识别'],
  }));
  registry.register(makeCard({
    id: 'card-d',
    tier: 'primary',
    role: 'main-medium',
    status: 'standby',
    provider: 'anthropic',
    scenarioTags: ['住院病程'],
    departmentScope: [],
    capabilities: ['中文'],
  }));
}

describe('ModelRegistry - listCards 过滤器', () => {
  beforeEach(() => seedFilterSet());

  it('无过滤条件返回全部卡片', () => {
    expect(registry.listCards()).toHaveLength(4);
  });

  it('按 tier 精确过滤', () => {
    const cards = registry.listCards({ tier: 'primary' });
    expect(cards.map((c) => c.id).sort()).toEqual(['card-a', 'card-d']);
  });

  it('按 role 精确过滤', () => {
    expect(registry.listCards({ role: 'embedding' }).map((c) => c.id)).toEqual(['card-b']);
  });

  it('按 status 精确过滤', () => {
    expect(registry.listCards({ status: 'active' }).map((c) => c.id).sort()).toEqual(['card-a', 'card-b']);
  });

  it('按 provider 精确过滤', () => {
    expect(registry.listCards({ provider: 'deepseek' }).map((c) => c.id)).toEqual(['card-c']);
  });

  it('按 scenarioTag 包含匹配，未命中返回空数组', () => {
    expect(registry.listCards({ scenarioTag: '门诊病历' }).map((c) => c.id)).toEqual(['card-a']);
    expect(registry.listCards({ scenarioTag: '不存在的标签' })).toEqual([]);
  });

  it('按 department 包含匹配；空科室范围（全院）命中任意科室过滤', () => {
    // 特定科室：作用域命中卡片 + 全院卡片（空范围）一并返回
    expect(registry.listCards({ department: '心血管内科' }).map((c) => c.id).sort()).toEqual(['card-a', 'card-b', 'card-d']);
    expect(registry.listCards({ department: '呼吸内科' }).map((c) => c.id).sort()).toEqual(['card-b', 'card-c', 'card-d']);
    // 无作用域匹配的科室：仅全院卡片命中
    expect(registry.listCards({ department: '急诊医学科' }).map((c) => c.id).sort()).toEqual(['card-b', 'card-d']);
  });

  it('按 capability 包含匹配，未命中返回空数组', () => {
    expect(registry.listCards({ capability: '长文本' }).map((c) => c.id)).toEqual(['card-a']);
    expect(registry.listCards({ capability: '不存在的能力' })).toEqual([]);
  });

  it('组合过滤条件取交集', () => {
    const filter: ModelRegistryFilter = { tier: 'primary', status: 'active' };
    expect(registry.listCards(filter).map((c) => c.id)).toEqual(['card-a']);
  });
});

// ============================================================================
// updateHealth
// ============================================================================

describe('ModelRegistry - updateHealth 合并写入', () => {
  it('合并写入健康快照，未登记 id 抛中文错误', () => {
    registry.register(makeCard());
    registry.updateHealth('main-large-001', {
      checkedAt: '2026-10-26T10:00:00.000Z',
      available: false,
      consecutiveFailures: 2,
      circuitOpen: false,
      lastError: '上游 503',
    });
    const health = registry.getCard('main-large-001')?.health;
    expect(health?.available).toBe(false);
    expect(health?.consecutiveFailures).toBe(2);
    expect(health?.lastError).toBe('上游 503');
    expect(health?.circuitOpen).toBe(false);
  });

  it('更新快照时保留既有未覆盖字段（如 P50 时延）', () => {
    registry.register(makeCard());
    registry.updateHealth('main-large-001', {
      checkedAt: '2026-10-26T10:00:00.000Z',
      available: true,
      consecutiveFailures: 0,
      circuitOpen: false,
      latencyMsP50: 180,
    });
    registry.updateHealth('main-large-001', {
      checkedAt: '2026-10-26T10:01:00.000Z',
      available: true,
      consecutiveFailures: 0,
      circuitOpen: false,
    });
    expect(registry.getCard('main-large-001')?.health.latencyMsP50).toBe(180);
  });

  it('updateHealth 未登记 id 抛中文错误', () => {
    expect(() =>
      registry.updateHealth('missing-001', {
        checkedAt: '2026-10-26T10:00:00.000Z',
        available: true,
        consecutiveFailures: 0,
        circuitOpen: false,
      }),
    ).toThrow(/REG-003.*missing-001/);
  });
});

// ============================================================================
// 状态机迁移
// ============================================================================

describe('ModelRegistry - 状态机迁移', () => {
  it('isValidStatusTransition 合法路径逐条通过，其余迁移为非法', () => {
    const legal: Array<[from: ModelCard['status'], to: ModelCard['status']]> = [
      ['draft', 'staging'],
      ['staging', 'active'],
      ['active', 'shadow'],
      ['shadow', 'standby'],
      ['standby', 'retired'],
    ];
    for (const [from, to] of legal) expect(isValidStatusTransition(from, to)).toBe(true);

    expect(isValidStatusTransition('draft', 'active')).toBe(false);
    expect(isValidStatusTransition('active', 'standby')).toBe(false);
    expect(isValidStatusTransition('draft', 'retired')).toBe(false);
    expect(isValidStatusTransition('draft', 'draft')).toBe(false);
  });

  it('setStatus 合法迁移逐条通过并写入状态', () => {
    const chain: ModelCard['status'][] = ['draft', 'staging', 'active', 'shadow', 'standby', 'retired'];
    for (let i = 0; i < chain.length - 1; i++) {
      _resetModelRegistry();
      registry = getModelRegistry();
      registry.register(makeCard({ id: `chain-${i}`, status: chain[i] }));
      expect(() => registry.setStatus(`chain-${i}`, chain[i + 1], '灰度推进')).not.toThrow();
      expect(registry.getCard(`chain-${i}`)?.status).toBe(chain[i + 1]);
    }
  });

  it('非法迁移抛出中文错误并指明合法路径', () => {
    registry.register(makeCard({ status: 'draft' }));
    expect(() => registry.setStatus('main-large-001', 'active')).toThrow(/REG-008.*非法状态迁移/);
    expect(() => registry.setStatus('main-large-001', 'active')).toThrow(/staging/);
  });

  it('retired 为终态，不可再迁移', () => {
    expect(isValidStatusTransition('retired', 'draft')).toBe(false);
    expect(isValidStatusTransition('retired', 'active')).toBe(false);
    registry.register(makeCard({ status: 'retired' }));
    expect(() => registry.setStatus('main-large-001', 'active')).toThrow(/REG-008.*终态/);
  });

  it('状态迁移记录进入版本台账，changelog 标注迁移路径与原因', () => {
    registry.register(makeCard());
    registry.setStatus('main-large-001', 'staging', '准入评测通过');
    const history = registry.getVersionHistory('main-large-001');
    expect(history).toHaveLength(1);
    expect(history[0].changelog).toContain('draft → staging');
    expect(history[0].note).toBe('准入评测通过');
  });

  it('setStatus 未登记 id 抛中文错误', () => {
    expect(() => registry.setStatus('missing-001', 'active')).toThrow(/REG-004.*missing-001/);
  });
});

// ============================================================================
// 版本台账与回滚元数据
// ============================================================================

describe('ModelRegistry - 版本台账', () => {
  it('recordVersion 按顺序追加，previousVersion 指向登记前当前版本', () => {
    registry.register(makeCard({ version: '1.0.0' }));
    registry.recordVersion('main-large-001', {
      version: '1.1.0',
      releasedAt: '2026-10-22T09:00:00.000Z',
      changelog: '接入门诊病历场景',
      owner: '陈维',
    });
    expect(registry.getCard('main-large-001')?.version).toBe('1.1.0');

    registry.recordVersion('main-large-001', {
      version: '1.2.0',
      releasedAt: '2026-10-25T09:00:00.000Z',
      changelog: '长上下文参数调优',
      owner: '陈维',
    });
    const history = registry.getVersionHistory('main-large-001');
    expect(history).toHaveLength(2);
    expect(history[0].previousVersion).toBe('1.0.0');
    expect(history[1].previousVersion).toBe('1.1.0');
    expect(history[0].version).toBe('1.1.0');
    expect(history[1].version).toBe('1.2.0');
  });

  it('recordVersion 未登记 id 抛中文错误；getVersionHistory 未登记抛中文错误', () => {
    expect(() =>
      registry.recordVersion('missing-001', {
        version: '1.0.0',
        releasedAt: '2026-10-26T09:00:00.000Z',
        changelog: 'x',
        owner: '陈维',
      }),
    ).toThrow(/REG-005.*missing-001/);
    expect(() => registry.getVersionHistory('missing-001')).toThrow(/REG-006.*missing-001/);
  });
});

// ============================================================================
// 退役留痕
// ============================================================================

describe('ModelRegistry - retire 退役留痕', () => {
  it('退役写入 retiredAt 与状态，并追加退役版本记录', () => {
    registry.register(makeCard({ status: 'standby' }));
    registry.retire('main-large-001', '基座模型下线，由 1.2.0 接替');
    const card = registry.getCard('main-large-001');
    expect(card?.status).toBe('retired');
    expect(card?.retiredAt).toBeTruthy();

    const history = registry.getVersionHistory('main-large-001');
    expect(history).toHaveLength(1);
    expect(history[0].retiredAt).toBeTruthy();
    expect(history[0].note).toBe('基座模型下线，由 1.2.0 接替');
    expect(history[0].changelog).toContain('模型退役');
  });

  it('重复退役抛出中文错误', () => {
    registry.register(makeCard({ status: 'standby' }));
    registry.retire('main-large-001', '首次退役');
    expect(() => registry.retire('main-large-001', '重复退役')).toThrow(/REG-010.*退役终态/);
  });

  it('retire 未登记 id 抛中文错误', () => {
    expect(() => registry.retire('missing-001', 'x')).toThrow(/REG-009.*missing-001/);
  });
});

// ============================================================================
// 深拷贝隔离：外部修改返回值不影响台账内部状态
// ============================================================================

describe('ModelRegistry - 深拷贝隔离', () => {
  it('修改 getCard 返回对象不影响台账', () => {
    registry.register(makeCard());
    const card = registry.getCard('main-large-001');
    expect(card).not.toBeUndefined();
    card!.id = 'tampered-id';
    card!.displayName = '被篡改名称';
    card!.health.consecutiveFailures = 99;
    card!.capabilities.push('伪造能力');

    const internal = registry.getCard('main-large-001');
    expect(internal?.id).toBe('main-large-001');
    expect(internal?.displayName).toBe('主力大模型（门诊病历）');
    expect(internal?.health.consecutiveFailures).toBe(0);
    expect(internal?.capabilities).toEqual(['长文本', '中文', '表格理解']);
  });

  it('修改 listCards 返回数组与卡片不影响台账', () => {
    registry.register(makeCard());
    const list = registry.listCards();
    list.push(makeCard({ id: 'fake-card' }));
    list[0].displayName = '被篡改名称';
    expect(registry.listCards()).toHaveLength(1);
    expect(registry.getCard('main-large-001')?.displayName).toBe('主力大模型（门诊病历）');
  });

  it('修改 getVersionHistory 返回记录不影响台账', () => {
    registry.register(makeCard());
    registry.recordVersion('main-large-001', {
      version: '1.1.0',
      releasedAt: '2026-10-22T09:00:00.000Z',
      changelog: '原始变更说明',
      owner: '陈维',
    });
    const history = registry.getVersionHistory('main-large-001');
    history.push({ version: '9.9.9', releasedAt: '2026-10-26T09:00:00.000Z', changelog: '伪造记录', owner: '陈维' });
    history[0].changelog = '被篡改说明';
    expect(registry.getVersionHistory('main-large-001')).toHaveLength(1);
    expect(registry.getVersionHistory('main-large-001')[0].changelog).toBe('原始变更说明');
  });
});
