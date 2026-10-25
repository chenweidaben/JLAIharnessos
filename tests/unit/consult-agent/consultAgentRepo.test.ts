/**
 * 单元测试 - consult-agent Postgres 仓储契约（13 方法，不连真实 PostgreSQL）
 *
 * 测试口径：
 *  - 用 bun mock.module 替换 `src/db/pool.js` 的 `getDb`，返回可记录 SQL 模板片段
 *    与绑定参数的假查询器；假 db 是 postgres.js 模板标签函数形态，返回可配置 rows
 *    数组，并暴露 `json(value)` 返回标记对象（仓储 `toJsonParam` 会调用 `db.json(...)`）；
 *  - 每个用例先把 `process.env.DEMO_MODE` 置为 `'0'` 再调用 `createConsultAgentRepo()`，
 *    工厂在调用时读取环境变量，拿到 `PostgresConsultRepo` 实现；
 *  - 逐方法断言：表名、引用列、`RETURNING *`（适用者）、upsert 冲突键（适用者）、
 *    蛇形 -> 驼峰映射、空结果分支、错误透传（假 db reject 时方法以同一错误 reject，
 *    不吞错）；
 *  - 行映射断言覆盖每个 mapRow 的 null 兜底与 JSONB 字段（meta / toolCalls / evidence /
 *    detail / facts / extractedEvidence）。
 *
 * 本表实际表名 / 列清单 / 冲突键 / ORDER BY 均以 `src/db/repositories/consultAgentRepo.ts`
 * 源码为准；本文件不修改仓储源码与既有测试。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

import type { ConsultAgentPort } from '../../../src/core/agent/consult/ports';
import type {
  ConsultAuditEntry,
  ConsultDocument,
  ConsultDraft,
  ConsultMessage,
  ConsultProfileMemory,
  ConsultThread,
  EvidenceItem,
  ProfileFact,
  ToolCallRecord,
} from '../../../src/core/agent/consult/types';
import { DISCLAIMER } from '../../../src/core/agent/consult/types';

// ---------------------------------------------------------------------------
// 假查询器（postgres.js 模板标签函数形态）
// ---------------------------------------------------------------------------

interface SqlCall {
  raw: string;
  /** 折叠空白后的 SQL，便于跨换行断言列清单 / 子句 */
  normalized: string;
  params: unknown[];
}

interface FakeJsonParam {
  __pgJson: true;
  value: unknown;
}

interface FakeSql {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<Record<string, unknown>[]>;
  json(value: unknown): FakeJsonParam;
}

const state: {
  rows: Record<string, unknown>[];
  rejectError: Error | null;
  calls: SqlCall[];
} = { rows: [], rejectError: null, calls: [] };

const fakeDb: FakeSql = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<Record<string, unknown>[]> => {
  const raw = strings.join(' ');
  state.calls.push({
    raw,
    normalized: raw.replace(/\s+/g, ' ').trim(),
    params: [...values],
  });
  if (state.rejectError) return Promise.reject(state.rejectError);
  return Promise.resolve(state.rows);
};

fakeDb.json = (value: unknown): FakeJsonParam => {
  return { __pgJson: true, value };
};

void mock.module('../../../src/db/pool.js', () => ({
  getDb: () => fakeDb,
}));

const { createConsultAgentRepo } = await import('../../../src/db/repositories/consultAgentRepo.js');

// ---------------------------------------------------------------------------
// 夹具
// ---------------------------------------------------------------------------

const TS = '2026-10-26T08:00:00.000Z';
const TEST_USER_ID = 'user-001';
const TEST_THREAD_ID = 'thread-001';
const TEST_TRACE_ID = 'trace-001';

const evidenceItem: EvidenceItem = {
  kind: 'knowledge',
  label: '青霉素过敏提示',
  source: 'drug-catalog',
  snippet: '青霉素类药物过敏史需避免使用',
};

const toolCall: ToolCallRecord = {
  callId: 'call-001',
  name: 'drugSearch',
  status: 'success',
  durationMs: 120,
  evidenceCount: 3,
  errorClass: null,
  summary: '检索药品说明书（脱敏摘要）',
};

const fact: ProfileFact = {
  key: 'allergy',
  value: '青霉素过敏（待医师核实）',
  source: TEST_THREAD_ID,
  updatedAt: TS,
};

function threadFixture(overrides: Partial<ConsultThread> = {}): ConsultThread {
  return {
    id: TEST_THREAD_ID,
    userId: TEST_USER_ID,
    patientId: 'patient-001',
    title: '胸痛在线咨询',
    status: 'collecting',
    intent: 'symptom_report',
    safetyLevel: 'caution',
    currentRole: 'examiner',
    meta: { channel: 'web', confidence: 'high' },
    closedAt: null,
    createdAt: TS,
    updatedAt: TS,
    ...overrides,
  };
}

function messageFixture(overrides: Partial<ConsultMessage> = {}): ConsultMessage {
  return {
    id: 'msg-001',
    threadId: TEST_THREAD_ID,
    role: 'assistant',
    content: '建议注意休息、多饮水',
    intent: 'medication_question',
    roleKind: 'doctor',
    toolCalls: [toolCall],
    toolName: 'drugSearch',
    safetyLevel: 'normal',
    disclaimer: DISCLAIMER,
    traceId: TEST_TRACE_ID,
    createdAt: TS,
    ...overrides,
  };
}

