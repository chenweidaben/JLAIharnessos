/**
 * 健澜AI原生医院操作系统OS - AI 专项审计与四维留痕单元测试（S-08）
 *
 * 覆盖：入参校验、脱敏入链、哈希链首尾相接与篡改检测、多维检索、trace 双向追溯、
 * 病历引用绑定、AuditLogger 桥接映射、工具调用 / 用量 / 引用 / 证据留痕、深拷贝隔离。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import { AuditLogger, MemoryLogStorage, AuditEventType } from '@/security/audit/index.js';
import {
  AiAuditService,
  AUDIT_GENESIS_HASH,
  validateAiAuditInput,
  getAiAuditService,
  _resetAiAuditService,
  type AiAuditEventInput,
} from '@/security/audit/aiAudit.js';

/** 构造合法测试事件入参 */
function makeInput(overrides: Partial<AiAuditEventInput> = {}): AiAuditEventInput {
  return {
    traceId: 'trace-20261026-001',
    actor: { userId: 'doc-001', roleCodes: ['attending'], department: 'cardiology' },
    agentId: 'medical-record-writer',
    agentVersion: '1.2.0',
    scenario: 'outpatient-record',
    patientId: 'P-10001',
    visitId: 'V-20001',
    department: 'cardiology',
    versions: {
      modelId: 'main-large-001',
      modelVersion: 'deepseek-v3-20260901',
      knowledgeVersion: ['kb-cardiology-2026-09', 'kb-nursing-2026-08'],
      promptVersion: 'p-scenario-record-3',
      platformRelease: 'jlai-os-2026.10.1',
    },
    inputSummary: '患者主诉胸闷三天，既往高血压史。',
    outputSummary: '建议完善心电图与心肌酶谱检查。',
    citations: ['chunk-001', 'chunk-014'],
    elapsedMs: 1280,
    tokenUsage: { input: 320, output: 96 },
    guardLevel: 'PASS',
    humanAction: 'adopted',
    toolCalls: [],
    ...overrides,
  };
}

beforeEach(() => {
  _resetAiAuditService();
});

// ============================================================================
// 入参校验
// ============================================================================

describe('AiAuditService - 入参校验', () => {
  it('必填字段缺失分别拒绝，错误信息含缺失项与错误码', () => {
    expect(validateAiAuditInput(makeInput({ traceId: '' })).some((e) => e.includes('traceId'))).toBe(true);
    expect(validateAiAuditInput(makeInput({ agentId: '' })).some((e) => e.includes('agentId'))).toBe(true);
    expect(validateAiAuditInput(makeInput({ agentVersion: '' })).some((e) => e.includes('agentVersion'))).toBe(true);
    expect(validateAiAuditInput(makeInput({ scenario: '' })).some((e) => e.includes('scenario'))).toBe(true);
    expect(
      validateAiAuditInput(makeInput({ actor: { userId: '', roleCodes: [], department: 'cardiology' } })).some((e) =>
        e.includes('actor.userId'),
      ),
    ).toBe(true);
    expect(
      validateAiAuditInput(makeInput({ actor: { userId: 'doc-001', roleCodes: [], department: '' } })).some((e) =>
        e.includes('actor.department'),
      ),
    ).toBe(true);
    expect(
      validateAiAuditInput(
        makeInput({ versions: { ...makeInput().versions, modelId: '' } }),
      ).some((e) => e.includes('modelId')),
    ).toBe(true);
    expect(
      validateAiAuditInput(
        makeInput({ versions: { ...makeInput().versions, modelVersion: '' } }),
      ).some((e) => e.includes('modelVersion')),
    ).toBe(true);
    expect(
      validateAiAuditInput(
        makeInput({ versions: { ...makeInput().versions, promptVersion: '' } }),
      ).some((e) => e.includes('promptVersion')),
    ).toBe(true);
    expect(
      validateAiAuditInput(
        makeInput({ versions: { ...makeInput().versions, platformRelease: '' } }),
      ).some((e) => e.includes('platformRelease')),
    ).toBe(true);
  });

  it('枚举非法、数值为负、知识版本结构非法均被拒绝', () => {
    expect(validateAiAuditInput(makeInput({ guardLevel: 'UNKNOWN' as never })).some((e) => e.includes('guardLevel'))).toBe(true);
    expect(validateAiAuditInput(makeInput({ humanAction: 'pending-x' as never })).some((e) => e.includes('humanAction'))).toBe(true);
    expect(validateAiAuditInput(makeInput({ elapsedMs: -10 })).some((e) => e.includes('elapsedMs'))).toBe(true);
    expect(validateAiAuditInput(makeInput({ tokenUsage: { input: -1, output: 0 } })).some((e) => e.includes('tokenUsage.input'))).toBe(true);
    expect(
      validateAiAuditInput(
        makeInput({ versions: { ...makeInput().versions, knowledgeVersion: 'kb-x' as never } }),
      ).some((e) => e.includes('knowledgeVersion')),
    ).toBe(true);
  });

  it('工具调用记录风险等级 / 结果 / 时长非法被拒绝', () => {
    const badTool = { toolId: 'query_patient', operation: 'GET', riskLevel: 'write' as never, result: 'success' as const };
    expect(validateAiAuditInput(makeInput({ toolCalls: [badTool] })).some((e) => e.includes('riskLevel'))).toBe(true);
    const badResult = { toolId: 'query_patient', operation: 'GET', result: 'unknown' as never };
    expect(validateAiAuditInput(makeInput({ toolCalls: [badResult] })).some((e) => e.includes('result'))).toBe(true);
    const badDuration = { toolId: 'query_patient', operation: 'GET', durationMs: -5 };
    expect(validateAiAuditInput(makeInput({ toolCalls: [badDuration] })).some((e) => e.includes('durationMs'))).toBe(true);
  });

  it('服务端登记时校验失败抛中文错误，不写入台账', () => {
    const service = new AiAuditService();
    expect(() => service.record(makeInput({ traceId: '' }))).toThrow(/AUD-001/);
    expect(service.listEvents()).toHaveLength(0);
  });
});

