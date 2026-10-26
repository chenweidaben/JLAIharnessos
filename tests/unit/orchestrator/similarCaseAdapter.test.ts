/**
 * 健澜AI原生医院操作系统OS - S-05 阶段① similar-case-query 隔离适配器测试
 *
 * 隔离规则、审计事件与错误码全部复用 S-13；编排侧只做上下文取值与透传。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { AiAuditService, _resetAiAuditService, type AiVersionSnapshot } from '@/security/audit/aiAudit.js';
import {
  PatientIsolationService,
  _resetPatientIsolationService,
  type SimilarCaseChunk,
  type SimilarCaseIndex,
} from '@/knowledge-platform/isolation/patientIsolation.js';
import { WorkflowContext } from '@/orchestrator/engine/context.js';
import {
  buildSimilarCaseQuery,
  invokeSimilarCaseQuery,
  SIMILAR_CASE_TOOL_ID,
} from '@/orchestrator/adapters/similarCaseAdapter.js';

const versions: AiVersionSnapshot = {
  modelId: 'offline-model',
  modelVersion: '1.0.0',
  knowledgeVersion: ['clinical-v1'],
  promptVersion: 'prompt-v1',
  platformRelease: 'demo-release',
};

function provenance() {
  return {
    sourceId: 'src-demo-001',
    sourceName: '归档病例台账',
    license: 'CC-BY-4.0',
    fetchedAt: '2026-10-26T00:00:00.000Z',
  };
}

function makeChunk(visitId?: string): SimilarCaseChunk {
  return {
    chunkId: 'chunk-demo-001',
    patientId: 'patient-demo-001',
    visitId,
    excerpt: '脱敏相似病例片段：既往高血压病史，规范服药控制平稳。',
    sectionTitle: '既往史',
    archivedAt: '2026-10-20T00:00:00.000Z',
    deidentified: true,
    authorizedScope: ['doctor'],
    provenance: provenance(),
  };
}

function makeService(visitId?: string): { service: PatientIsolationService; audit: AiAuditService } {
  const audit = new AiAuditService();
  const service = new PatientIsolationService({ auditService: audit });
  const index: SimilarCaseIndex = {
    scope: 'patient-isolated',
    partitionKey: 'patient-demo-001',
    chunks: [makeChunk(visitId)],
    accessRule: { requireVisitMatch: true, allowedRoles: ['doctor'], purpose: 'similar-case-only' },
    createdAt: '2026-10-26T00:00:00.000Z',
    builtBy: 'archival-batch',
  };
  service.registerIndex(index);
  return { service, audit };
}

function makeContext(overrides: { patient?: Record<string, unknown>; user?: Record<string, unknown>; input?: Record<string, unknown> }) {
  return new WorkflowContext({
    input: overrides.input ?? {},
    patient: overrides.patient ?? {},
    user: overrides.user ?? {},
    trigger: { type: 'manual', traceId: 'trace-demo-001' },
    instanceId: 'inst-demo-001',
  });
}

beforeEach(() => {
  _resetPatientIsolationService();
  _resetAiAuditService();
});

describe('similar-case-query 适配器放行与隔离', () => {
  it('携带双标识与授权角色时放行，返回分区内片段，审计 PASS 入链', () => {
    const { service, audit } = makeService('visit-demo-001');
    const ctx = makeContext({
      patient: { patientId: 'patient-demo-001', visitId: 'visit-demo-001' },
      user: { userId: 'doctor-demo-001', roleCodes: ['doctor'], department: '内科' },
    });
    const query = buildSimilarCaseQuery(ctx, { userId: 'doctor-demo-001' }, 'trace-demo-001', versions);
    const verdict = invokeSimilarCaseQuery({ query, service });

    expect(verdict.allowed).toBe(true);
    expect(verdict.reasonCode).toBe('OK');
    expect(verdict.hits).toHaveLength(1);
    expect(verdict.hits[0].patientId).toBe('patient-demo-001');
    expect(query.purpose).toBe('similar-case-only');
    expect(SIMILAR_CASE_TOOL_ID).toBe('similar-case-query');
    expect(audit.query({ scenario: 'similar-case-isolation', guardLevel: 'PASS' })).toHaveLength(1);
  });

  it('缺少 visitId 不影响本分区放行口径', () => {
    const { service } = makeService(undefined);
    const ctx = makeContext({
      patient: { patientId: 'patient-demo-001' },
      user: { roleCodes: ['doctor'] },
    });
    const query = buildSimilarCaseQuery(ctx, {}, 'trace-demo-002', versions);
    const verdict = invokeSimilarCaseQuery({ query, service });
    expect(verdict.allowed).toBe(true);
    expect(verdict.hits).toHaveLength(1);
  });

  it('角色不在授权清单时阻断 ROLE_FORBIDDEN，不返回跨分区片段', () => {
    const { service } = makeService('visit-demo-001');
    const ctx = makeContext({
      patient: { patientId: 'patient-demo-001', visitId: 'visit-demo-001' },
      user: { roleCodes: ['nurse'] },
    });
    const query = buildSimilarCaseQuery(ctx, {}, 'trace-demo-003', versions);
    const verdict = invokeSimilarCaseQuery({ query, service });
    expect(verdict.allowed).toBe(false);
    expect(verdict.reasonCode).toBe('ROLE_FORBIDDEN');
    expect(verdict.hits).toHaveLength(0);
  });

  it('缺少 patientId 阻断 MISSING_PATIENT_ID，隔离阻断事件可回查', () => {
    const { service } = makeService('visit-demo-001');
    const ctx = makeContext({ patient: {}, user: { roleCodes: ['doctor'] } });
    const query = buildSimilarCaseQuery(ctx, {}, 'trace-demo-004', versions);
    const verdict = invokeSimilarCaseQuery({ query, service });
    expect(verdict.reasonCode).toBe('MISSING_PATIENT_ID');
    expect(service.listBlockedQueries({ traceId: 'trace-demo-004' })).toHaveLength(1);
  });

  it('查询用途固定为 similar-case-only，不能由编排上下文改写', () => {
    const ctx = makeContext({
      patient: { patientId: 'patient-demo-001' },
      user: { roleCodes: ['doctor'] },
      input: { purpose: 'general-query' },
    });
    const query = buildSimilarCaseQuery(ctx, {}, 'trace-demo-005', versions);
    expect(query.purpose).toBe('similar-case-only');
  });
});