function draftFixture(overrides: Partial<ConsultDraft> = {}): ConsultDraft {
  return {
    id: 'draft-001',
    threadId: TEST_THREAD_ID,
    kind: 'diagnosis',
    title: '诊断建议草稿',
    summary: '症状摘要',
    content: '诊断建议正文',
    evidence: [evidenceItem],
    needsPhysicianReview: true,
    isOutOfHospitalPrescription: false,
    status: 'pending_review',
    draftHash: 'hash-001',
    reviewerId: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: TS,
    updatedAt: TS,
    ...overrides,
  };
}

function auditFixture(overrides: Partial<ConsultAuditEntry> = {}): ConsultAuditEntry {
  return {
    id: 'audit-001',
    threadId: TEST_THREAD_ID,
    actorRole: 'doctor',
    action: 'tool:drugSearch',
    toolName: 'drugSearch',
    toolStatus: 'success',
    durationMs: 120,
    evidenceCount: 3,
    errorClass: null,
    traceId: TEST_TRACE_ID,
    detail: { redacted: true, summary: '脱敏摘要' },
    createdAt: TS,
    ...overrides,
  };
}

function profileFixture(overrides: Partial<ConsultProfileMemory> = {}): ConsultProfileMemory {
  return {
    id: 'profile-001',
    userId: TEST_USER_ID,
    threadId: TEST_THREAD_ID,
    facts: [fact],
    updatedAt: TS,
    ...overrides,
  };
}

function documentFixture(overrides: Partial<ConsultDocument> = {}): ConsultDocument {
  return {
    id: 'doc-001',
    threadId: TEST_THREAD_ID,
    messageId: 'msg-001',
    fileName: '血常规报告.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 204800,
    evidenceSummary: '白细胞计数正常',
    extractedEvidence: [evidenceItem],
    createdAt: TS,
    ...overrides,
  };
}

/** 蛇形命名行（完整字段） */
function threadRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: TEST_THREAD_ID,
    user_id: TEST_USER_ID,
    patient_id: 'patient-001',
    title: '胸痛在线咨询',
    status: 'collecting',
    intent: 'symptom_report',
    safety_level: 'caution',
    current_role: 'examiner',
    meta: { channel: 'web', confidence: 'high' },
    closed_at: null,
    created_at: TS,
    updated_at: TS,
    ...overrides,
  };
}

/** 蛇形命名行（缺失可空列，验证 mapRow 兜底） */
function threadRowMinimal(): Record<string, unknown> {
  return {
    id: 'thread-002',
    user_id: TEST_USER_ID,
    status: 'idle',
    intent: 'unknown',
    safety_level: 'normal',
    created_at: TS,
    updated_at: TS,
  };
}

function messageRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'msg-001',
    thread_id: TEST_THREAD_ID,
    role: 'assistant',
    content: '建议注意休息、多饮水',
    intent: 'medication_question',
    role_kind: 'doctor',
    tool_calls: [toolCall],
    tool_name: 'drugSearch',
    safety_level: 'normal',
    disclaimer: DISCLAIMER,
    trace_id: TEST_TRACE_ID,
    created_at: TS,
    ...overrides,
  };
}

function messageRowMinimal(): Record<string, unknown> {
  return {
    id: 'msg-002',
    thread_id: TEST_THREAD_ID,
    role: 'user',
    safety_level: 'normal',
    created_at: TS,
  };
}

function draftRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'draft-001',
    thread_id: TEST_THREAD_ID,
    kind: 'diagnosis',
    title: '诊断建议草稿',
    summary: '症状摘要',
    content: '诊断建议正文',
    evidence: [evidenceItem],
    draft_hash: 'hash-001',
    reviewer_id: null,
    reviewed_at: null,
    review_note: null,
    created_at: TS,
    updated_at: TS,
    ...overrides,
  };
}

function draftRowMinimal(): Record<string, unknown> {
  return {
    id: 'draft-002',
    thread_id: TEST_THREAD_ID,
    kind: 'prescription',
    created_at: TS,
    updated_at: TS,
  };
}

function auditRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'audit-001',
    thread_id: TEST_THREAD_ID,
    actor_role: 'doctor',
    action: 'tool:drugSearch',
    tool_name: 'drugSearch',
    tool_status: 'success',
    duration_ms: '120',
    evidence_count: '3',
    error_class: null,
    trace_id: TEST_TRACE_ID,
    detail: { redacted: true, summary: '脱敏摘要' },
    created_at: TS,
    ...overrides,
  };
}

function auditRowMinimal(): Record<string, unknown> {
  return {
    id: 'audit-002',
    thread_id: TEST_THREAD_ID,
    actor_role: 'system',
    created_at: TS,
  };
}

function profileRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'profile-001',
    user_id: TEST_USER_ID,
    thread_id: TEST_THREAD_ID,
    facts: [fact],
    updated_at: TS,
    ...overrides,
  };
}

function profileRowMinimal(): Record<string, unknown> {
  return {
    id: 'profile-002',
    user_id: TEST_USER_ID,
    updated_at: TS,
  };
}

function documentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'doc-001',
    thread_id: TEST_THREAD_ID,
    message_id: 'msg-001',
    file_name: '血常规报告.pdf',
    mime_type: 'application/pdf',
    size_bytes: '204800',
    evidence_summary: '白细胞计数正常',
    extracted_evidence: [evidenceItem],
    created_at: TS,
    ...overrides,
  };
}