// ============================================================================
// 哈希链
// ============================================================================

describe('AiAuditService - 哈希链', () => {
  it('连续三条事件 prevHash 首尾相接，verifyChain 全绿', () => {
    const service = new AiAuditService();
    const first = service.record(makeInput({ traceId: 't-1' }));
    const second = service.record(makeInput({ traceId: 't-2' }));
    const third = service.record(makeInput({ traceId: 't-3' }));

    expect(first.auditChain.prevHash).toBe(AUDIT_GENESIS_HASH);
    expect(second.auditChain.prevHash).toBe(first.auditChain.hash);
    expect(third.auditChain.prevHash).toBe(second.auditChain.hash);
    expect(first.auditChain.hash).toHaveLength(64);

    const verification = service.verifyChain();
    expect(verification.valid).toBe(true);
    expect(verification.verifiedCount).toBe(3);
  });

  it('篡改任一事件字段后 verifyChain 返回 valid=false 与首个失效位置', () => {
    const service = new AiAuditService();
    service.record(makeInput({ traceId: 't-1' }));
    service.record(makeInput({ traceId: 't-2' }));
    service.record(makeInput({ traceId: 't-3' }));

    // 直接篡改内部台账第二条事件的输出摘要，模拟事后改动
    const internal = service as unknown as { events: Array<{ outputSummary: string }> };
    internal.events[1].outputSummary = '被篡改后的输出摘要';

    const verification = service.verifyChain();
    expect(verification.valid).toBe(false);
    expect(verification.firstInvalidIndex).toBe(1);
    expect(verification.reason).toContain('第 2 条');
  });

  it('reset 后链尾回到创世哈希，台账清空', () => {
    const service = new AiAuditService();
    service.record(makeInput({ traceId: 't-1' }));
    service.record(makeInput({ traceId: 't-2' }));
    service.reset();

    expect(service.listEvents()).toHaveLength(0);
    expect(service.verifyChain().valid).toBe(true);
    expect(service.verifyChain().verifiedCount).toBe(0);

    const fresh = service.record(makeInput({ traceId: 't-3' }));
    expect(fresh.auditChain.prevHash).toBe(AUDIT_GENESIS_HASH);
  });
});

// ============================================================================
// 摘要脱敏
// ============================================================================

describe('AiAuditService - 摘要脱敏', () => {
  it('姓名 / 手机号 / 证件号 / 地址在入库摘要中被掩码，patientMasked=true', () => {
    const service = new AiAuditService();
    const event = service.record(
      makeInput({
        inputSummary: '患者姓名：张三，联系电话：13800138000，证件号 110101199001011234，住址北京市海淀区中关村大街1号。',
        outputSummary: '建议门诊随访。',
      }),
    );

    expect(event.patientMasked).toBe(true);
    expect(event.inputSummary).not.toContain('张三');
    expect(event.inputSummary).not.toContain('13800138000');
    expect(event.inputSummary).not.toContain('110101199001011234');
    expect(event.inputSummary).not.toContain('中关村大街1号');
  });

  it('原始 patientId / visitId 独立字段存放，不复制进摘要文本', () => {
    const service = new AiAuditService();
    const event = service.record(
      makeInput({ inputSummary: '常规问诊，无特殊敏感信息。', patientId: 'P-90001', visitId: 'V-70001' }),
    );
    expect(event.patientId).toBe('P-90001');
    expect(event.visitId).toBe('V-70001');
    expect(event.inputSummary).not.toContain('P-90001');
    expect(event.outputSummary).not.toContain('V-70001');
  });

  it('无敏感信息摘要保持原文，patientMasked=false', () => {
    const service = new AiAuditService();
    const event = service.record(makeInput({ inputSummary: '常规问诊记录。', outputSummary: '已生成草稿。' }));
    expect(event.patientMasked).toBe(false);
    expect(event.inputSummary).toBe('常规问诊记录。');
  });
});

