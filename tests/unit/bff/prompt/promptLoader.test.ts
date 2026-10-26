/**
 * 健澜AI原生医院操作系统OS - 提示词加载链单元测试（S-04）
 *
 * 覆盖：system → scenario → department → task → 工具说明五层强制顺序、system 层
 * 缺失 / 未 active 安全事件、变量替换与缺失 / 残留占位符报错、Few-shot 引用校验、
 * system 层不可被外部覆盖、无资产库时回退既有 SystemPromptBuilder 默认文本。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import type { MedicalUser } from '@/types';
import {
  getPromptAssetRegistry,
  _resetPromptAssetRegistry,
  createEmptyMetrics,
  type PromptAsset,
} from '@/bff/prompt/assetRegistry.js';
import {
  loadSystemPrompt,
  listSecurityEvents,
  _resetPromptSecurityEvents,
} from '@/bff/prompt/promptLoader.js';
import { createMockTool } from '../../core/helpers.js';

const NOW = '2026-10-26T08:00:00.000Z';

/** 构造合法测试资产 */
function makeAsset(overrides: Partial<PromptAsset> = {}): PromptAsset {
  return {
    id: 'p-system-001',
    level: 'system',
    name: '系统红线资产',
    scope: {},
    version: '1.0.0',
    content: '平台安全红线第一条。',
    variables: [],
    fewShotRefs: [],
    riskLevel: 'medium',
    status: 'active',
    owner: '陈维',
    approver: '医务部-王主任',
    approvedAt: NOW,
    changeLog: [],
    metrics: createEmptyMetrics('ag-01', 'outpatient-record', '1.0.0'),
    encrypted: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeUser(): MedicalUser {
  return {
    userId: 'DOC_001',
    name: '陈医生',
    role: 'doctor',
    title: 'attending',
    department: 'cardiology',
    permissions: [],
    loginTime: Date.now(),
    sessionId: 's1',
    hasPrescriptionRight: true,
  } as unknown as MedicalUser;
}

/** 登记四层 active 资产，返回注册表实例 */
function seedFourLayers(): ReturnType<typeof getPromptAssetRegistry> {
  const registry = getPromptAssetRegistry();
  registry.register(makeAsset({ id: 'p-system', level: 'system', content: '系统红线文本：不得越权诊疗。' }));
  registry.register(
    makeAsset({
      id: 'p-scenario',
      level: 'scenario',
      scope: { scenario: 'outpatient-record' },
      content: '场景要求文本：按门诊病历结构输出。',
    }),
  );
  registry.register(
    makeAsset({
      id: 'p-dept',
      level: 'department',
      scope: { department: 'cardiology' },
      content: '科室规范文本：心内科专科用语。',
    }),
  );
  registry.register(makeAsset({ id: 'p-task', level: 'task', content: '任务上下文文本：围绕主诉组织文书。' }));
  return registry;
}

beforeEach(() => {
  _resetPromptAssetRegistry();
  _resetPromptSecurityEvents();
});

// ============================================================================
// 五层强制顺序
// ============================================================================

describe('loadSystemPrompt - 五层强制顺序', () => {
  it('system 段位于 scenario / department / task / 工具段之前，返回资产 id 与版本引用', () => {
    const registry = seedFourLayers();
    const tool = createMockTool('query_patient');

    const loaded = loadSystemPrompt(
      { user: makeUser(), department: 'cardiology', scenario: 'outpatient-record', tools: [tool] },
      { registry },
    );

    const iSystem = loaded.prompt.indexOf('系统红线文本');
    const iScenario = loaded.prompt.indexOf('场景要求文本');
    const iDept = loaded.prompt.indexOf('科室规范文本');
    const iTask = loaded.prompt.indexOf('任务上下文文本');
    const iTool = loaded.prompt.indexOf('可用工具');

    expect(iSystem).toBeGreaterThanOrEqual(0);
    expect(iSystem).toBeLessThan(iScenario);
    expect(iScenario).toBeLessThan(iDept);
    expect(iDept).toBeLessThan(iTask);
    expect(iTask).toBeLessThan(iTool);

    expect(loaded.assetIds).toEqual(['p-system', 'p-scenario', 'p-dept', 'p-task']);
    expect(loaded.versionRef).toHaveLength(4);
    expect(loaded.versionRef.every((ref) => ref.startsWith('prompt:'))).toBe(true);
  });
});

// ============================================================================
// system 层强制校验与安全事件
// ============================================================================

describe('loadSystemPrompt - system 层强制校验', () => {
  it('system 资产未 active 时抛错并写入 prompt-system-missing 安全事件', () => {
    const registry = getPromptAssetRegistry();
    registry.register(
      makeAsset({ id: 'p-system', status: 'draft', approver: undefined, approvedAt: undefined }),
    );

    expect(() =>
      loadSystemPrompt({ user: makeUser(), scenario: 'outpatient-record', agentId: 'ag-01' }, { registry }),
    ).toThrow(/PL-001/);

    const events = listSecurityEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('prompt-system-missing');
    expect(events[0].scenario).toBe('outpatient-record');
    expect(events[0].agentId).toBe('ag-01');
  });

  it('缺少资产变量取值时抛 PL-002 并写入 prompt-system-invalid 事件', () => {
    const registry = getPromptAssetRegistry();
    registry.register(
      makeAsset({ id: 'p-system', variables: ['patientName'], content: '患者 ${patientName} 您好。' }),
    );

    expect(() => loadSystemPrompt({ user: makeUser(), variables: {} }, { registry })).toThrow(/PL-002/);
    const events = listSecurityEvents();
    expect(events[0].type).toBe('prompt-system-invalid');
  });

  it('替换后残留未解析占位符抛 PL-003 并列明占位符', () => {
    const registry = getPromptAssetRegistry();
    registry.register(
      makeAsset({
        id: 'p-system',
        variables: ['deptName'],
        content: '科室 ${deptName}，备注 ${unknownVar}。',
      }),
    );

    expect(() =>
      loadSystemPrompt({ user: makeUser(), variables: { deptName: '心内科' } }, { registry }),
    ).toThrow(/PL-003/);
    expect(() =>
      loadSystemPrompt({ user: makeUser(), variables: { deptName: '心内科' } }, { registry }),
    ).toThrow(/unknownVar/);
  });
});

// ============================================================================
// Few-shot 引用校验
// ============================================================================

describe('loadSystemPrompt - Few-shot 引用校验', () => {
  it('引用不存在资产时抛错，错误信息含引用 id', () => {
    const registry = getPromptAssetRegistry();
    registry.register(makeAsset({ id: 'p-system', fewShotRefs: ['fs-missing-001'] }));

    expect(() => loadSystemPrompt({ user: makeUser() }, { registry })).toThrow(/PA-005/);
    expect(() => loadSystemPrompt({ user: makeUser() }, { registry })).toThrow(/fs-missing-001/);
  });

  it('引用未启用（draft）资产时抛错', () => {
    const registry = getPromptAssetRegistry();
    registry.register(makeAsset({ id: 'p-system', fewShotRefs: ['fs-draft-001'] }));
    registry.register(
      makeAsset({
        id: 'fs-draft-001',
        level: 'scenario',
        status: 'draft',
        approver: undefined,
        approvedAt: undefined,
        content: '门诊病历示例文本。',
      }),
    );

    expect(() => loadSystemPrompt({ user: makeUser() }, { registry })).toThrow(/PA-005/);
  });
});

// ============================================================================
// system 层不可被外部覆盖
// ============================================================================

describe('loadSystemPrompt - system 层不可覆盖', () => {
  it('补充说明位于末尾，system 层文本始终居首；加载器无传入 system 覆盖入口', () => {
    const registry = seedFourLayers();
    const loaded = loadSystemPrompt(
      {
        user: makeUser(),
        department: 'cardiology',
        scenario: 'outpatient-record',
        extraInstructions: '今日重点关注心梗患者',
      },
      { registry },
    );

    expect(loaded.prompt.startsWith('【系统红线】')).toBe(true);
    expect(loaded.prompt.endsWith('今日重点关注心梗患者')).toBe(true);
    expect(loaded.prompt.indexOf('系统红线文本')).toBeLessThan(loaded.prompt.indexOf('补充说明'));
  });
});

// ============================================================================
// 无资产库回退既有默认文本
// ============================================================================

describe('loadSystemPrompt - 无资产库回退', () => {
  it('空注册表回退 SystemPromptBuilder 默认文本，伦理层与品牌标识保留', () => {
    const registry = getPromptAssetRegistry();
    const tool = createMockTool('query_patient');

    const loaded = loadSystemPrompt(
      {
        user: makeUser(),
        department: 'cardiology',
        taskType: 'ward_round',
        tools: [tool],
        extraInstructions: '补充说明',
      },
      { registry },
    );

    expect(loaded.prompt).toContain('医疗伦理与安全约束');
    expect(loaded.prompt).toContain('健澜AI原生医院操作系统OS');
    expect(loaded.prompt).toContain('可用工具');
    expect(loaded.assetIds).toEqual([]);
    expect(loaded.versionRef).toEqual([]);
  });
});