function documentRowMinimal(): Record<string, unknown> {
  return {
    id: 'doc-002',
    thread_id: TEST_THREAD_ID,
    created_at: TS,
  };
}

// ---------------------------------------------------------------------------
// 通用断言辅助
// ---------------------------------------------------------------------------

function latestCall(): SqlCall {
  return state.calls[state.calls.length - 1];
}

function expectJsonParam(param: unknown, expected: unknown): void {
  expect(param).toEqual({ __pgJson: true, value: expected });
}

function makeRepo(): ConsultAgentPort {
  process.env.DEMO_MODE = '0';
  return createConsultAgentRepo();
}

/** 断言方法以同一错误对象 reject（身份一致，不吞错、不包装） */
async function expectRejectsSameError(invoke: () => Promise<unknown>, boom: Error): Promise<void> {
  let caught: unknown = null;
  try {
    await invoke();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBe(boom);
}

const savedDemoMode = process.env.DEMO_MODE;

beforeEach(() => {
  state.rows = [];
  state.rejectError = null;
  state.calls = [];
});

afterEach(() => {
  if (savedDemoMode === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = savedDemoMode;
});

// ============================================================================
// 1. findThread(threadId, userId)
// ============================================================================

describe('PostgresConsultRepo.findThread', () => {
  it('查询 consult.threads（id + user_id + LIMIT 1），完整行蛇形 -> 驼峰映射', async () => {
    state.rows = [threadRow()];
    const repo = makeRepo();

    const thread = await repo.findThread(TEST_THREAD_ID, TEST_USER_ID);

    expect(state.calls).toHaveLength(1);
    const call = latestCall();
    expect(call.normalized).toContain('FROM consult.threads');
    expect(call.normalized).toContain('WHERE id =');
    expect(call.normalized).toContain('user_id =');
    expect(call.normalized).toContain('LIMIT 1');
    expect(call.normalized).not.toContain('RETURNING');
    expect(call.normalized).not.toContain('ON CONFLICT');
    expect(call.params).toEqual([TEST_THREAD_ID, TEST_USER_ID]);

    expect(thread).not.toBeNull();
    if (!thread) return;
    expect(thread.id).toBe(TEST_THREAD_ID);
    expect(thread.userId).toBe(TEST_USER_ID);
    expect(thread.patientId).toBe('patient-001');
    expect(thread.title).toBe('胸痛在线咨询');
    expect(thread.status).toBe('collecting');
    expect(thread.intent).toBe('symptom_report');
    expect(thread.safetyLevel).toBe('caution');
    expect(thread.currentRole).toBe('examiner');
    expect(thread.meta).toEqual({ channel: 'web', confidence: 'high' });
    expect(thread.closedAt).toBeNull();
    expect(thread.createdAt).toBe(TS);
    expect(thread.updatedAt).toBe(TS);
  });

  it('缺失可空列时 mapThreadRow 走 null / 默认值兜底，meta 缺失回退 {}', async () => {
    state.rows = [threadRowMinimal()];
    const repo = makeRepo();

    const thread = await repo.findThread('thread-002', TEST_USER_ID);

    expect(thread).not.toBeNull();
    if (!thread) return;
    expect(thread.patientId).toBeNull();
    expect(thread.title).toBe('');
    expect(thread.currentRole).toBeNull();
    expect(thread.meta).toEqual({});
    expect(thread.closedAt).toBeNull();
  });

  it('空结果返回 null（不映射、不抛错）', async () => {
    state.rows = [];
    const repo = makeRepo();

    const thread = await repo.findThread('thread-x', TEST_USER_ID);

    expect(thread).toBeNull();
    expect(state.calls).toHaveLength(1);
  });

  it('db reject 时以同一错误透传，不吞错', async () => {
    const boom = new Error('ECONNREFUSED 127.0.0.1:5432');
    state.rejectError = boom;
    const repo = makeRepo();

    await expectRejectsSameError(() => repo.findThread(TEST_THREAD_ID, TEST_USER_ID), boom);
    expect(state.calls).toHaveLength(1);
  });
});

// ============================================================================
// 2. listThreads(userId)
// ============================================================================

describe('PostgresConsultRepo.listThreads', () => {
  it('查询 consult.threads（user_id，updated_at DESC），多行映射', async () => {
    state.rows = [threadRow(), threadRowMinimal()];
    const repo = makeRepo();

    const threads = await repo.listThreads(TEST_USER_ID);

    expect(state.calls).toHaveLength(1);
    const call = latestCall();
    expect(call.normalized).toContain('FROM consult.threads');
    expect(call.normalized).toContain('WHERE user_id =');
    expect(call.normalized).toContain('ORDER BY updated_at DESC');
    expect(call.normalized).not.toContain('RETURNING');
    expect(call.params).toEqual([TEST_USER_ID]);

    expect(threads).toHaveLength(2);
    expect(threads[0].id).toBe(TEST_THREAD_ID);
    expect(threads[0].userId).toBe(TEST_USER_ID);
    expect(threads[0].meta).toEqual({ channel: 'web', confidence: 'high' });
    expect(threads[1].id).toBe('thread-002');
    expect(threads[1].title).toBe('');
    expect(threads[1].meta).toEqual({});
    expect(threads[1].patientId).toBeNull();
  });

  it('空结果返回 []', async () => {
    state.rows = [];
    const repo = makeRepo();

    const threads = await repo.listThreads(TEST_USER_ID);

    expect(threads).toEqual([]);
    expect(state.calls).toHaveLength(1);
  });

  it('db reject 时以同一错误透传，不吞错', async () => {
    const boom = new Error('ECONNREFUSED 127.0.0.1:5432');
    state.rejectError = boom;
    const repo = makeRepo();

    await expectRejectsSameError(() => repo.listThreads(TEST_USER_ID), boom);
    expect(state.calls).toHaveLength(1);
  });
});

// ============================================================================
// 3. saveThread(thread)
// ============================================================================

describe('PostgresConsultRepo.saveThread', () => {
  it('INSERT consult.threads，ON CONFLICT (id) DO UPDATE，RETURNING *，meta 走 json 参数', async () => {
    state.rows = [threadRow()];
    const repo = makeRepo();

    const saved = await repo.saveThread(threadFixture());

    expect(state.calls).toHaveLength(1);
    const call = latestCall();
    expect(call.normalized).toContain('INSERT INTO consult.threads');
    expect(call.normalized).toContain(
      '(id, user_id, patient_id, title, status, intent, safety_level, current_role, meta, closed_at, created_at, updated_at)',
    );
    expect(call.normalized).toContain('ON CONFLICT (id) DO UPDATE SET');
    expect(call.normalized).toContain('RETURNING *');

    expect(call.params).toHaveLength(12);
    expect(call.params[0]).toBe(TEST_THREAD_ID);
    expect(call.params[1]).toBe(TEST_USER_ID);
    expect(call.params[2]).toBe('patient-001');
    expect(call.params[3]).toBe('胸痛在线咨询');
    expect(call.params[4]).toBe('collecting');
    expect(call.params[5]).toBe('symptom_report');
    expect(call.params[6]).toBe('caution');
    expect(call.params[7]).toBe('examiner');
    expectJsonParam(call.params[8], { channel: 'web', confidence: 'high' });
    expect(call.params[9]).toBeNull();
    expect(call.params[10]).toBe(TS);
    expect(call.params[11]).toBe(TS);

    expect(saved.id).toBe(TEST_THREAD_ID);
    expect(saved.userId).toBe(TEST_USER_ID);
    expect(saved.patientId).toBe('patient-001');
    expect(saved.meta).toEqual({ channel: 'web', confidence: 'high' });
  });

  it('db reject 时以同一错误透传，不吞错', async () => {
    const boom = new Error('ECONNREFUSED 127.0.0.1:5432');
    state.rejectError = boom;
    const repo = makeRepo();

    await expectRejectsSameError(() => repo.saveThread(threadFixture()), boom);
    expect(state.calls).toHaveLength(1);
  });
});

// ============================================================================
// 4. listMessages(threadId)
// ============================================================================

describe('PostgresConsultRepo.listMessages', () => {
  it('查询 consult.messages（thread_id，created_at ASC），完整行映射含 toolCalls JSONB', async () => {
    state.rows = [messageRow()];
    const repo = makeRepo();

    const messages = await repo.listMessages(TEST_THREAD_ID);

    expect(state.calls).toHaveLength(1);
    const call = latestCall();
    expect(call.normalized).toContain('FROM consult.messages');
    expect(call.normalized).toContain('WHERE thread_id =');
    expect(call.normalized).toContain('ORDER BY created_at ASC');
    expect(call.normalized).not.toContain('RETURNING');
    expect(call.params).toEqual([TEST_THREAD_ID]);

    expect(messages).toHaveLength(1);
    const message = messages[0];
    expect(message.id).toBe('msg-001');
    expect(message.threadId).toBe(TEST_THREAD_ID);
    expect(message.role).toBe('assistant');
    expect(message.content).toBe('建议注意休息、多饮水');
    expect(message.intent).toBe('medication_question');
    expect(message.roleKind).toBe('doctor');
    expect(message.toolCalls).toEqual([toolCall]);
    expect(message.toolName).toBe('drugSearch');
    expect(message.safetyLevel).toBe('normal');
    expect(message.disclaimer).toBe(DISCLAIMER);
    expect(message.traceId).toBe(TEST_TRACE_ID);
    expect(message.createdAt).toBe(TS);
  });

  it('缺失可空列时 mapMessageRow 走 null / 默认值兜底', async () => {
    state.rows = [messageRowMinimal()];
    const repo = makeRepo();

    const messages = await repo.listMessages(TEST_THREAD_ID);

    expect(messages).toHaveLength(1);
    const message = messages[0];
    expect(message.content).toBe('');
    expect(message.intent).toBeNull();
    expect(message.roleKind).toBeNull();
    expect(message.toolCalls).toBeNull();
    expect(message.toolName).toBeNull();
    expect(message.disclaimer).toBe('');
    expect(message.traceId).toBe('');
  });

  it('空结果返回 []', async () => {
    state.rows = [];
    const repo = makeRepo();

    const messages = await repo.listMessages(TEST_THREAD_ID);

    expect(messages).toEqual([]);
    expect(state.calls).toHaveLength(1);
  });

  it('db reject 时以同一错误透传，不吞错', async () => {
    const boom = new Error('ECONNREFUSED 127.0.0.1:5432');
    state.rejectError = boom;
    const repo = makeRepo();

    await expectRejectsSameError(() => repo.listMessages(TEST_THREAD_ID), boom);
    expect(state.calls).toHaveLength(1);
  });
});

// ============================================================================
// 5. saveMessage(message)
// ============================================================================

describe('PostgresConsultRepo.saveMessage', () => {
  it('INSERT consult.messages，RETURNING *，toolCalls 走 json 参数，无冲突键', async () => {
    state.rows = [messageRow()];
    const repo = makeRepo();

    const saved = await repo.saveMessage(messageFixture());

    expect(state.calls).toHaveLength(1);
    const call = latestCall();
    expect(call.normalized).toContain('INSERT INTO consult.messages');
    expect(call.normalized).toContain(
      '(id, thread_id, role, content, intent, role_kind, tool_calls, tool_name, safety_level, disclaimer, trace_id, created_at)',
    );
    expect(call.normalized).toContain('RETURNING *');
    expect(call.normalized).not.toContain('ON CONFLICT');

    expect(call.params).toHaveLength(12);
    expect(call.params[0]).toBe('msg-001');
    expect(call.params[1]).toBe(TEST_THREAD_ID);
    expect(call.params[2]).toBe('assistant');
    expect(call.params[3]).toBe('建议注意休息、多饮水');
    expect(call.params[4]).toBe('medication_question');
    expect(call.params[5]).toBe('doctor');
    expectJsonParam(call.params[6], [toolCall]);
    expect(call.params[7]).toBe('drugSearch');
    expect(call.params[8]).toBe('normal');
    expect(call.params[9]).toBe(DISCLAIMER);
    expect(call.params[10]).toBe(TEST_TRACE_ID);
    expect(call.params[11]).toBe(TS);

    expect(saved.id).toBe('msg-001');
    expect(saved.toolCalls).toEqual([toolCall]);
  });

  it('toolCalls 为 null 时 json 参数回退为空数组（toolCalls ?? []）', async () => {
    state.rows = [messageRow({ tool_calls: null })];
    const repo = makeRepo();

    await repo.saveMessage(messageFixture({ toolCalls: null, toolName: null }));

    const call = latestCall();
    expectJsonParam(call.params[6], []);
  });

  it('db reject 时以同一错误透传，不吞错', async () => {
    const boom = new Error('ECONNREFUSED 127.0.0.1:5432');
    state.rejectError = boom;
    const repo = makeRepo();

    await expectRejectsSameError(() => repo.saveMessage(messageFixture()), boom);
    expect(state.calls).toHaveLength(1);
  });
});

// ============================================================================
// 6. listDrafts(threadId, kind)
// ============================================================================

describe('PostgresConsultRepo.listDrafts', () => {
  it('查询 consult.diagnosis_prescription_drafts（thread_id + kind，created_at DESC），映射含 evidence', async () => {
    state.rows = [draftRow()];
    const repo = makeRepo();

    const drafts = await repo.listDrafts(TEST_THREAD_ID, 'diagnosis');

    expect(state.calls).toHaveLength(1);
    const call = latestCall();
    expect(call.normalized).toContain('FROM consult.diagnosis_prescription_drafts');
    expect(call.normalized).toContain('WHERE thread_id =');
    expect(call.normalized).toContain('kind =');
    expect(call.normalized).toContain('ORDER BY created_at DESC');
    expect(call.normalized).not.toContain('RETURNING');
    expect(call.params).toEqual([TEST_THREAD_ID, 'diagnosis']);

    expect(drafts).toHaveLength(1);
    const draft = drafts[0];
    expect(draft.id).toBe('draft-001');
    expect(draft.threadId).toBe(TEST_THREAD_ID);
    expect(draft.kind).toBe('diagnosis');
    expect(draft.title).toBe('诊断建议草稿');
    expect(draft.summary).toBe('症状摘要');
    expect(draft.content).toBe('诊断建议正文');
    expect(draft.evidence).toEqual([evidenceItem]);
    expect(draft.draftHash).toBe('hash-001');
    expect(draft.reviewerId).toBeNull();
    expect(draft.reviewedAt).toBeNull();
    expect(draft.reviewNote).toBeNull();
    // 红线字面量由 mapDraftRow 强制兜底
    expect(draft.needsPhysicianReview).toBe(true);
    expect(draft.isOutOfHospitalPrescription).toBe(false);
    expect(draft.status).toBe('pending_review');
  });

  it('缺失可空列时 mapDraftRow 走 null / 默认值兜底，红线字面量仍强制在位', async () => {
    state.rows = [draftRowMinimal()];
    const repo = makeRepo();

    const drafts = await repo.listDrafts(TEST_THREAD_ID, 'prescription');

    expect(drafts).toHaveLength(1);
    const draft = drafts[0];
    expect(draft.title).toBe('');
    expect(draft.summary).toBe('');
    expect(draft.content).toBe('');
    expect(draft.evidence).toEqual([]);
    expect(draft.draftHash).toBe('');
    expect(draft.reviewerId).toBeNull();
    expect(draft.reviewedAt).toBeNull();
    expect(draft.reviewNote).toBeNull();
    expect(draft.needsPhysicianReview).toBe(true);
    expect(draft.isOutOfHospitalPrescription).toBe(false);
    expect(draft.status).toBe('pending_review');
  });

  it('空结果返回 []', async () => {
    state.rows = [];
    const repo = makeRepo();

    const drafts = await repo.listDrafts(TEST_THREAD_ID, 'diagnosis');

    expect(drafts).toEqual([]);
    expect(state.calls).toHaveLength(1);
  });

  it('db reject 时以同一错误透传，不吞错', async () => {
    const boom = new Error('ECONNREFUSED 127.0.0.1:5432');
    state.rejectError = boom;
    const repo = makeRepo();

    await expectRejectsSameError(() => repo.listDrafts(TEST_THREAD_ID, 'diagnosis'), boom);
    expect(state.calls).toHaveLength(1);
  });
});

// ============================================================================
// 7. saveDraft(draft)
// ============================================================================

describe('PostgresConsultRepo.saveDraft', () => {
  it('INSERT consult.diagnosis_prescription_drafts，ON CONFLICT (id) DO UPDATE，RETURNING *', async () => {
    state.rows = [draftRow()];
    const repo = makeRepo();

    const saved = await repo.saveDraft(draftFixture());

    expect(state.calls).toHaveLength(1);
    const call = latestCall();
    expect(call.normalized).toContain('INSERT INTO consult.diagnosis_prescription_drafts');
    expect(call.normalized).toContain(
      '(id, thread_id, kind, title, summary, content, evidence, needs_physician_review, is_out_of_hospital_prescription, status, draft_hash, reviewer_id, reviewed_at, review_note, created_at, updated_at)',
    );
    expect(call.normalized).toContain('ON CONFLICT (id) DO UPDATE SET');
    expect(call.normalized).toContain('RETURNING *');

    expect(call.params).toHaveLength(16);
    expect(call.params[0]).toBe('draft-001');
    expect(call.params[1]).toBe(TEST_THREAD_ID);
    expect(call.params[2]).toBe('diagnosis');
    expect(call.params[3]).toBe('诊断建议草稿');
    expect(call.params[4]).toBe('症状摘要');
    expect(call.params[5]).toBe('诊断建议正文');
    expectJsonParam(call.params[6], [evidenceItem]);
    expect(call.params[7]).toBe(true);
    expect(call.params[8]).toBe(false);
    expect(call.params[9]).toBe('pending_review');
    expect(call.params[10]).toBe('hash-001');
    expect(call.params[11]).toBeNull();
    expect(call.params[12]).toBeNull();
    expect(call.params[13]).toBeNull();
    expect(call.params[14]).toBe(TS);
    expect(call.params[15]).toBe(TS);

    expect(saved.id).toBe('draft-001');
    expect(saved.evidence).toEqual([evidenceItem]);
  });

  it('db reject 时以同一错误透传，不吞错', async () => {
    const boom = new Error('ECONNREFUSED 127.0.0.1:5432');
    state.rejectError = boom;
    const repo = makeRepo();

    await expectRejectsSameError(() => repo.saveDraft(draftFixture()), boom);
    expect(state.calls).toHaveLength(1);
  });
});

// ============================================================================
// 8. listAudit(threadId)
// ============================================================================

describe('PostgresConsultRepo.listAudit', () => {
  it('查询 consult.audit_trail（thread_id，created_at ASC），detail JSONB 透传，数值列 Number 转换', async () => {
    state.rows = [auditRow()];
    const repo = makeRepo();

    const entries = await repo.listAudit(TEST_THREAD_ID);

    expect(state.calls).toHaveLength(1);
    const call = latestCall();
    expect(call.normalized).toContain('FROM consult.audit_trail');
    expect(call.normalized).toContain('WHERE thread_id =');
    expect(call.normalized).toContain('ORDER BY created_at ASC');
    expect(call.normalized).not.toContain('RETURNING');
    expect(call.params).toEqual([TEST_THREAD_ID]);

    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.id).toBe('audit-001');
    expect(entry.threadId).toBe(TEST_THREAD_ID);
    expect(entry.actorRole).toBe('doctor');
    expect(entry.action).toBe('tool:drugSearch');
    expect(entry.toolName).toBe('drugSearch');
    expect(entry.toolStatus).toBe('success');
    expect(entry.durationMs).toBe(120);
    expect(entry.evidenceCount).toBe(3);
    expect(entry.errorClass).toBeNull();
    expect(entry.traceId).toBe(TEST_TRACE_ID);
    expect(entry.detail).toEqual({ redacted: true, summary: '脱敏摘要' });
    expect(entry.createdAt).toBe(TS);
  });

  it('缺失可空列时 mapAuditRow 走 null / 默认值兜底，detail 缺失回退 {}', async () => {
    state.rows = [auditRowMinimal()];
    const repo = makeRepo();

    const entries = await repo.listAudit(TEST_THREAD_ID);

    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.action).toBe('');
    expect(entry.toolName).toBeNull();
    expect(entry.toolStatus).toBeNull();
    expect(entry.durationMs).toBeNull();
    expect(entry.evidenceCount).toBeNull();
    expect(entry.errorClass).toBeNull();
    expect(entry.traceId).toBe('');
    expect(entry.detail).toEqual({});
  });

  it('空结果返回 []', async () => {
    state.rows = [];
    const repo = makeRepo();

    const entries = await repo.listAudit(TEST_THREAD_ID);

    expect(entries).toEqual([]);
    expect(state.calls).toHaveLength(1);
  });

  it('db reject 时以同一错误透传，不吞错', async () => {
    const boom = new Error('ECONNREFUSED 127.0.0.1:5432');
    state.rejectError = boom;
    const repo = makeRepo();

    await expectRejectsSameError(() => repo.listAudit(TEST_THREAD_ID), boom);
    expect(state.calls).toHaveLength(1);
  });
});

