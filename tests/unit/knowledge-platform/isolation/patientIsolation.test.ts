/**
 * 健澜AI原生医院操作系统OS — 患者级隔离索引与越权审计单元测试（S-13）
 *
 * 覆盖：索引结构与归属校验、归档批量构建、IngestGuard 接入校验（ADR-03）、
 * 隔离查询放行与深拷贝隔离、越权阻断五分支、跨患者隔离、审计旁路与事件回查、服务重置。
 * 测试夹具均为演示合成数据，无院方实名；患者标识使用 patient-demo-xxx 占位。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import {
  AiAuditService,
  getAiAuditService,
  _resetAiAuditService,
  type AiActor,
  type AiAuditEventInput,
  type AiVersionSnapshot,
} from '@/security/audit/aiAudit.js';
import type { SourceProvenance } from '@/knowledge-platform/types.js';
import {
  PatientIsolationService,
  assertNotPatientDocument,
  buildArchivalIndex,
  getPatientIsolationService,
  validateSimilarCaseIndex,
  _resetPatientIsolationService,
  type IsolationQuery,
  type SimilarCaseChunk,
  type SimilarCaseIndex,
} from '@/knowledge-platform/isolation/patientIsolation.js';

// ---------------------------------------------------------------------------
// 演示夹具（合成占位数据）
// ---------------------------------------------------------------------------

function makeProvenance(sourceName: string): SourceProvenance {
  return {
    sourceId: `src-demo-${sourceName}`,
    sourceName,
    license: 'CC-BY-4.0',
    fetchedAt: '2026-10-26T00:00:00.000Z',
  };
}

function makeChunk(overrides: Partial<SimilarCaseChunk> & { patientId: string; chunkId: string }): SimilarCaseChunk {
  return {
    visitId: 'visit-demo-001',
    excerpt: '脱敏后的相似病例片段：既往高血压病史，规范服药控制平稳。',
    sectionTitle: '既往史',
    specialty: '心血管内科',
    archivedAt: '2026-10-20T00:00:00.000Z',
    deidentified: true,
    authorizedScope: ['doctor', 'specialist'],
    provenance: makeProvenance('归档病例台账'),
    ...overrides,
  };
}

function makeIndex(partitionKey: string, overrides?: Partial<SimilarCaseIndex>): SimilarCaseIndex {
  return {
    scope: 'patient-isolated',
    partitionKey,
    chunks: [makeChunk({ patientId: partitionKey, chunkId: `${partitionKey}-c1` })],
    accessRule: { requireVisitMatch: true, allowedRoles: ['doctor'], purpose: 'similar-case-only' },
    createdAt: '2026-10-26T00:00:00.000Z',
    builtBy: 'archival-batch',
    ...overrides,
  };
}

const demoActor: AiActor = {
  userId: 'user-demo-001',
  roleCodes: ['doctor'],
  department: '内科',
};

const demoVersions: AiVersionSnapshot = {
  modelId: 'demo-model',
  modelVersion: '1.0.0',
  knowledgeVersion: [],
  promptVersion: 'p-demo-001',
  platformRelease: 's13-demo',
};

function makeQuery(overrides: Partial<IsolationQuery>): IsolationQuery {
  return {
    traceId: 'trace-demo-001',
    actor: demoActor,
    patientId: 'patient-demo-001',
    visitId: 'visit-demo-001',
    roles: ['doctor'],
    purpose: 'similar-case-only',
    agentId: 'similar-case-agent',
    agentVersion: '1.0.0',
    versions: demoVersions,
    queryText: '相似病例检索演示',
    ...overrides,
  };
}

beforeEach(() => {
  _resetPatientIsolationService();
  _resetAiAuditService();
});

// ---------------------------------------------------------------------------
// 一、索引注册校验（validateSimilarCaseIndex + registerIndex）
// ---------------------------------------------------------------------------

describe('S-13 索引注册校验', () => {
  it('合法归档索引注册成功并可回读', () => {
    const service = new PatientIsolationService();
    const index = makeIndex('patient-demo-001');
    const registered = service.registerIndex(index);
    expect(registered.partitionKey).toBe('patient-demo-001');
    expect(registered.chunks.length).toBe(1);
    const fetched = service.getIndex('patient-demo-001');
    expect(fetched?.chunks[0].chunkId).toBe('patient-demo-001-c1');
  });

  it('scope 非 patient-isolated 时拒绝且错误信息含字段名', () => {
    const raw = makeIndex('patient-demo-001', { scope: 'general-common' } as unknown as Partial<SimilarCaseIndex>);
    const errors = validateSimilarCaseIndex(raw);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('scope');
  });

  it('builtBy 非 archival-batch 时拒绝', () => {
    const raw = makeIndex('patient-demo-001', { builtBy: 'manual-import' } as unknown as Partial<SimilarCaseIndex>);
    const errors = validateSimilarCaseIndex(raw);
    expect(errors.some((e) => e.includes('builtBy'))).toBe(true);
  });

  it('requireVisitMatch 非 true 时拒绝', () => {
    const raw = makeIndex('patient-demo-001', {
      accessRule: { requireVisitMatch: false, allowedRoles: ['doctor'], purpose: 'similar-case-only' },
    } as unknown as Partial<SimilarCaseIndex>);
    const errors = validateSimilarCaseIndex(raw);
    expect(errors.some((e) => e.includes('requireVisitMatch'))).toBe(true);
  });

  it('purpose 非 similar-case-only 时拒绝', () => {
    const raw = makeIndex('patient-demo-001', {
      accessRule: { requireVisitMatch: true, allowedRoles: ['doctor'], purpose: 'general-qa' },
    } as unknown as Partial<SimilarCaseIndex>);
    const errors = validateSimilarCaseIndex(raw);
    expect(errors.some((e) => e.includes('purpose'))).toBe(true);
  });

  it('allowedRoles 为空时拒绝', () => {
    const raw = makeIndex('patient-demo-001', {
      accessRule: { requireVisitMatch: true, allowedRoles: [], purpose: 'similar-case-only' },
    } as Partial<SimilarCaseIndex>);
    const errors = validateSimilarCaseIndex(raw);
    expect(errors.some((e) => e.includes('allowedRoles'))).toBe(true);
  });

  it('chunk patientId 与 partitionKey 不一致时拒绝', () => {
    const raw = makeIndex('patient-demo-001', {
      chunks: [makeChunk({ patientId: 'patient-demo-002', chunkId: 'c-cross' })],
    });
    const errors = validateSimilarCaseIndex(raw);
    expect(errors.some((e) => e.includes('partitionKey') || e.includes('分区'))).toBe(true);
  });

  it('deidentified=false 时拒绝', () => {
    const base = makeChunk({ patientId: 'patient-demo-001', chunkId: 'c-deid' });
    const chunk = { ...base, deidentified: false } as unknown as SimilarCaseChunk;
    const raw = makeIndex('patient-demo-001', { chunks: [chunk] });
    const errors = validateSimilarCaseIndex(raw);
    expect(errors.some((e) => e.includes('deidentified'))).toBe(true);
  });

  it('archivedAt 非法日期时拒绝', () => {
    const raw = makeIndex('patient-demo-001', {
      chunks: [
        makeChunk({ patientId: 'patient-demo-001', chunkId: 'c-date', archivedAt: 'not-a-date' }),
      ],
    });
    const errors = validateSimilarCaseIndex(raw);
    expect(errors.some((e) => e.includes('archivedAt'))).toBe(true);
  });

  it('excerpt 含 11 位手机号时拒绝', () => {
    const raw = makeIndex('patient-demo-001', {
      chunks: [
        makeChunk({ patientId: 'patient-demo-001', chunkId: 'c-mobile', excerpt: '随访联系电话 13812345678 已留存。' }),
      ],
    });
    const errors = validateSimilarCaseIndex(raw);
    expect(errors.some((e) => e.includes('手机号'))).toBe(true);
  });

  it('excerpt 含 18 位身份证号时拒绝', () => {
    const raw = makeIndex('patient-demo-001', {
      chunks: [
        makeChunk({ patientId: 'patient-demo-001', chunkId: 'c-idcard', excerpt: '身份证号 110101199003077758 归档备查。' }),
      ],
    });
    const errors = validateSimilarCaseIndex(raw);
    expect(errors.some((e) => e.includes('身份证号'))).toBe(true);
  });

  it('provenance.sourceName 缺失时拒绝', () => {
    const chunk = makeChunk({ patientId: 'patient-demo-001', chunkId: 'c-source' });
    chunk.provenance = { ...chunk.provenance, sourceName: '' };
    const raw = makeIndex('patient-demo-001', { chunks: [chunk] });
    const errors = validateSimilarCaseIndex(raw);
    expect(errors.some((e) => e.includes('sourceName'))).toBe(true);
  });

  it('重复 partitionKey 登记时拒绝（ISO-003）', () => {
    const service = new PatientIsolationService();
    service.registerIndex(makeIndex('patient-demo-001'));
    expect(() => service.registerIndex(makeIndex('patient-demo-001'))).toThrow(/ISO-003/);
  });
});

// ---------------------------------------------------------------------------
// 二、归档批量构建
// ---------------------------------------------------------------------------

describe('S-13 归档批量构建 buildArchivalIndex', () => {
  it('产出 archival-batch 标记、合法 createdAt 与三字段访问规则', () => {
    const records = [makeChunk({ patientId: 'patient-demo-001', chunkId: 'c-batch-1' })];
    const index = buildArchivalIndex(records, {
      partitionKey: 'patient-demo-001',
      allowedRoles: ['doctor', 'specialist'],
      operator: 'batch-operator-demo',
    });
    expect(index.builtBy).toBe('archival-batch');
    expect(index.scope).toBe('patient-isolated');
    expect(Number.isNaN(Date.parse(index.createdAt))).toBe(false);
    expect(index.accessRule.requireVisitMatch).toBe(true);
    expect(index.accessRule.purpose).toBe('similar-case-only');
    expect(index.accessRule.allowedRoles).toEqual(['doctor', 'specialist']);
    expect(index.chunks.length).toBe(1);
  });

  it('chunk 跨分区归属时拒绝（ISO-003）', () => {
    const records = [makeChunk({ patientId: 'patient-demo-002', chunkId: 'c-cross' })];
    expect(() =>
      buildArchivalIndex(records, {
        partitionKey: 'patient-demo-001',
        allowedRoles: ['doctor'],
        operator: 'batch-operator-demo',
      }),
    ).toThrow(/ISO-003/);
  });
});

// ---------------------------------------------------------------------------
// 三、IngestGuard 接入校验（ADR-03）
// ---------------------------------------------------------------------------

describe('S-13 IngestGuard 接入校验 assertNotPatientDocument', () => {
  it('携带 patientId 时拦截并列出字段', () => {
    const verdict = assertNotPatientDocument({ title: '演示文档', patientId: 'patient-demo-001' });
    expect(verdict.allowed).toBe(false);
    expect(verdict.reasonCode).toBe('PATIENT_DATA_BLOCKED');
    expect(verdict.blockedFields).toContain('patientId');
  });

  it('携带 visitId / medicalRecordNo / patientScopeId / partitionKey 分别拦截', () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ['visitId', { visitId: 'visit-demo-001' }],
      ['medicalRecordNo', { medicalRecordNo: 'MRN-DEMO-001' }],
      ['patientScopeId', { patientScopeId: 'scope-demo-001' }],
      ['partitionKey', { partitionKey: 'part-demo-001' }],
    ];
    for (const [field, payload] of cases) {
      const verdict = assertNotPatientDocument(payload);
      expect(verdict.allowed).toBe(false);
      expect(verdict.blockedFields).toContain(field);
    }
  });

  it('metadata 中携带同名键一并拦截', () => {
    const verdict = assertNotPatientDocument({
      title: '演示文档',
      metadata: { patientId: 'patient-demo-001', visitId: 'visit-demo-001' },
    });
    expect(verdict.allowed).toBe(false);
    expect(verdict.blockedFields).toContain('metadata.patientId');
    expect(verdict.blockedFields).toContain('metadata.visitId');
  });

  it('清洁元数据与空载荷放行', () => {
    expect(assertNotPatientDocument({ title: '通用规范文档', content: '公开知识内容' }).allowed).toBe(true);
    expect(assertNotPatientDocument({}).allowed).toBe(true);
    expect(assertNotPatientDocument({ tags: ['指南'], metadata: { source: 'demo' } }).allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 四、隔离查询放行与审计 PASS 事件
// ---------------------------------------------------------------------------

describe('S-13 隔离查询放行', () => {
  it('同患者、角色命中、用途正确、就诊匹配 → allowed=true 且返回深拷贝片段', () => {
    const audit = new AiAuditService();
    const service = new PatientIsolationService({ auditService: audit });
    service.registerIndex(makeIndex('patient-demo-001'));

    const verdict = service.querySimilarCases(makeQuery({}));
    expect(verdict.allowed).toBe(true);
    expect(verdict.reasonCode).toBe('OK');
    expect(verdict.hits.length).toBe(1);
    expect(verdict.hits[0].chunkId).toBe('patient-demo-001-c1');

    // 外部修改返回对象不影响台账
    verdict.hits[0].excerpt = '被外部篡改的片段';
    const refetched = service.getIndex('patient-demo-001');
    expect(refetched?.chunks[0].excerpt).not.toBe('被外部篡改的片段');

    const events = audit.query({ scenario: 'similar-case-isolation', guardLevel: 'PASS' });
    expect(events.length).toBe(1);
    expect(events[0].toolCalls[0].result).toBe('success');
    expect(events[0].outputSummary).toContain('1 条');
    expect(events[0].outputSummary).not.toContain('既往高血压病史');
    expect(events[0].writePath).toBe('patient-isolation/query');
  });
});

// ---------------------------------------------------------------------------
// 五、越权阻断五分支与审计 BLOCK 事件
// ---------------------------------------------------------------------------

describe('S-13 越权阻断', () => {
  it('缺少 patientId → MISSING_PATIENT_ID，hits 为空并写入 BLOCK 事件', () => {
    const audit = new AiAuditService();
    const service = new PatientIsolationService({ auditService: audit });
    service.registerIndex(makeIndex('patient-demo-001'));

    const verdict = service.querySimilarCases(makeQuery({ patientId: '' }));
    expect(verdict.allowed).toBe(false);
    expect(verdict.reasonCode).toBe('MISSING_PATIENT_ID');
    expect(verdict.hits).toEqual([]);

    const blocked = service.listBlockedQueries();
    expect(blocked.length).toBe(1);
    expect(blocked[0].guardLevel).toBe('BLOCK');
    expect(blocked[0].scenario).toBe('similar-case-isolation');
    expect(blocked[0].evidence).toContain('MISSING_PATIENT_ID');
    expect(blocked[0].toolCalls[0].result).toBe('blocked');
  });

  it('用途非 similar-case-only → PURPOSE_FORBIDDEN', () => {
    const audit = new AiAuditService();
    const service = new PatientIsolationService({ auditService: audit });
    service.registerIndex(makeIndex('patient-demo-001'));

    const verdict = service.querySimilarCases(makeQuery({ purpose: 'general-qa' }));
    expect(verdict.allowed).toBe(false);
    expect(verdict.reasonCode).toBe('PURPOSE_FORBIDDEN');
    expect(verdict.hits).toEqual([]);
    expect(service.listBlockedQueries().length).toBe(1);
  });

  it('角色无交集 → ROLE_FORBIDDEN', () => {
    const audit = new AiAuditService();
    const service = new PatientIsolationService({ auditService: audit });
    service.registerIndex(makeIndex('patient-demo-001'));

    const verdict = service.querySimilarCases(makeQuery({ roles: ['visitor'] }));
    expect(verdict.allowed).toBe(false);
    expect(verdict.reasonCode).toBe('ROLE_FORBIDDEN');
    expect(verdict.hits).toEqual([]);
    expect(service.listBlockedQueries().length).toBe(1);
  });

  it('分区不存在 → INDEX_NOT_FOUND', () => {
    const audit = new AiAuditService();
    const service = new PatientIsolationService({ auditService: audit });
    service.registerIndex(makeIndex('patient-demo-001'));

    const verdict = service.querySimilarCases(makeQuery({ patientId: 'patient-demo-999', traceId: 'trace-missing' }));
    expect(verdict.allowed).toBe(false);
    expect(verdict.reasonCode).toBe('INDEX_NOT_FOUND');
    expect(verdict.hits).toEqual([]);

    const blocked = service.listBlockedQueries({ traceId: 'trace-missing' });
    expect(blocked.length).toBe(1);
  });

  it('visitId 不匹配 → VISIT_MISMATCH，不返回该就诊片段', () => {
    const audit = new AiAuditService();
    const service = new PatientIsolationService({ auditService: audit });
    service.registerIndex(makeIndex('patient-demo-001'));

    const verdict = service.querySimilarCases(makeQuery({ visitId: 'visit-demo-999' }));
    expect(verdict.allowed).toBe(false);
    expect(verdict.reasonCode).toBe('VISIT_MISMATCH');
    expect(verdict.hits).toEqual([]);
    expect(service.listBlockedQueries().length).toBe(1);
  });

  it('阻断事件可按 patientId 与时间窗回查', () => {
    const audit = new AiAuditService();
    const service = new PatientIsolationService({ auditService: audit });
    service.registerIndex(makeIndex('patient-demo-001'));
    service.querySimilarCases(makeQuery({ patientId: '' }));
    service.querySimilarCases(makeQuery({ patientId: 'patient-demo-999', traceId: 'trace-b' }));

    expect(service.listBlockedQueries({ patientId: 'patient-demo-999' }).length).toBe(1);
    expect(service.listBlockedQueries({ traceId: 'trace-b' }).length).toBe(1);
    expect(service.listBlockedQueries({ from: '2000-01-01T00:00:00.000Z', to: '2100-01-01T00:00:00.000Z' }).length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 六、跨患者隔离
// ---------------------------------------------------------------------------

describe('S-13 跨患者隔离', () => {
  it('A 患者分区存在时，B 患者查询命中 INDEX_NOT_FOUND 且不含 A 患者任何片段标识', () => {
    const audit = new AiAuditService();
    const service = new PatientIsolationService({ auditService: audit });
    service.registerIndex(makeIndex('patient-demo-001'));

    const verdict = service.querySimilarCases(makeQuery({ patientId: 'patient-demo-002' }));
    expect(verdict.allowed).toBe(false);
    expect(verdict.reasonCode).toBe('INDEX_NOT_FOUND');
    expect(verdict.hits).toEqual([]);
    expect(verdict.hits.some((chunk) => chunk.chunkId.includes('patient-demo-001'))).toBe(false);
  });

  it('同分区多就诊片段：visitId 匹配时仅返回对应就诊片段', () => {
    const audit = new AiAuditService();
    const service = new PatientIsolationService({ auditService: audit });
    const index = makeIndex('patient-demo-001', {
      chunks: [
        makeChunk({ patientId: 'patient-demo-001', chunkId: 'c-visit-a', visitId: 'visit-demo-001' }),
        makeChunk({ patientId: 'patient-demo-001', chunkId: 'c-visit-b', visitId: 'visit-demo-002' }),
      ],
    });
    service.registerIndex(index);

    const verdict = service.querySimilarCases(makeQuery({ visitId: 'visit-demo-001' }));
    expect(verdict.allowed).toBe(true);
    expect(verdict.hits.map((c) => c.chunkId)).toEqual(['c-visit-a']);
  });
});

// ---------------------------------------------------------------------------
// 七、审计旁路与 S-08 校验口径
// ---------------------------------------------------------------------------

describe('S-13 审计旁路', () => {
  it('未注入审计服务时阻断 / 放行语义照常且不抛错', () => {
    const service = new PatientIsolationService();
    service.registerIndex(makeIndex('patient-demo-001'));

    const allowed = service.querySimilarCases(makeQuery({}));
    expect(allowed.allowed).toBe(true);
    expect(allowed.auditEventId).toBeUndefined();

    const blocked = service.querySimilarCases(makeQuery({ patientId: '' }));
    expect(blocked.allowed).toBe(false);
    expect(blocked.auditEventId).toBeUndefined();
    expect(service.listBlockedQueries()).toEqual([]);
  });

  it('注入内存 AiAuditService 后事件可经 query 多维检索', () => {
    const audit = new AiAuditService();
    const service = new PatientIsolationService({ auditService: audit });
    service.registerIndex(makeIndex('patient-demo-001'));
    service.querySimilarCases(makeQuery({}));
    service.querySimilarCases(makeQuery({ patientId: 'patient-demo-999' }));

    expect(audit.query({ scenario: 'similar-case-isolation' }).length).toBe(2);
    expect(audit.query({ guardLevel: 'PASS' }).length).toBe(1);
    expect(audit.query({ guardLevel: 'BLOCK' }).length).toBe(1);
  });

  it('S-08 既有校验拒绝缺字段事件，本切片不绕过审计入参校验', () => {
    const audit = getAiAuditService();
    expect(() =>
      audit.record({
        traceId: 'trace-invalid',
        // actor 缺失：由 S-08 validateAiAuditInput 拒绝
        agentId: 'demo',
        agentVersion: '1.0.0',
        scenario: 'similar-case-isolation',
        versions: demoVersions,
        inputSummary: '演示',
        outputSummary: '演示',
        citations: [],
        elapsedMs: 0,
        tokenUsage: { input: 0, output: 0 },
        guardLevel: 'BLOCK',
        humanAction: 'pending',
        toolCalls: [],
      } as unknown as AiAuditEventInput),
    ).toThrow(/AUD-001/);
  });
});

// ---------------------------------------------------------------------------
// 八、深拷贝与模块级重置
// ---------------------------------------------------------------------------

describe('S-13 深拷贝隔离与重置', () => {
  it('getIndex 返回深拷贝，外部改写不影响台账', () => {
    const service = new PatientIsolationService();
    service.registerIndex(makeIndex('patient-demo-001'));
    const fetched = service.getIndex('patient-demo-001');
    if (fetched) {
      fetched.partitionKey = 'tampered';
      fetched.chunks.push(makeChunk({ patientId: 'patient-demo-001', chunkId: 'c-tampered' }));
    }
    const refetched = service.getIndex('patient-demo-001');
    expect(refetched?.partitionKey).toBe('patient-demo-001');
    expect(refetched?.chunks.length).toBe(1);
  });

  it('reset() 后台账清空；模块级单例可经 _reset 重建', () => {
    const service = getPatientIsolationService();
    service.registerIndex(makeIndex('patient-demo-001'));
    expect(service.getIndex('patient-demo-001')).toBeDefined();

    service.reset();
    expect(service.getIndex('patient-demo-001')).toBeUndefined();

    _resetPatientIsolationService();
    const rebuilt = getPatientIsolationService();
    expect(rebuilt.getIndex('patient-demo-001')).toBeUndefined();
  });
});
