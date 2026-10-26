/**
 * 健澜AI原生医院操作系统OS - 提示词资产注册表单元测试（S-04）
 *
 * 覆盖：登记回读与深拷贝隔离、字段与枚举校验、active 审批要求、发布状态机、
 * 层级 / 范围查询与全院兜底、版本对比、变更记录、Few-shot 引用校验。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import {
  getPromptAssetRegistry,
  _resetPromptAssetRegistry,
  validatePromptAsset,
  createEmptyMetrics,
  registerSystemEthicsSeed,
  buildSystemEthicsSeedAsset,
  SYSTEM_ETHICS_ASSET_ID,
  isReservedSystemAssetId,
  type PromptAsset,
} from '@/bff/prompt/assetRegistry.js';
import { ETHICS_LAYER_TEXT } from '@/core/agent/SystemPromptBuilder.js';

const NOW = '2026-10-26T08:00:00.000Z';

/** 构造合法测试资产 */
function makeAsset(overrides: Partial<PromptAsset> = {}): PromptAsset {
  return {
    id: 'prompt-system-001',
    level: 'system',
    name: '全局医疗伦理红线',
    scope: {},
    version: '1.0.0',
    content: '你是健澜AI原生医院操作系统OS，必须遵守医疗伦理红线。',
    variables: [],
    fewShotRefs: [],
    riskLevel: 'medium',
    status: 'active',
    owner: '陈维',
    approver: '医务部-王主任',
    approvedAt: NOW,
    changeLog: [],
    metrics: createEmptyMetrics('medical-record-writer', 'outpatient-record', '1.0.0'),
    encrypted: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  _resetPromptAssetRegistry();
});

// ============================================================================
// 登记与校验
// ============================================================================

describe('PromptAssetRegistry - 登记与校验', () => {
  it('注册成功后可 getAsset 回读，字段一致', () => {
    const registry = getPromptAssetRegistry();
    const asset = registry.register(makeAsset());
    expect(asset.id).toBe('prompt-system-001');
    expect(registry.getAsset('prompt-system-001')?.content).toBe(asset.content);
  });

  it('重复 id 拒绝登记并抛出中文错误', () => {
    const registry = getPromptAssetRegistry();
    registry.register(makeAsset());
    expect(() => registry.register(makeAsset({ name: '重复资产' }))).toThrow(/PA-002/);
  });

  it('返回对象为深拷贝，修改不影响台账内部状态', () => {
    const registry = getPromptAssetRegistry();
    registry.register(makeAsset());
    const fetched = registry.getAsset('prompt-system-001');
    expect(fetched).toBeDefined();
    fetched!.status = 'archived';
    expect(registry.getAsset('prompt-system-001')?.status).toBe('active');
  });

  it('合法资产校验返回空错误数组', () => {
    expect(validatePromptAsset(makeAsset())).toEqual([]);
  });

  it('非法 level / riskLevel / status 枚举被拒绝', () => {
    expect(validatePromptAsset(makeAsset({ level: 'rule' as never })).some((e) => e.includes('level'))).toBe(true);
    expect(
      validatePromptAsset(makeAsset({ riskLevel: 'critical' as never })).some((e) => e.includes('riskLevel')),
    ).toBe(true);
    expect(
      validatePromptAsset(makeAsset({ status: 'online' as never })).some((e) => e.includes('status')),
    ).toBe(true);
  });

  it('必填字段缺失 / 为空被拒绝', () => {
    expect(validatePromptAsset(makeAsset({ id: '' })).some((e) => e.includes('id'))).toBe(true);
    expect(validatePromptAsset(makeAsset({ name: '' })).some((e) => e.includes('name'))).toBe(true);
    expect(validatePromptAsset(makeAsset({ content: '' })).some((e) => e.includes('content'))).toBe(true);
    expect(validatePromptAsset(makeAsset({ owner: '' })).some((e) => e.includes('owner'))).toBe(true);
    expect(validatePromptAsset(makeAsset({ version: '' })).some((e) => e.includes('version'))).toBe(true);
  });

  it('variables / fewShotRefs 非字符串数组被拒绝', () => {
    expect(validatePromptAsset(makeAsset({ variables: ['ok', 1] as never })).some((e) => e.includes('variables'))).toBe(true);
    expect(
      validatePromptAsset(makeAsset({ fewShotRefs: 'ref-1' as never })).some((e) => e.includes('fewShotRefs')),
    ).toBe(true);
  });

  it('active 状态缺少 approver / approvedAt 拒绝登记', () => {
    const errors = validatePromptAsset(makeAsset({ approver: undefined, approvedAt: undefined }));
    expect(errors.some((e) => e.includes('approver'))).toBe(true);
    expect(errors.some((e) => e.includes('approvedAt'))).toBe(true);
  });

  it('register 汇总校验错误并抛中文错误', () => {
    const registry = getPromptAssetRegistry();
    expect(() => registry.register(makeAsset({ id: '', riskLevel: 'critical' as never }))).toThrow(/PA-001/);
  });
});