// ============================================================================
// 9. saveAudit(entry)
// ============================================================================

describe('PostgresConsultRepo.saveAudit', () => {
  it('INSERT consult.audit_trail，无 RETURNING、无冲突键，方法返回 void（不映射行）', async () => {
    state.rows = [auditRow()];
    const repo = makeRepo();

    const result = await repo.saveAudit(auditFixture());

    expect(result).toBeUndefined();
    expect(state.calls).toHaveLength(1);
    const call = latestCall();
    expect(call.normalized).toContain('INSERT INTO consult.audit_trail');
    expect(call.normalized).toContain(
      '(id, thread_id, actor_role, action, tool_name, tool_status, duration_ms, evidence_count, error_class, trace_id, detail, created_at)',
    );
    expect(call.normalized).not.toContain('RETURNING');
    expect(call.normalized).not.toContain('ON CONFLICT');

    expect(call.params).toHaveLength(12);
    expect(call.params[0]).toBe('audit-001');
    expect(call.params[1]).toBe(TEST_THREAD_ID);
    expect(call.params[2]).toBe('doctor');
    expect(call.params[3]).toBe('tool:drugSearch');
    expect(call.params[4]).toBe('drugSearch');
    expect(call.params[5]).toBe('success');
    expect(call.params[6]).toBe(120);
    expect(call.params[7]).toBe(3);
    expect(call.params[8]).toBeNull();
    expect(call.params[9]).toBe(TEST_TRACE_ID);
    expectJsonParam(call.params[10], { redacted: true, summary: '脱敏摘要' });
    expect(call.params[11]).toBe(TS);
  });

  it('db reject 时以同一错误透传，不吞错、不回退行映射', async () => {
    const boom = new Error('ECONNREFUSED 127.0.0.1:5432');
    state.rejectError = boom;
    const repo = makeRepo();

    await expectRejectsSameError(() => repo.saveAudit(auditFixture()), boom);
    expect(state.calls).toHaveLength(1);
  });
});

