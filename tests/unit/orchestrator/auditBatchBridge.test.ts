/**
 * 健澜AI原生医院操作系统OS - S-05 阶段① 编排事件批量入链适配器测试
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { describe, expect, it } from 'bun:test';
import { AiAuditService, type AiVersionSnapshot } from '@/security/audit/aiAudit.js';
import { AuditLogger } from '@/security/audit/AuditLogger.js';
import type { ILogStorage } from '@/security/audit/LogStorage.js';
import { buildAuditInput, OrchestratorAuditBridge, type OrchestratorAuditEvent } from '@/orchestrator/engine/auditBatchBridge.js';

const versions: AiVersionSnapshot = {
  modelId: 'demo-model',
  modelVersion: '1.0.0',
  knowledgeVersion: ['clinical-v1'],
  promptVersion: 'prompt-v1',
  platformRelease: 'demo-release',
};

function makeEvent(overrides: Partial<OrchestratorAuditEvent> = {}): OrchestratorAuditEvent {
  return {
    traceId: 'trace-demo-001',
    actor: { userId: 'doctor-demo-001', roleCodes: ['doctor'], department: '内科' },
    agentId: 'orchestrator-demo',
    agentVersion: '1.0.0',
    scenario: 'orchestrator-node',
    patientId: 'patient-demo-001',
    visitId: 'visit-demo-001',
    department: '内科',
    versions,
    inputSummary: '工作流开始执行',
    outputSummary: '节点完成离线合成结果',
    citations: ['ref-demo-001'],
    elapsedMs: 12,
    tokenUsage: { input: 5, output: 3 },
    guardLevel: 'PASS',
    humanAction: 'pending',
    toolCalls: [
      {
        toolId: 'stub-tool',
        operation: 'read-demo',
        purpose: '演示只读调用',
        riskLevel: 'read-only',
        result: 'success',
        durationMs: 4,
      },
    ],
    writePath: 'orchestrator/event',
    evidence: '离线合成事件',
    ...overrides,
  };
}

describe('批量入链顺序与哈希链接续', () => {
  it('两条事件顺序入链，verifyChain 有效，第二条 prevHash 链接第一条 hash', () => {
    const audit = new AiAuditService();
    const bridge = new OrchestratorAuditBridge(audit);
    const first = makeEvent({ traceId: 'trace-chain-001' });
    const second = makeEvent({ traceId: 'trace-chain-001', guardLevel: 'CAUTION', humanAction: 'adopted' });

    const recorded = bridge.recordBatch([first, second]);
    expect(recorded).toHaveLength(2);
    expect(recorded[1].auditChain.prevHash).toBe(recorded[0].auditChain.hash);
    expect(audit.verifyChain().valid).toBe(true);
    expect(bridge.recorded).toBe(2);
    expect(bridge.pending).toBe(0);
  });

  it('patientId / visitId / guardLevel / humanAction / toolCalls 透传并复用既有枚举值', () => {
    const audit = new AiAuditService();
    const bridge = new OrchestratorAuditBridge(audit);
    const recorded = bridge.recordBatch([
      makeEvent({
        guardLevel: 'BLOCK',
        humanAction: 'rejected',
        toolCalls: [
          {
            toolId: 'write-demo',
            operation: 'confirm-write',
            purpose: '演示写工具确认',
            riskLevel: 'confirm',
            result: 'blocked',
          },
        ],
      }),
    ]);
    const event = recorded[0];
    expect(event.patientId).toBe('patient-demo-001');
    expect(event.visitId).toBe('visit-demo-001');
    expect(event.guardLevel).toBe('BLOCK');
    expect(event.humanAction).toBe('rejected');
    expect(event.toolCalls[0]).toMatchObject({ riskLevel: 'confirm', result: 'blocked' });
  });

  it('AuditLogger 桥接被调用，节点失败状态由事件自身 guardLevel/result 保留，适配器不改写', () => {
    const loggerEntries: unknown[] = [];
    const storage: ILogStorage = {
      write: async (entry) => { loggerEntries.push(entry); },
      writeBatch: async () => {},
      read: async () => [],
      close: async () => {},
      flush: async () => {},
    };
    const logger = new AuditLogger({
      storage,
      asyncWrite: false,
      enableIntegrity: false,
    });
    const audit = new AiAuditService({ logger });
    const bridge = new OrchestratorAuditBridge(audit);
    const recorded = bridge.recordBatch([makeEvent({ guardLevel: 'BLOCK', humanAction: 'escalated' })]);
    expect(loggerEntries.length).toBeGreaterThan(0);
    expect(recorded[0].guardLevel).toBe('BLOCK');
    expect(recorded[0].humanAction).toBe('escalated');
    expect(recorded[0].toolCalls[0].result).toBe('success');
  });
});

describe('批量校验纪律', () => {
  it('必填字段缺失时整批抛错并指明批次序号，台账不部分入链', () => {
    const audit = new AiAuditService();
    const bridge = new OrchestratorAuditBridge(audit);
    const invalid = makeEvent({ traceId: '' });
    expect(() => bridge.recordBatch([makeEvent(), invalid])).toThrow('#2');
    expect(audit.query({})).toHaveLength(1);
    expect(bridge.recorded).toBe(1);
  });
});

describe('buildAuditInput 纯映射', () => {
  it('补齐离线版本桩位、默认风险/人工动作与零值，显式字段原样透传', () => {
    const mapped = buildAuditInput({
      traceId: 'trace-map-001',
      actor: { userId: 'doctor-demo-001', roleCodes: ['doctor'], department: '内科' },
      agentId: 'map-agent',
      agentVersion: '2.0.0',
      scenario: 'map-node',
      inputSummary: '输入摘要',
      outputSummary: '输出摘要',
    });
    expect(mapped.versions.modelId).toBe('offline-unknown');
    expect(mapped.guardLevel).toBe('PASS');
    expect(mapped.humanAction).toBe('pending');
    expect(mapped.citations).toEqual([]);
    expect(mapped.elapsedMs).toBe(0);
    expect(mapped.tokenUsage).toEqual({ input: 0, output: 0 });
    expect(mapped.toolCalls).toEqual([]);
    expect(mapped.traceId).toBe('trace-map-001');
  });
});