// ============================================================================
// 发布状态机
// ============================================================================

describe('PromptAssetRegistry - 发布状态机', () => {
  it('draft 评审通过后可发布为 active，变更记录与审批人写入台账', () => {
    const registry = getPromptAssetRegistry();
    const draft = makeAsset({
      id: 'prompt-scenario-001',
      level: 'scenario',
      status: 'draft',
      approver: undefined,
      approvedAt: undefined,
    });
    registry.register(draft);
    const published = registry.publish('prompt-scenario-001', {
      operator: '医务部-王主任',
      summary: '发布门诊病历场景要求',
      diffRef: 'diff-20261026-01',
      reviewResult: 'approved',
    });
    expect(published.status).toBe('active');
    expect(published.approver).toBe('医务部-王主任');
    expect(published.approvedAt).toBeTruthy();
    expect(published.changeLog).toHaveLength(1);
    expect(published.changeLog[0].reviewResult).toBe('approved');
  });

  it('评审未通过拒绝发布为 active', () => {
    const registry = getPromptAssetRegistry();
    registry.register(
      makeAsset({ id: 'prompt-scenario-002', level: 'scenario', status: 'draft', approver: undefined, approvedAt: undefined }),
    );
    expect(() =>
      registry.publish('prompt-scenario-002', {
        operator: '陈维',
        summary: '评审驳回',
        diffRef: 'diff-02',
        reviewResult: 'rejected',
      }),
    ).toThrow(/PA-004/);
  });

  it('archived / deprecated 不可回退至 active', () => {
    const registry = getPromptAssetRegistry();
    registry.register(makeAsset({ id: 'prompt-old-001', status: 'archived' }));
    expect(() =>
      registry.publish('prompt-old-001', { operator: '陈维', summary: '回退', diffRef: 'diff-03', reviewResult: 'approved' }),
    ).toThrow(/PA-004/);

    registry.register(makeAsset({ id: 'prompt-old-002', status: 'deprecated' }));
    expect(() =>
      registry.publish('prompt-old-002', { operator: '陈维', summary: '回退', diffRef: 'diff-04', reviewResult: 'approved' }),
    ).toThrow(/PA-004/);
  });

  it('archive / deprecate 修改状态，重复操作抛中文错误', () => {
    const registry = getPromptAssetRegistry();
    registry.register(makeAsset({ id: 'prompt-arch-001' }));
    registry.archive('prompt-arch-001');
    expect(registry.getAsset('prompt-arch-001')?.status).toBe('archived');
    expect(() => registry.archive('prompt-arch-001')).toThrow(/PA-004/);

    registry.register(makeAsset({ id: 'prompt-dep-001' }));
    registry.deprecate('prompt-dep-001');
    expect(registry.getAsset('prompt-dep-001')?.status).toBe('deprecated');
    expect(() => registry.deprecate('prompt-dep-001')).toThrow(/PA-004/);
  });
});

// ============================================================================
// 资产查询
// ============================================================================