// ============================================================================
// 10. getProfile(userId)
// ============================================================================

describe('PostgresConsultRepo.getProfile', () => {
  it('查询 consult.profile_memory（user_id + LIMIT 1），完整行映射含 facts JSONB', async () => {
    state.rows = [profileRow()];
    const repo = makeRepo();

    const profile = await repo.getProfile(TEST_USER_ID);

    expect(state.calls).toHaveLength(1);
    const call = latestCall();
    expect(call.normalized).toContain('FROM consult.profile_memory');
    expect(call.normalized).toContain('WHERE user_id =');
    expect(call.normalized).toContain('LIMIT 1');
    expect(call.normalized).not.toContain('RETURNING');
    expect(call.params).toEqual([TEST_USER_ID]);

    expect(profile.id).toBe('profile-001');
    expect(profile.userId).toBe(TEST_USER_ID);
    expect(profile.threadId).toBe(TEST_THREAD_ID);
    expect(profile.facts).toEqual([fact]);
    expect(profile.updatedAt).toBe(TS);
  });

  it('缺失可空列时 mapProfileRow 走 null / 默认值兜底，facts 缺失回退 []', async () => {
    state.rows = [profileRowMinimal()];
    const repo = makeRepo();

    const profile = await repo.getProfile(TEST_USER_ID);

    expect(profile.threadId).toBeNull();
    expect(profile.facts).toEqual([]);
  });

  it('空结果返回 createProfileMemory(userId) 空白画像（facts=[]、threadId=null）', async () => {
    state.rows = [];
    const repo = makeRepo();

    const profile = await repo.getProfile(TEST_USER_ID);

    expect(state.calls).toHaveLength(1);
    expect(profile.userId).toBe(TEST_USER_ID);
    expect(profile.threadId).toBeNull();
    expect(profile.facts).toEqual([]);
    expect(profile.id).toBeTruthy();
    expect(profile.updatedAt).toBeTruthy();
  });

  it('db reject 时以同一错误透传，不吞错', async () => {
    const boom = new Error('ECONNREFUSED 127.0.0.1:5432');
    state.rejectError = boom;
    const repo = makeRepo();

    await expectRejectsSameError(() => repo.getProfile(TEST_USER_ID), boom);
    expect(state.calls).toHaveLength(1);
  });
});