// ============================================================================
// 多维检索
// ============================================================================

describe('AiAuditService - 多维检索', () => {
  beforeEach(() => {
    const service = getAiAuditService();
    service.record(
      makeInput({
        traceId: 'trace-a',
        agentId: 'writer-a',
        agentVersion: '1.0.0',
        scenario: 'outpatient-record',
        department: 'cardiology',
        patientId: 'P-001',
        guardLevel: 'PASS',
        humanAction: 'adopted',
        versions: { ...makeInput().versions, modelId: 'model-a', modelVersion: 'v-a-1', promptVersion: 'prompt-a', knowledgeVersion: ['kb-a', 'kb-b'] },
      }),
    );
    service.record(
      makeInput({
        traceId: 'trace-b',
        agentId: 'writer-b',
        agentVersion: '2.0.0',
        scenario: 'discharge-summary',
        department: 'neurology',
        patientId: 'P-002',
        guardLevel: 'BLOCK',
        humanAction: 'escalated',
        versions: { ...makeInput().versions, modelId: 'model-b', modelVersion: 'v-b-1', promptVersion: 'prompt-b', knowledgeVersion: ['kb-c'] },
      }),
    );
  });

  it('按 agentId / agentVersion / modelId / modelVersion / promptVersion 过滤', () => {
    const service = getAiAuditService();
    expect(service.query({ agentId: 'writer-a' })).toHaveLength(1);
    expect(service.query({ agentVersion: '2.0.0' })).toHaveLength(1);
    expect(service.query({ modelId: 'model-b' })).toHaveLength(1);
    expect(service.query({ modelVersion: 'v-a-1' })).toHaveLength(1);
    expect(service.query({ promptVersion: 'prompt-b' })).toHaveLength(1);
  });

  it('knowledgeVersion 按包含匹配；patientId / department / scenario 精确过滤', () => {
    const service = getAiAuditService();
    expect(service.query({ knowledgeVersion: 'kb-b' })).toHaveLength(1);
    expect(service.query({ patientId: 'P-002' })).toHaveLength(1);
    expect(service.query({ department: 'neurology' })).toHaveLength(1);
    expect(service.query({ scenario: 'discharge-summary' })).toHaveLength(1);
  });

  it('guardLevel / humanAction 过滤；越权与阻断事件可单独检索', () => {
    const service = getAiAuditService();
    expect(service.query({ guardLevel: 'BLOCK' })).toHaveLength(1);
    expect(service.query({ humanAction: 'escalated' })).toHaveLength(1);
    expect(service.query({ guardLevel: 'PASS', humanAction: 'adopted' })).toHaveLength(1);
  });

  it('from/to 时间闭区间过滤；无匹配返回空数组', () => {
    const service = getAiAuditService();
    expect(service.query({ from: '2000-01-01T00:00:00.000Z', to: '2099-01-01T00:00:00.000Z' })).toHaveLength(2);
    expect(service.query({ from: '2000-01-01T00:00:00.000Z', to: '2000-01-02T00:00:00.000Z' })).toHaveLength(0);
    expect(service.query({ agentId: 'missing-agent' })).toEqual([]);
  });
});

// ============================================================================
// trace 双向追溯与病历引用绑定
// ============================================================================

describe('AiAuditService - trace 导出与病历引用', () => {
  it('同一 traceId 多事件返回一致四维快照与 recordRefs；未知 traceId 抛 AUD-007', () => {
    const service = new AiAuditService();
    service.record(makeInput({ traceId: 'trace-x', recordRef: 'emr-note-001' }));
    service.record(makeInput({ traceId: 'trace-x', recordRef: 'emr-note-002' }));

    const exported = service.exportTrace('trace-x');
    expect(exported.events).toHaveLength(2);
    expect(exported.versionSnapshot.modelId).toBe('main-large-001');
    expect(exported.versionSnapshot.knowledgeVersion).toEqual(['kb-cardiology-2026-09', 'kb-nursing-2026-08']);
    expect(exported.recordRefs).toEqual(['emr-note-001', 'emr-note-002']);

    expect(() => service.exportTrace('trace-missing')).toThrow(/AUD-007/);
  });

  it('linkMedicalRecord 追加引用、重复去重、getRecordRefs 回读；未知 traceId 拒绝绑定', () => {
    const service = new AiAuditService();
    service.record(makeInput({ traceId: 'trace-y' }));
    service.linkMedicalRecord('trace-y', 'emr-copy-001');
    service.linkMedicalRecord('trace-y', 'emr-copy-001');
    service.linkMedicalRecord('trace-y', 'emr-copy-002');

    expect(service.getRecordRefs('trace-y')).toEqual(['emr-copy-001', 'emr-copy-002']);
    expect(service.getRecordRefs('trace-missing')).toEqual([]);
    expect(() => service.linkMedicalRecord('trace-missing', 'emr-x')).toThrow(/AUD-007/);
  });
});

