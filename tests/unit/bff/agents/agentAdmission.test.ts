/**
 * 健澜AI原生医院操作系统OS - 智能体准入与评测门禁单元测试（S-06）
 *
 * 覆盖：登记字段校验、准入门禁（三类评测 / 通过率 / 风险角色匹配）、状态机迁移、
 * 评测台账、两套注册表映射视图、运行指标聚合、深拷贝隔离。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import {
  getAgentAdmissionRegistry,
  _resetAgentAdmissionRegistry,
  validateAgentRecord,
  isValidAgentStatusTransition,
  mapBffEntry,
  mapDeclarativeDefinition,
  buildMappingView,
  EXPERT_REVIEW_ROLE,
  PHYSICIAN_CONFIRM_ROLE,
  aggregateInterventions,
  appendInterventionMetric,
  normalizeInterventionNodeId,
  emptyInterventionCounts,
  type AgentRecord,
  type EvaluationReport,
  type HumanInterventionMetric,
} from '@/bff/agents/agentAdmission.js';

const NOW = '2026-10-26T08:00:00.000Z';

/** 构造合法测试智能体记录 */
function makeAgent(overrides: Partial<AgentRecord> = {}): AgentRecord {
  return {
    id: 'medical-record-writer',
    name: '病历书写智能体',
    nameEn: 'MedicalRecordWriter',
    version: '1.0.0',
    category: '病历生成',
    tags: ['outpatient-record'],
    description: '辅助医师生成门诊病历草稿。',
    department: ['cardiology'],
    owner: '陈维',
    scenario: 'outpatient-record',
    dataScope: {
      systems: ['emr'],
      tables: ['medical_records', 'visits'],
      fields: ['chief_complaint', 'diagnosis'],
      patientScope: 'own-visit',
      externalExport: false,
    },
    outputType: 'clinical-note',
    riskLevel: 'medium',
    reviewRole: PHYSICIAN_CONFIRM_ROLE,
    tools: [{ toolId: 'query_patient', riskLevel: 'read-only', quota: {} }],
    knowledgeBases: ['cardiology-guidelines'],
    modelBinding: { cardId: 'main-large-001' },
    promptAssets: { system: 'p-system-001', scenario: 'p-scenario-001' },
    interfaces: [
      { systemId: 'emr', endpoint: 'visits/{id}', operation: 'GET', purpose: '读取就诊详情' },
    ],
    evaluation: {},
    status: 'draft',
    deployment: {
      dimensions: { departments: [], clinicians: [], documentTypes: [], patientGroups: [], trafficPercent: 0 },
      switches: {},
      baselineAgentVersion: '',
    },
    changeLog: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** 构造通过口径评测报告 */
function evalReport(overrides: Partial<EvaluationReport> = {}): EvaluationReport {
  return {
    evaluationSetVersion: 'set-2026-10',
    caseCount: 20,
    passedCount: 20,
    failedCount: 0,
    executor: '医务部-王主任',
    evaluatedAt: NOW,
    summary: '全部用例通过',
    passed: true,
    ...overrides,
  };
}

/** 补齐三类通过评测 */
function withPassingEvaluations(agent: AgentRecord): AgentRecord {
  return {
    ...agent,
    evaluation: {
      functional: evalReport({ summary: '功能用例全部通过' }),
      quality: evalReport({ summary: '质量达标，无无依据结论' }),
      security: evalReport({ summary: '对抗用例全部拦截/降级' }),
    },
  };
}

beforeEach(() => {
  _resetAgentAdmissionRegistry();
});

// ============================================================================
// 登记字段校验
// ============================================================================

describe('AgentAdmissionRegistry - 登记校验', () => {
  it('注册成功后可 getAgent 回读，字段一致', () => {
    const registry = getAgentAdmissionRegistry();
    const record = registry.register(makeAgent());
    expect(record.id).toBe('medical-record-writer');
    expect(registry.getAgent('medical-record-writer')?.name).toBe('病历书写智能体');
  });

  it('重复 id 拒绝登记并抛出中文错误', () => {
    const registry = getAgentAdmissionRegistry();
    registry.register(makeAgent());
    expect(() => registry.register(makeAgent({ description: '重复登记' }))).toThrow(/ADM-002/);
  });

  it('必填缺失 / 枚举非法 / 结构非法均被校验函数捕获', () => {
    expect(validateAgentRecord(makeAgent({ id: '' })).some((e) => e.includes('id'))).toBe(true);
    expect(validateAgentRecord(makeAgent({ name: '' })).some((e) => e.includes('name'))).toBe(true);
    expect(
      validateAgentRecord(makeAgent({ outputType: 'video' as never })).some((e) => e.includes('outputType')),
    ).toBe(true);
    expect(
      validateAgentRecord(makeAgent({ riskLevel: 'critical' as never })).some((e) => e.includes('riskLevel')),
    ).toBe(true);
    expect(
      validateAgentRecord(makeAgent({ status: 'online' as never })).some((e) => e.includes('status')),
    ).toBe(true);
    expect(
      validateAgentRecord(makeAgent({ dataScope: { systems: [], tables: [], fields: [], patientScope: 'all' as never, externalExport: false } })).some((e) =>
        e.includes('patientScope'),
      ),
    ).toBe(true);
    expect(
      validateAgentRecord(makeAgent({ tools: [{ toolId: 't1', riskLevel: 'write' as never, quota: {} }] })).some((e) =>
        e.includes('riskLevel'),
      ),
    ).toBe(true);
    expect(
      validateAgentRecord(
        makeAgent({ interfaces: [{ systemId: '', endpoint: '', operation: '', purpose: '' }] }),
      ).some((e) => e.includes('systemId')),
    ).toBe(true);
    expect(
      validateAgentRecord(
        makeAgent({
          deployment: {
            dimensions: { departments: [], clinicians: [], documentTypes: [], patientGroups: [], trafficPercent: 120 },
            switches: {},
            baselineAgentVersion: '',
          },
        }),
      ).some((e) => e.includes('trafficPercent')),
    ).toBe(true);
  });

  it('register 汇总校验错误并抛中文错误', () => {
    const registry = getAgentAdmissionRegistry();
    expect(() => registry.register(makeAgent({ id: '', riskLevel: 'critical' as never }))).toThrow(/ADM-001/);
  });

  it('缺省补 deployment 空配置、changeLog=[]、evaluation={}、status=draft', () => {
    const registry = getAgentAdmissionRegistry();
    const { deployment, evaluation, changeLog, status, ...rest } = makeAgent();
    void deployment; void evaluation; void changeLog; void status;
    const stored = registry.register(rest as AgentRecord);
    expect(stored.status).toBe('draft');
    expect(stored.evaluation).toEqual({});
    expect(stored.changeLog).toEqual([]);
    expect(stored.deployment.dimensions.trafficPercent).toBe(0);
    expect(stored.deployment.switches).toEqual({});
  });

  it('返回对象为深拷贝，修改不影响台账内部状态', () => {
    const registry = getAgentAdmissionRegistry();
    registry.register(makeAgent());
    const fetched = registry.getAgent('medical-record-writer');
    expect(fetched).toBeDefined();
    fetched!.status = 'retired';
    expect(registry.getAgent('medical-record-writer')?.status).toBe('draft');
  });
});

// ============================================================================
// 准入门禁
// ============================================================================

describe('AgentAdmissionRegistry - 发布准入门禁', () => {
  /** 走完 draft → review → staging 流程 */
  function submitThroughStaging(registry: ReturnType<typeof getAgentAdmissionRegistry>, agent: AgentRecord): void {
    registry.register(agent);
    registry.submitForReview(agent.id, { operator: agent.owner, summary: '提交准入评审' });
    registry.approve(agent.id, '医务部-王主任');
  }

  it('无评测记录禁止置 active，状态保持 staging 不变', () => {
    const registry = getAgentAdmissionRegistry();
    submitThroughStaging(registry, makeAgent());
    expect(() => registry.activate('medical-record-writer')).toThrow(/ADM-005/);
    expect(registry.getAgent('medical-record-writer')?.status).toBe('staging');
  });

  it('功能 / 质量 / 安全任一评测缺失分别阻断发布', () => {
    const registry = getAgentAdmissionRegistry();
    submitThroughStaging(registry, makeAgent());
    registry.recordEvaluation('medical-record-writer', 'functional', evalReport());
    expect(() => registry.activate('medical-record-writer')).toThrow(/质量评测记录缺失/);
    registry.recordEvaluation('medical-record-writer', 'quality', evalReport());
    expect(() => registry.activate('medical-record-writer')).toThrow(/安全对抗评测记录缺失/);
  });

  it('功能评测未通过或通过率低于 95% 阻断；质量 / 安全未通过阻断', () => {
    // 功能未通过：draft → review → staging 后登记三类评测，功能报告 passed=false
    const registry = getAgentAdmissionRegistry();
    submitThroughStaging(registry, makeAgent());
    registry.recordEvaluation('medical-record-writer', 'functional', evalReport({ passed: false, failedCount: 5 }));
    registry.recordEvaluation('medical-record-writer', 'quality', evalReport());
    registry.recordEvaluation('medical-record-writer', 'security', evalReport());
    expect(() => registry.activate('medical-record-writer')).toThrow(/功能评测未通过/);

    // 功能通过率 18/20=90%，低于 95% 门槛
    const lowRate = getAgentAdmissionRegistry();
    lowRate.register(makeAgent({ id: 'agent-low-rate' }));
    lowRate.submitForReview('agent-low-rate', { operator: '陈维', summary: '提交评审' });
    lowRate.approve('agent-low-rate', '医务部-王主任');
    lowRate.recordEvaluation('agent-low-rate', 'functional', evalReport({ caseCount: 20, passedCount: 18, failedCount: 2 }));
    lowRate.recordEvaluation('agent-low-rate', 'quality', evalReport());
    lowRate.recordEvaluation('agent-low-rate', 'security', evalReport());
    expect(() => lowRate.activate('agent-low-rate')).toThrow(/通过率/);

    // 质量未通过
    const badQuality = getAgentAdmissionRegistry();
    badQuality.register(makeAgent({ id: 'agent-bad-quality' }));
    badQuality.submitForReview('agent-bad-quality', { operator: '陈维', summary: '提交评审' });
    badQuality.approve('agent-bad-quality', '医务部-王主任');
    badQuality.recordEvaluation('agent-bad-quality', 'functional', evalReport());
    badQuality.recordEvaluation('agent-bad-quality', 'quality', evalReport({ passed: false }));
    badQuality.recordEvaluation('agent-bad-quality', 'security', evalReport());
    expect(() => badQuality.activate('agent-bad-quality')).toThrow(/质量评测未通过/);

    // 安全对抗未通过
    const badSecurity = getAgentAdmissionRegistry();
    badSecurity.register(makeAgent({ id: 'agent-bad-security' }));
    badSecurity.submitForReview('agent-bad-security', { operator: '陈维', summary: '提交评审' });
    badSecurity.approve('agent-bad-security', '医务部-王主任');
    badSecurity.recordEvaluation('agent-bad-security', 'functional', evalReport());
    badSecurity.recordEvaluation('agent-bad-security', 'quality', evalReport());
    badSecurity.recordEvaluation('agent-bad-security', 'security', evalReport({ passed: false }));
    expect(() => badSecurity.activate('agent-bad-security')).toThrow(/安全对抗评测未通过/);
  });

  it('风险等级与复核角色不匹配阻断：high 缺专家角色、medium 缺医师角色', () => {
    const highNoRole = getAgentAdmissionRegistry();
    highNoRole.register(makeAgent({ id: 'agent-high', riskLevel: 'high', reviewRole: undefined }));
    highNoRole.submitForReview('agent-high', { operator: '陈维', summary: '提交评审' });
    highNoRole.approve('agent-high', '医务部-王主任');
    highNoRole.recordEvaluation('agent-high', 'functional', evalReport());
    highNoRole.recordEvaluation('agent-high', 'quality', evalReport());
    highNoRole.recordEvaluation('agent-high', 'security', evalReport());
    expect(() => highNoRole.activate('agent-high')).toThrow(/专家复核角色/);

    const mediumNoRole = getAgentAdmissionRegistry();
    mediumNoRole.register(makeAgent({ id: 'agent-medium', riskLevel: 'medium', reviewRole: undefined }));
    mediumNoRole.submitForReview('agent-medium', { operator: '陈维', summary: '提交评审' });
    mediumNoRole.approve('agent-medium', '医务部-王主任');
    mediumNoRole.recordEvaluation('agent-medium', 'functional', evalReport());
    mediumNoRole.recordEvaluation('agent-medium', 'quality', evalReport());
    mediumNoRole.recordEvaluation('agent-medium', 'security', evalReport());
    expect(() => mediumNoRole.activate('agent-medium')).toThrow(/医师确认角色/);
  });

  it('三类评测齐全且通过、风险角色匹配后置 active 并追加发布变更记录', () => {
    const registry = getAgentAdmissionRegistry();
    submitThroughStaging(registry, withPassingEvaluations(makeAgent()));
    registry.recordEvaluation('medical-record-writer', 'functional', evalReport());
    registry.recordEvaluation('medical-record-writer', 'quality', evalReport());
    registry.recordEvaluation('medical-record-writer', 'security', evalReport());
    registry.activate('medical-record-writer');
    const record = registry.getAgent('medical-record-writer');
    expect(record?.status).toBe('active');
    expect(record?.changeLog.some((entry) => entry.summary.includes('准入门禁通过'))).toBe(true);
  });

  it('low 风险智能体无需复核角色即可通过门禁', () => {
    const registry = getAgentAdmissionRegistry();
    registry.register(makeAgent({ id: 'agent-low', riskLevel: 'low', reviewRole: undefined }));
    registry.submitForReview('agent-low', { operator: '陈维', summary: '提交评审' });
    registry.approve('agent-low', '医务部-王主任');
    registry.recordEvaluation('agent-low', 'functional', evalReport());
    registry.recordEvaluation('agent-low', 'quality', evalReport());
    registry.recordEvaluation('agent-low', 'security', evalReport());
    expect(() => registry.activate('agent-low')).not.toThrow();
    expect(registry.getAgent('agent-low')?.status).toBe('active');
  });
});

// ============================================================================
// 状态机
// ============================================================================

describe('AgentAdmissionRegistry - 状态机', () => {
  it('合法迁移逐条通过：draft → review → staging → active；active ↔ shadow；active → paused → retired', () => {
    expect(isValidAgentStatusTransition('draft', 'review')).toBe(true);
    expect(isValidAgentStatusTransition('review', 'staging')).toBe(true);
    expect(isValidAgentStatusTransition('staging', 'active')).toBe(true);
    expect(isValidAgentStatusTransition('active', 'shadow')).toBe(true);
    expect(isValidAgentStatusTransition('shadow', 'active')).toBe(true);
    expect(isValidAgentStatusTransition('active', 'paused')).toBe(true);
    expect(isValidAgentStatusTransition('paused', 'retired')).toBe(true);
  });

  it('非法迁移抛中文错误并指明合法出边；retired 为终态不可再迁', () => {
    expect(isValidAgentStatusTransition('draft', 'active')).toBe(false);
    expect(isValidAgentStatusTransition('active', 'retired')).toBe(false);
    expect(isValidAgentStatusTransition('retired', 'active')).toBe(false);

    const registry = getAgentAdmissionRegistry();
    registry.register(makeAgent());
    expect(() => registry.activate('medical-record-writer')).toThrow(/ADM-004/);
    expect(() => registry.retire('medical-record-writer', { reason: '下线', archiveRef: 'arch-001' })).toThrow(/ADM-004/);
  });

  it('pause 写入 paused 状态；retire 写入退役留痕与退役变更记录', () => {
    const registry = getAgentAdmissionRegistry();
    registry.register(withPassingEvaluations(makeAgent()));
    registry.submitForReview('medical-record-writer', { operator: '陈维', summary: '提交评审' });
    registry.approve('medical-record-writer', '医务部-王主任');
    registry.recordEvaluation('medical-record-writer', 'functional', evalReport());
    registry.recordEvaluation('medical-record-writer', 'quality', evalReport());
    registry.recordEvaluation('medical-record-writer', 'security', evalReport());
    registry.activate('medical-record-writer');
    registry.pause('medical-record-writer', '版本灰度观察期暂停接入新任务');
    expect(registry.getAgent('medical-record-writer')?.status).toBe('paused');

    registry.retire('medical-record-writer', {
      reason: '被替代智能体取代',
      successorAgentId: 'medical-record-writer-v2',
      archiveRef: 'archive-20261026-01',
    });
    const record = registry.getAgent('medical-record-writer');
    expect(record?.status).toBe('retired');
    expect(record?.retiredInfo?.reason).toBe('被替代智能体取代');
    expect(record?.retiredInfo?.successorAgentId).toBe('medical-record-writer-v2');
    expect(record?.retiredInfo?.archiveRef).toBe('archive-20261026-01');
    expect(record?.retiredInfo?.retiredAt).toBeTruthy();
    expect(record?.changeLog.some((entry) => entry.summary.includes('退役归档'))).toBe(true);
  });

  it('isCallable 仅 active / shadow 为 true；其余状态与未登记均为 false', () => {
    const registry = getAgentAdmissionRegistry();
    registry.register(makeAgent());
    expect(registry.isCallable('medical-record-writer')).toBe(false);
    expect(registry.isCallable('missing-agent')).toBe(false);

    registry.submitForReview('medical-record-writer', { operator: '陈维', summary: '提交评审' });
    expect(registry.isCallable('medical-record-writer')).toBe(false);
    registry.approve('medical-record-writer', '医务部-王主任');
    expect(registry.isCallable('medical-record-writer')).toBe(false);

    registry.recordEvaluation('medical-record-writer', 'functional', evalReport());
    registry.recordEvaluation('medical-record-writer', 'quality', evalReport());
    registry.recordEvaluation('medical-record-writer', 'security', evalReport());
    registry.activate('medical-record-writer');
    expect(registry.isCallable('medical-record-writer')).toBe(true);

    registry.pause('medical-record-writer');
    expect(registry.isCallable('medical-record-writer')).toBe(false);
  });
});

// ============================================================================
// 评测台账
// ============================================================================

describe('AgentAdmissionRegistry - 评测台账', () => {
  it('三类评测可分别登记，getEvaluation 回读并保留评测集版本', () => {
    const registry = getAgentAdmissionRegistry();
    registry.register(makeAgent());
    registry.recordEvaluation('medical-record-writer', 'functional', evalReport({ evaluationSetVersion: 'set-fn-v3' }));
    registry.recordEvaluation('medical-record-writer', 'quality', evalReport({ evaluationSetVersion: 'set-q-v2' }));
    registry.recordEvaluation('medical-record-writer', 'security', evalReport({ evaluationSetVersion: 'set-sec-v1' }));
    const evaluation = registry.getEvaluation('medical-record-writer');
    expect(evaluation.functional?.evaluationSetVersion).toBe('set-fn-v3');
    expect(evaluation.quality?.evaluationSetVersion).toBe('set-q-v2');
    expect(evaluation.security?.evaluationSetVersion).toBe('set-sec-v1');
  });

  it('未登记 id 抛中文错误；评测报告结构非法抛 ADM-006', () => {
    const registry = getAgentAdmissionRegistry();
    expect(() => registry.recordEvaluation('missing', 'functional', evalReport())).toThrow(/ADM-003/);
    expect(() => registry.getEvaluation('missing')).toThrow(/ADM-003/);

    registry.register(makeAgent());
    expect(() =>
      registry.recordEvaluation('medical-record-writer', 'functional', { ...evalReport(), passed: 'yes' as never }),
    ).toThrow(/ADM-006/);
  });

  it('getEvaluation 返回深拷贝，修改不影响台账', () => {
    const registry = getAgentAdmissionRegistry();
    registry.register(makeAgent());
    registry.recordEvaluation('medical-record-writer', 'functional', evalReport());
    const evaluation = registry.getEvaluation('medical-record-writer');
    evaluation.functional!.passed = false;
    expect(registry.getEvaluation('medical-record-writer').functional?.passed).toBe(true);
  });
});

// ============================================================================
// 两套注册表映射视图
// ============================================================================

describe('两套注册表 - 映射视图', () => {
  it('BFF 岗位条目投影 source=bff-role、名称与工具清单，缺失必填进入 missingRequired', () => {
    const view = mapBffEntry({
      roleCode: 'attending',
      name: '主治医师智能体',
      defaultSystemPrompt: '你是主治医师岗位智能体。',
      allowedTools: ['listMyPatients', 'getVisitDetail'],
      painPoint: '查房翻阅病历耗时。',
      dailyProductivityGain: '晨间查房省 20 分钟。',
    });
    expect(view.source).toBe('bff-role');
    expect(view.sourceId).toBe('attending');
    expect(view.name).toBe('主治医师智能体');
    expect(view.fieldCoverage.tools).toBe(true);
    expect(view.fieldCoverage.department).toBe(false);
    expect(view.missingRequired).toContain('department');
    expect(view.missingRequired).toContain('owner');
    expect(view.missingRequired).toContain('dataScope');
    expect(view.missingRequired).toContain('outputType');
    expect(view.record).toBeUndefined();
  });

  it('声明式智能体包投影 source=declarative-package、分类与风险等级，author 覆盖 owner', () => {
    const view = mapDeclarativeDefinition({
      id: 'medical-record-writer',
      name: '病历书写智能体',
      version: '1.0.0',
      category: '病历生成',
      tags: ['note'],
      description: '病历草稿生成',
      riskLevel: 'medium',
      author: '陈维',
      tools: ['query_patient'],
      knowledgeBases: ['cardiology-guidelines'],
      model: { alias: 'main-large' },
      systemPrompt: '系统提示词',
      entryWorkflow: 'wf-record-001',
    });
    expect(view.source).toBe('declarative-package');
    expect(view.sourceId).toBe('medical-record-writer');
    expect(view.category).toBe('病历生成');
    expect(view.riskLevel).toBe('medium');
    expect(view.fieldCoverage.owner).toBe(true);
    expect(view.fieldCoverage.tools).toBe(true);
    expect(view.fieldCoverage.knowledgeBases).toBe(true);
    expect(view.fieldCoverage.modelBinding).toBe(true);
    expect(view.missingRequired).toContain('dataScope');
    expect(view.missingRequired).toContain('interfaces');
  });

  it('buildMappingView 合并两套注册表条目，不反向写入源对象', () => {
    const bffEntry = { roleCode: 'nurse', name: '责任护士智能体', allowedTools: ['listMyPatients'] };
    const declarative = { id: 'qc-agent', name: '质控智能体', riskLevel: 'high', tools: ['review_record'] };
    const view = buildMappingView([bffEntry], [declarative]);
    expect(view).toHaveLength(2);
    expect(view[0].source).toBe('bff-role');
    expect(view[1].source).toBe('declarative-package');
    expect(bffEntry.roleCode).toBe('nurse');
    expect(declarative.id).toBe('qc-agent');
  });
});

// ============================================================================
// 运行指标聚合
// ============================================================================

describe('AgentAdmissionRegistry - 运行指标', () => {
  it('采纳 / 修改 / 拒绝 / 修改字符 / 异常分类聚合口径正确', () => {
    const registry = getAgentAdmissionRegistry();
    registry.recordRuntimeMetrics({ agentId: 'ag-01', version: '1.0.0', scenario: 'outpatient-record', adopted: true });
    registry.recordRuntimeMetrics({ agentId: 'ag-01', version: '1.0.0', scenario: 'outpatient-record', modified: true, modifiedChars: 120 });
    registry.recordRuntimeMetrics({ agentId: 'ag-01', version: '1.0.0', scenario: 'outpatient-record', modified: true, modifiedChars: 680 });
    registry.recordRuntimeMetrics({ agentId: 'ag-01', version: '1.0.0', scenario: 'outpatient-record', rejected: true, abnormalKind: 'schema-failure' });

    const [metrics] = registry.queryRuntimeMetrics();
    expect(metrics.calls).toBe(4);
    expect(metrics.adoptionRate).toBeCloseTo(0.25, 6);
    expect(metrics.modificationRate).toBeCloseTo(0.5, 6);
    expect(metrics.rejectionRate).toBeCloseTo(0.25, 6);
    expect(metrics.avgModifiedChars).toBe(400);
    expect(metrics.abnormalCounts['schema-failure']).toBe(1);
    expect(metrics.abnormalCounts['timeout']).toBe(0);
    expect(metrics.window).toBe('all');
  });

  it('按 agentId / version / scenario / department / window 过滤；空台账返回空数组', () => {
    const registry = getAgentAdmissionRegistry();
    expect(registry.queryRuntimeMetrics()).toEqual([]);

    registry.recordRuntimeMetrics({ agentId: 'ag-01', version: '1.0.0', scenario: 'outpatient-record', department: 'cardiology', adopted: true });
    registry.recordRuntimeMetrics({ agentId: 'ag-02', version: '1.2.0', scenario: 'consultation', department: 'neurology', rejected: true });

    expect(registry.queryRuntimeMetrics({ agentId: 'ag-01' })).toHaveLength(1);
    expect(registry.queryRuntimeMetrics({ version: '1.2.0' })).toHaveLength(1);
    expect(registry.queryRuntimeMetrics({ scenario: 'consultation' })).toHaveLength(1);
    expect(registry.queryRuntimeMetrics({ department: 'neurology' })).toHaveLength(1);
    const daily = registry.queryRuntimeMetrics({ agentId: 'ag-01', window: 'daily' });
    expect(daily[0].window).toBe('daily');
  });

  it('五类异常分类分别累计；分母为 0 时比率记 0', () => {
    const registry = getAgentAdmissionRegistry();
    for (const kind of ['timeout', 'circuit-open', 'schema-failure', 'manual-handover', 'tool-error'] as const) {
      registry.recordRuntimeMetrics({ agentId: 'ag-01', version: '1.0.0', scenario: 'outpatient-record', abnormalKind: kind });
    }
    const [metrics] = registry.queryRuntimeMetrics();
    expect(metrics.calls).toBe(5);
    expect(metrics.adoptionRate).toBe(0);
    expect(metrics.modificationRate).toBe(0);
    expect(metrics.rejectionRate).toBe(0);
    expect(metrics.avgModifiedChars).toBe(0);
    for (const kind of ['timeout', 'circuit-open', 'schema-failure', 'manual-handover', 'tool-error'] as const) {
      expect(metrics.abnormalCounts[kind]).toBe(1);
    }
  });

  it('缺少 agentId / version / scenario 抛中文错误；modifiedChars 负数抛错', () => {
    const registry = getAgentAdmissionRegistry();
    expect(() => registry.recordRuntimeMetrics({ agentId: '', version: '1.0.0', scenario: 'outpatient-record' })).toThrow(/ADM-007/);
    expect(() => registry.recordRuntimeMetrics({ agentId: 'ag-01', version: '', scenario: 'outpatient-record' })).toThrow(/ADM-007/);
    expect(() => registry.recordRuntimeMetrics({ agentId: 'ag-01', version: '1.0.0', scenario: '' })).toThrow(/ADM-007/);
    expect(() =>
      registry.recordRuntimeMetrics({ agentId: 'ag-01', version: '1.0.0', scenario: 'outpatient-record', modified: true, modifiedChars: -5 }),
    ).toThrow(/ADM-007/);
  });
});

// ============================================================================
// 深拷贝隔离（台账级）
// ============================================================================

describe('AgentAdmissionRegistry - 深拷贝隔离', () => {
  it('listAgents 返回数组与对象修改不影响台账；getChangeLog 返回深拷贝', () => {
    const registry = getAgentAdmissionRegistry();
    registry.register(makeAgent());
    registry.submitForReview('medical-record-writer', { operator: '陈维', summary: '提交评审' });

    const list = registry.listAgents();
    list[0].status = 'retired';
    list.pop();
    expect(registry.listAgents()).toHaveLength(1);
    expect(registry.getAgent('medical-record-writer')?.status).toBe('review');

    const log = registry.getChangeLog('medical-record-writer');
    log[0].summary = '被外部篡改';
    expect(registry.getChangeLog('medical-record-writer')[0].summary).toBe('提交评审');
  });
});

// ============================================================================
// A16 人工干预点指标与内存聚合（对齐 S-05 monitoringEvents 事件字段）
// ============================================================================

describe('AgentAdmissionRegistry - A16 人工干预点指标', () => {
  const T0 = 1_761_000_000_000;

  function seedInterventions(registry: ReturnType<typeof getAgentAdmissionRegistry>): void {
    registry.recordInterventionMetric({
      humanAction: 'adopted',
      nodeId: 'review',
      agentId: 'medical-record-writer',
      agentVersion: '1.0.0',
      reviewerId: 'doctor-demo-001',
      at: T0,
      scenario: 'outpatient-record',
    });
    registry.recordInterventionMetric({
      humanAction: 'modified',
      nodeId: 'review',
      agentId: 'medical-record-writer',
      agentVersion: '1.0.0',
      reviewerId: 'doctor-demo-001',
      comment: '人工修改草稿',
      at: T0 + 1_000,
      scenario: 'outpatient-record',
    });
    registry.recordInterventionMetric({
      humanAction: 'rejected',
      agentId: 'medical-record-writer',
      agentVersion: '1.0.0',
      at: T0 + 2_000,
      scenario: 'outpatient-record',
    });
    registry.recordInterventionMetric({
      humanAction: 'escalated',
      nodeId: 'qc-review',
      agentId: 'qc-guardian',
      agentVersion: '0.9.0',
      at: T0 + 3_000,
      scenario: 'admission-note',
    });
  }

  it('三类动作计数独立可查，节点 / 智能体分组聚合正确', () => {
    const registry = getAgentAdmissionRegistry();
    seedInterventions(registry);

    const aggregate = registry.aggregateInterventionMetrics();
    expect(aggregate.total).toBe(4);
    expect(aggregate.byAction).toEqual({ adopted: 1, modified: 1, rejected: 1, escalated: 1, pending: 0 });
    expect(aggregate.byNode['review']).toBe(2);
    expect(aggregate.byNode['unknown']).toBe(1);
    expect(aggregate.byNode['qc-review']).toBe(1);
    expect(aggregate.byAgent['medical-record-writer']).toBe(3);
    expect(aggregate.byAgent['qc-guardian']).toBe(1);
  });

  it('节点位置缺失显式记 unknown；按 unknown 节点筛选可回读', () => {
    const registry = getAgentAdmissionRegistry();
    seedInterventions(registry);
    const unknown = registry.queryInterventionMetrics({ nodeId: 'unknown' });
    expect(unknown).toHaveLength(1);
    expect(unknown[0].nodeId).toBe('unknown');

    expect(normalizeInterventionNodeId(undefined)).toBe('unknown');
    expect(normalizeInterventionNodeId('')).toBe('unknown');
    expect(normalizeInterventionNodeId('   ')).toBe('unknown');
    expect(normalizeInterventionNodeId('review')).toBe('review');
  });

  it('按动作 / 智能体 / 版本 / 场景 / 时间窗组合过滤', () => {
    const registry = getAgentAdmissionRegistry();
    seedInterventions(registry);

    expect(registry.queryInterventionMetrics({ action: 'modified' })).toHaveLength(1);
    expect(registry.queryInterventionMetrics({ agentId: 'qc-guardian' })).toHaveLength(1);
    expect(registry.queryInterventionMetrics({ agentVersion: '1.0.0' })).toHaveLength(3);
    expect(registry.queryInterventionMetrics({ scenario: 'admission-note' })).toHaveLength(1);
    expect(registry.queryInterventionMetrics({ from: T0 + 1_500, to: T0 + 3_000 })).toHaveLength(2);

    const modified = registry.aggregateInterventionMetrics({ action: 'modified' });
    expect(modified.byAction.modified).toBe(1);
    expect(modified.total).toBe(1);
  });

  it('非法动作 / 缺失智能体标识 / 非有限时间戳拒绝并抛 ADM-008', () => {
    const registry = getAgentAdmissionRegistry();
    expect(() =>
      registry.recordInterventionMetric({ humanAction: 'approved' as never, agentId: 'a', agentVersion: '1', at: T0 }),
    ).toThrow(/ADM-008/);
    expect(() =>
      registry.recordInterventionMetric({ humanAction: 'adopted', agentId: '', agentVersion: '1', at: T0 }),
    ).toThrow(/ADM-008/);
    expect(() =>
      registry.recordInterventionMetric({ humanAction: 'adopted', agentId: 'a', agentVersion: '', at: T0 }),
    ).toThrow(/ADM-008/);
    expect(() =>
      registry.recordInterventionMetric({ humanAction: 'adopted', agentId: 'a', agentVersion: '1', at: NaN }),
    ).toThrow(/ADM-008/);
  });

  it('记录字段与 S-05 monitoringEvents 负载口径一一映射', () => {
    const registry = getAgentAdmissionRegistry();
    registry.recordInterventionMetric({
      humanAction: 'modified',
      nodeId: 'review',
      agentId: 'medical-record-writer',
      agentVersion: '1.0.0',
      reviewerId: 'doctor-demo-001',
      comment: '人工修改草稿',
      at: T0 + 1_000,
      scenario: 'outpatient-record',
    });
    const record = registry.queryInterventionMetrics()[0];
    expect(record.humanAction).toBe('modified');
    expect(record.nodeId).toBe('review');
    expect(record.agentId).toBe('medical-record-writer');
    expect(record.agentVersion).toBe('1.0.0');
    expect(record.reviewerId).toBe('doctor-demo-001');
    expect(record.comment).toBe('人工修改草稿');
    expect(record.at).toBe(T0 + 1_000);
  });

  it('查询结果为深拷贝，外部修改不影响台账', () => {
    const registry = getAgentAdmissionRegistry();
    registry.recordInterventionMetric({
      humanAction: 'adopted',
      nodeId: 'review',
      agentId: 'a',
      agentVersion: '1',
      at: T0,
    });
    const list = registry.queryInterventionMetrics();
    list[0].humanAction = 'rejected';
    list.push({
      humanAction: 'pending',
      nodeId: 'x',
      agentId: 'b',
      agentVersion: '1',
      at: T0,
    });
    expect(registry.queryInterventionMetrics()).toHaveLength(1);
    expect(registry.queryInterventionMetrics()[0].humanAction).toBe('adopted');
  });

  it('纯函数 appendInterventionMetric 不改入参台账；空记录聚合计数为零', () => {
    const existing: HumanInterventionMetric[] = [];
    const next = appendInterventionMetric(existing, {
      humanAction: 'pending',
      nodeId: 'review',
      agentId: 'a',
      agentVersion: '1',
      at: T0,
    });
    expect(existing).toEqual([]);
    expect(next).toHaveLength(1);
    expect(aggregateInterventions([]).byAction).toEqual(emptyInterventionCounts());
  });
});