// ============================================================================
// 11. saveProfile(profile)
// ============================================================================

describe('PostgresConsultRepo.saveProfile', () => {
  it('INSERT consult.profile_memory，ON CONFLICT (user_id) DO UPDATE，RETURNING *，facts 走 json 参数', async () => {
    state.rows = [profileRow()];
    const repo = makeRepo();

    const saved = await repo.saveProfile(profileFixture());

    expect(state.calls).toHaveLength(1);
    const call = latestCall();
    expect(call.normalized).toContain('INSERT INTO consult.profile_memory');
    expect(call.normalized).toContain('(id, user_id, thread_id, facts, updated_at)');
    expect(call.normalized).toContain('ON CONFLICT (user_id) DO UPDATE SET');
    expect(call.normalized).toContain('RETURNING *');

    expect(call.params).toHaveLength(5);
    expect(call.params[0]).toBe('profile-001');
    expect(call.params[1]).toBe(TEST_USER_ID);
    expect(call.params[2]).toBe(TEST_THREAD_ID);
    expectJsonParam(call.params[3], [fact]);
    expect(call.params[4]).toBe(TS);

    expect(saved.id).toBe('profile-001');
    expect(saved.userId).toBe(TEST_USER_ID);
    expect(saved.facts).toEqual([fact]);
  });

  it('db reject 时以同一错误透传，不吞错', async () => {
    const boom = new Error('ECONNREFUSED 127.0.0.1:5432');
    state.rejectError = boom;
    const repo = makeRepo();

    await expectRejectsSameError(() => repo.saveProfile(profileFixture()), boom);
    expect(state.calls).toHaveLength(1);
  });
});