describe('PromptAssetRegistry - 资产查询', () => {
  it('getActiveAsset 按层级与场景精确命中', () => {
    const registry = getPromptAssetRegistry();
    registry.register(
      makeAsset({ id: 'prompt-sc-001', level: 'scenario', scope: { scenario: 'outpatient-record' } }),
    );
    registry.register(
      makeAsset({ id: 'prompt-sc-002', level: 'scenario', scope: { scenario: 'inpatient-progress' } }),
    );
    expect(registry.getActiveAsset('scenario', { scenario: 'outpatient-record' })?.id).toBe('prompt-sc-001');
    expect(registry.getActiveAsset('scenario', { scenario: 'consult' })).toBeUndefined();
  });

  it('科室缺省 / all 为全院兜底，命中任意部门', () => {
    const registry = getPromptAssetRegistry();
    registry.register(
      makeAsset({ id: 'prompt-dept-001', level: 'department', scope: { department: 'all' } }),
    );
    registry.register(
      makeAsset({ id: 'prompt-dept-002', level: 'department', scope: { department: 'cardiology' } }),
    );
    const fallback = registry.getActiveAsset('department', { department: 'neurology' });
    expect(fallback?.id).toBe('prompt-dept-001');
    const exact = registry.getActiveAsset('department', { department: 'cardiology' });
    expect(exact?.id).toBe('prompt-dept-002');
  });

  it('同 scope 多条 active 时取最新 updatedAt', () => {
    const registry = getPromptAssetRegistry();
    registry.register(
      makeAsset({ id: 'prompt-old', level: 'scenario', scope: { scenario: 'outpatient-record' }, updatedAt: '2026-10-20T08:00:00.000Z' }),
    );
    registry.register(
      makeAsset({ id: 'prompt-new', level: 'scenario', scope: { scenario: 'outpatient-record' }, updatedAt: '2026-10-25T08:00:00.000Z' }),
    );
    expect(registry.getActiveAsset('scenario', { scenario: 'outpatient-record' })?.id).toBe('prompt-new');
  });

  it('listAssets 按 level / status / scenario / department / agentId 过滤', () => {
    const registry = getPromptAssetRegistry();
    registry.register(makeAsset({ id: 'a1', level: 'system' }));
    registry.register(
      makeAsset({ id: 'a2', level: 'scenario', status: 'draft', scope: { scenario: 'outpatient-record', agentId: 'ag-01' } }),
    );
    registry.register(
      makeAsset({ id: 'a3', level: 'department', scope: { department: 'cardiology' } }),
    );
    expect(registry.listAssets({ level: 'system' })).toHaveLength(1);
    expect(registry.listAssets({ status: 'draft' })).toHaveLength(1);
    expect(registry.listAssets({ scenario: 'outpatient-record' })).toHaveLength(1);
    expect(registry.listAssets({ department: 'cardiology' })).toHaveLength(1);
    expect(registry.listAssets({ agentId: 'ag-01' })).toHaveLength(1);
    expect(registry.listAssets()).toHaveLength(3);
  });

  it('getAsset 未登记返回 undefined；getActiveAsset 未命中返回 undefined', () => {
    const registry = getPromptAssetRegistry();
    expect(registry.getAsset('missing')).toBeUndefined();
    expect(registry.getActiveAsset('system', {})).toBeUndefined();
  });
});

// ============================================================================
// 版本对比与变更记录
// ============================================================================

describe('PromptAssetRegistry - 版本对比与变更记录', () => {
  it('compareVersions 返回存在差异的字段名清单', () => {
    const registry = getPromptAssetRegistry();
    registry.register(
      makeAsset({
        id: 'prompt-ver-001',
        changeLog: [
          { version: '1.0.0', changedAt: '2026-10-20T08:00:00.000Z', operator: '陈维', summary: '初版内容', diffRef: 'diff-a' },
          { version: '1.1.0', changedAt: '2026-10-25T08:00:00.000Z', operator: '医务部-王主任', summary: '优化场景要求', diffRef: 'diff-a' },
        ],
      }),
    );
    const result = registry.compareVersions('prompt-ver-001', '1.0.0', '1.1.0');
    expect(result.aVersion).toBe('1.0.0');
    expect(result.bVersion).toBe('1.1.0');
    expect(result.fields).toContain('operator');
    expect(result.fields).toContain('summary');
    expect(result.fields).not.toContain('diffRef');
  });

  it('compareVersions 变更记录缺失版本抛中文错误', () => {
    const registry = getPromptAssetRegistry();
    registry.register(makeAsset({ id: 'prompt-ver-002' }));
    expect(() => registry.compareVersions('prompt-ver-002', '0.9.0', '1.0.0')).toThrow(/PA-006/);
  });

  it('recordChange 追加变更记录；getChangeLog 返回深拷贝隔离', () => {
    const registry = getPromptAssetRegistry();
    registry.register(makeAsset({ id: 'prompt-chg-001' }));
    registry.recordChange('prompt-chg-001', {
      version: '1.0.0',
      changedAt: NOW,
      operator: '陈维',
      summary: '首轮变更',
      diffRef: 'diff-c',
    });
    const log = registry.getChangeLog('prompt-chg-001');
    expect(log).toHaveLength(1);
    log[0].summary = '被外部篡改';
    expect(registry.getChangeLog('prompt-chg-001')[0].summary).toBe('首轮变更');
  });

  it('recordChange / getChangeLog 未登记 id 抛中文错误', () => {
    const registry = getPromptAssetRegistry();
    expect(() =>
      registry.recordChange('missing', { version: '1.0.0', changedAt: NOW, operator: '陈维', summary: 'x', diffRef: 'd' }),
    ).toThrow(/PA-003/);
    expect(() => registry.getChangeLog('missing')).toThrow(/PA-003/);
  });
});