// ============================================================================
// AuditLogger 桥接
// ============================================================================

describe('AiAuditService - AuditLogger 桥接', () => {
  it('普通生成决策桥接 AGENT_DECISION；BLOCK 桥接 SEC_UNAUTHORIZED_ACCESS', () => {
    const storage = new MemoryLogStorage();
    const logger = new AuditLogger({ storage, asyncWrite: false, enableIntegrity: false });
    const service = new AiAuditService({ logger });

    service.record(makeInput({ traceId: 'trace-d1', guardLevel: 'PASS' }));
    service.record(makeInput({ traceId: 'trace-d2', guardLevel: 'BLOCK' }));

    const entries = storage.getAll();
    expect(entries).toHaveLength(2);
    expect(entries[0].operationType).toBe(AuditEventType.AGENT_DECISION);
    expect(entries[1].operationType).toBe(AuditEventType.UNAUTHORIZED_ACCESS);
  });

  it('含工具调用桥接 AGENT_TOOL_CALL；泄露证据桥接 SEC_DATA_LEAK_DETECTED', () => {
    const storage = new MemoryLogStorage();
    const logger = new AuditLogger({ storage, asyncWrite: false, enableIntegrity: false });
    const service = new AiAuditService({ logger });

    service.record(
      makeInput({
        traceId: 'trace-t1',
        toolCalls: [{ toolId: 'query_patient', operation: 'GET', result: 'success' }],
      }),
    );
    service.record(
      makeInput({
        traceId: 'trace-t2',
        guardLevel: 'PASS',
        evidence: '检测到患者数据泄露风险',
      }),
    );

    const entries = storage.getAll();
    expect(entries[0].operationType).toBe(AuditEventType.AGENT_TOOL_CALL);
    expect(entries[1].operationType).toBe(AuditEventType.DATA_LEAK_DETECTED);
    expect(entries[0].toolName).toBe('query_patient');
    expect(entries[0].traceId).toBe('trace-t1');
  });

  it('未注入 logger 时内存台账照常落事件，不抛错', () => {
    const service = new AiAuditService();
    const event = service.record(makeInput({ traceId: 'trace-nolog' }));
    expect(event.eventId).toBeTruthy();
    expect(service.listEvents()).toHaveLength(1);
  });
});

// ============================================================================
// 工具调用 / 用量 / 引用 / 证据留痕
// ============================================================================

describe('AiAuditService - 留痕字段回读', () => {
  it('toolCalls、tokenUsage、citations、evidence、writePath 随事件留存回读', () => {
    const service = new AiAuditService();
    const event = service.record(
      makeInput({
        traceId: 'trace-fields',
        toolCalls: [
          {
            toolId: 'query_patient',
            operation: 'GET',
            purpose: '读取就诊详情',
            riskLevel: 'read-only',
            result: 'success',
            durationMs: 42,
            toolInputHash: 'hash-in-001',
            toolOutputHash: 'hash-out-001',
          },
        ],
        citations: ['chunk-021'],
        evidence: '输出侧校验通过',
        writePath: 'admissionNoteAggregator',
      }),
    );

    expect(event.toolCalls[0].toolId).toBe('query_patient');
    expect(event.toolCalls[0].toolInputHash).toBe('hash-in-001');
    expect(event.toolCalls[0].toolOutputHash).toBe('hash-out-001');
    expect(event.tokenUsage).toEqual({ input: 320, output: 96 });
    expect(event.citations).toEqual(['chunk-021']);
    expect(event.evidence).toBe('输出侧校验通过');
    expect(event.writePath).toBe('admissionNoteAggregator');
  });

  it('返回对象为深拷贝，修改不影响台账内部状态', () => {
    const service = new AiAuditService();
    const event = service.record(makeInput({ traceId: 'trace-clone' }));
    event.outputSummary = '外部篡改';
    event.toolCalls.push({ toolId: 'fake', operation: 'GET' });

    const stored = service.listEvents()[0];
    expect(stored.outputSummary).not.toBe('外部篡改');
    expect(stored.toolCalls).toHaveLength(0);
  });
});