// ============================================================================
// 12. listDocuments(threadId)
// ============================================================================

describe('PostgresConsultRepo.listDocuments', () => {
  it('查询 consult.documents（thread_id，created_at ASC），extractedEvidence JSONB 透传，sizeBytes Number 转换', async () => {
    state.rows = [documentRow()];
    const repo = makeRepo();

    const documents = await repo.listDocuments(TEST_THREAD_ID);

    expect(state.calls).toHaveLength(1);
    const call = latestCall();
    expect(call.normalized).toContain('FROM consult.documents');
    expect(call.normalized).toContain('WHERE thread_id =');
    expect(call.normalized).toContain('ORDER BY created_at ASC');
    expect(call.normalized).not.toContain('RETURNING');
    expect(call.params).toEqual([TEST_THREAD_ID]);

    expect(documents).toHaveLength(1);
    const document = documents[0];
    expect(document.id).toBe('doc-001');
    expect(document.threadId).toBe(TEST_THREAD_ID);
    expect(document.messageId).toBe('msg-001');
    expect(document.fileName).toBe('血常规报告.pdf');
    expect(document.mimeType).toBe('application/pdf');
    expect(document.sizeBytes).toBe(204800);
    expect(document.evidenceSummary).toBe('白细胞计数正常');
    expect(document.extractedEvidence).toEqual([evidenceItem]);
    expect(document.createdAt).toBe(TS);
  });

  it('缺失可空列时 mapDocumentRow 走 null / 默认值兜底，extractedEvidence 缺失回退 []', async () => {
    state.rows = [documentRowMinimal()];
    const repo = makeRepo();

    const documents = await repo.listDocuments(TEST_THREAD_ID);

    expect(documents).toHaveLength(1);
    const document = documents[0];
    expect(document.messageId).toBeNull();
    expect(document.fileName).toBe('');
    expect(document.mimeType).toBe('');
    expect(document.sizeBytes).toBeNull();
    expect(document.evidenceSummary).toBeNull();
    expect(document.extractedEvidence).toEqual([]);
  });

  it('空结果返回 []', async () => {
    state.rows = [];
    const repo = makeRepo();

    const documents = await repo.listDocuments(TEST_THREAD_ID);

    expect(documents).toEqual([]);
    expect(state.calls).toHaveLength(1);
  });

  it('db reject 时以同一错误透传，不吞错', async () => {
    const boom = new Error('ECONNREFUSED 127.0.0.1:5432');
    state.rejectError = boom;
    const repo = makeRepo();

    await expectRejectsSameError(() => repo.listDocuments(TEST_THREAD_ID), boom);
    expect(state.calls).toHaveLength(1);
  });
});