// ============================================================================
// Few-shot 引用校验
// ============================================================================

describe('PromptAssetRegistry - Few-shot 引用校验', () => {
  it('引用资产全部存在且 active 时返回示例资产清单', () => {
    const registry = getPromptAssetRegistry();
    registry.register(makeAsset({ id: 'prompt-fs-001', fewShotRefs: ['fs-example-001'] }));
    registry.register(
      makeAsset({ id: 'fs-example-001', level: 'scenario', name: '门诊病历示例', content: '示例：主诉胸痛 2 小时……' }),
    );
    const targets = registry.resolveFewShot('prompt-fs-001', registry);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('fs-example-001');
  });

  it('引用缺失或未启用时抛错，错误信息含引用 id 清单', () => {
    const registry = getPromptAssetRegistry();
    registry.register(
      makeAsset({ id: 'prompt-fs-002', fewShotRefs: ['fs-missing-001', 'fs-draft-001'] }),
    );
    registry.register(
      makeAsset({ id: 'fs-draft-001', level: 'scenario', status: 'draft', approver: undefined, approvedAt: undefined }),
    );
    expect(() => registry.resolveFewShot('prompt-fs-002', registry)).toThrow(/PA-005/);
    expect(() => registry.resolveFewShot('prompt-fs-002', registry)).toThrow(/fs-missing-001/);
    expect(() => registry.resolveFewShot('prompt-fs-002', registry)).toThrow(/fs-draft-001/);
  });

  it('resolveFewShot 未登记主资产抛中文错误', () => {
    const registry = getPromptAssetRegistry();
    expect(() => registry.resolveFewShot('missing', registry)).toThrow(/PA-003/);
  });
});

// ============================================================================
// A07 系统伦理红线种子资产
// ============================================================================

describe('PromptAssetRegistry - A07 系统种子资产', () => {
  it('种子资产字段合规：system 层、version=1.0.0、riskLevel=high、status=active、变更留痕', () => {
    const seed = buildSystemEthicsSeedAsset({ now: NOW, operator: 'platform-governance', approver: '医务部-王主任' });
    expect(seed.id).toBe(SYSTEM_ETHICS_ASSET_ID);
    expect(seed.level).toBe('system');
    expect(seed.version).toBe('1.0.0');
    expect(seed.riskLevel).toBe('high');
    expect(seed.status).toBe('active');
    expect(seed.variables).toEqual([]);
    expect(seed.fewShotRefs).toEqual([]);
    expect(seed.changeLog).toHaveLength(1);
    expect(seed.changeLog[0].reviewResult).toBe('approved');
    expect(validatePromptAsset(seed)).toEqual([]);
  });

  it('种子资产文本与既有 ETHICS_LAYER 六条红线同源，不出现双份口径漂移', () => {
    const seed = buildSystemEthicsSeedAsset({ now: NOW });
    expect(seed.content).toBe(ETHICS_LAYER_TEXT);
    expect(seed.content).toContain('医疗伦理与安全约束');
    expect(seed.content).toContain('健澜AI原生医院操作系统OS');
  });

  it('registerSystemEthicsSeed 幂等：重复登记不抛 PA-002，回读同一版本资产', () => {
    const registry = getPromptAssetRegistry();
    const first = registerSystemEthicsSeed(registry, { now: NOW });
    const second = registerSystemEthicsSeed(registry, { now: NOW });
    expect(second.id).toBe(first.id);
    expect(second.version).toBe(first.version);
    expect(registry.listAssets({ level: 'system' })).toHaveLength(1);
  });

  it('种子资产在库可查且版本号留痕；保留 ID 判定口径正确', () => {
    const registry = getPromptAssetRegistry();
    registerSystemEthicsSeed(registry, { now: NOW });
    const seed = registry.getAsset(SYSTEM_ETHICS_ASSET_ID);
    expect(seed?.status).toBe('active');
    expect(seed?.changeLog[0].version).toBe('1.0.0');
    expect(isReservedSystemAssetId(SYSTEM_ETHICS_ASSET_ID)).toBe(true);
    expect(isReservedSystemAssetId('prompt-scenario-001')).toBe(false);
  });
});