// ============================================================================
// 13. saveDocument(document)
// ============================================================================

describe('PostgresConsultRepo.saveDocument', () => {
  it('INSERT consult.documents，RETURNING *，extractedEvidence 走 json 参数，无冲突键', async () => {
    state.rows = [documentRow()];
    const repo = makeRepo();

    const saved = await repo.saveDocument(documentFixture());

    expect(state.calls).toHaveLength(1);
    const call = latestCall();
    expect(call.normalized).toContain('INSERT INTO consult.documents');
    expect(call.normalized).toContain(
      '(id, thread_id, message_id, file_name, mime_type, size_bytes, evidence_summary, extracted_evidence, created_at)',
    );
    expect(call.normalized).toContain('RETURNING *');
    expect(call.normalized).not.toContain('ON CONFLICT');

    expect(call.params).toHaveLength(9);
    expect(call.params[0]).toBe('doc-001');
    expect(call.params[1]).toBe(TEST_THREAD_ID);
    expect(call.params[2]).toBe('msg-001');
    expect(call.params[3]).toBe('血常规报告.pdf');
    expect(call.params[4]).toBe('application/pdf');
    expect(call.params[5]).toBe(204800);
    expect(call.params[6]).toBe('白细胞计数正常');
    expectJsonParam(call.params[7], [evidenceItem]);
    expect(call.params[8]).toBe(TS);

    expect(saved.id).toBe('doc-001');
    expect(saved.extractedEvidence).toEqual([evidenceItem]);
  });

  it('db reject 时以同一错误透传，不吞错', async () => {
    const boom = new Error('ECONNREFUSED 127.0.0.1:5432');
    state.rejectError = boom;
    const repo = makeRepo();

    await expectRejectsSameError(() => repo.saveDocument(documentFixture()), boom);
    expect(state.calls).toHaveLength(1);
  });
});
