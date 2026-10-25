/**
 * 单元测试 - 审计条目构造与脱敏（补基线未覆盖分支）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖基线未覆盖行：
 * - audit/index.ts 27：redactRawArgs 嵌套对象递归脱敏分支
 * - audit/index.ts 38：redactRawArgsEntry 嵌套数组递归脱敏分支
 * 红线 §15-5 / §15-6：工具审计只留脱敏摘要，禁止原始入参明文落库。
 */

import { describe, expect, it } from 'bun:test';

import {
  createAuditEntry,
  createToolCallRecord,
  redactRawArgs,
} from '../../../src/core/agent/consult/audit';

describe('audit redactRawArgs 顶层原始入参类键剔除', () => {
  it('args / raw / body 等原始入参类键（大小写不敏感）被剔除，安全键原样保留', () => {
    const redacted = redactRawArgs({
      summary: '工具执行完成',
      args: { drugName: '布洛芬' },
      input: { dose: '0.2g' },
      payload: { trace: 'x' },
      raw: { userId: 'u-secret' },
      body: '原始请求体明文',
      request: { page: 1 },
      requestBody: { method: 'POST' },
      params: { q: '咳嗽' },
      note: '安全备注',
      history: ['a', 'b'],
    });

    expect(redacted.note).toBe('安全备注');
    expect(redacted.history).toEqual(['a', 'b']);
    expect(redacted.summary).toBe('工具执行完成');

    for (const bannedKey of [
      'args',
      'input',
      'payload',
      'raw',
      'body',
      'request',
      'requestBody',
      'params',
    ]) {
      expect(bannedKey in redacted).toBe(false);
    }
  });
});

describe('audit redactRawArgs 嵌套递归脱敏（基线 27、38 行）', () => {
  it('嵌套对象内的原始入参类键被递归剔除，安全字段保留（27 行分支）', () => {
    const redacted = redactRawArgs({
      summary: '嵌套结构脱敏',
      note: {
        nested: { params: { q: '敏感参数' }, keep: '保留字段' },
        meta: { request: { id: 1 }, safe: '保留元数据' },
      },
    });

    const note = redacted.note as Record<string, unknown>;
    const nested = note.nested as Record<string, unknown>;
    expect(nested.keep).toBe('保留字段');
    expect('params' in nested).toBe(false);

    const meta = note.meta as Record<string, unknown>;
    expect(meta.safe).toBe('保留元数据');
    expect('request' in meta).toBe(false);
  });

  it('数组元素为对象时递归脱敏，嵌套数组内对象同样剔除原始入参类键（38 行分支）', () => {
    const redacted = redactRawArgs({
      records: [
        { request: { y: 2 }, keep: '对象安全字段' },
        [['z', { body: 1, keep: '数组内安全字段' }]],
      ],
    });

    const records = redacted.records as (Record<string, unknown> | unknown[])[];
    const first = records[0] as Record<string, unknown>;
    expect(first.keep).toBe('对象安全字段');
    expect('request' in first).toBe(false);

    const nestedArray = records[1] as unknown[];
    const inner = nestedArray[0] as unknown[];
    expect(inner[0]).toBe('z');
    const innerObject = inner[1] as Record<string, unknown>;
    expect(innerObject.keep).toBe('数组内安全字段');
    expect('body' in innerObject).toBe(false);
  });
});

describe('audit createAuditEntry 条目构造与默认值', () => {
  it('未提供工具字段时默认 null；threadId / actorRole / action / traceId 原样透传', () => {
    const entry = createAuditEntry({
      threadId: 'thread-audit-1',
      actorRole: 'doctor',
      action: 'doctor_draft',
      traceId: 'trace-audit-1',
    });

    expect(entry.threadId).toBe('thread-audit-1');
    expect(entry.actorRole).toBe('doctor');
    expect(entry.action).toBe('doctor_draft');
    expect(entry.traceId).toBe('trace-audit-1');
    expect(entry.toolName).toBeNull();
    expect(entry.toolStatus).toBeNull();
    expect(entry.durationMs).toBeNull();
    expect(entry.evidenceCount).toBeNull();
    expect(entry.errorClass).toBeNull();
    expect(entry.id).toMatch(/^audit_/);
    expect(entry.createdAt).toBeTruthy();
    expect(entry.detail).toEqual({});
  });

  it('detail 先经脱敏再落条目；原始入参明文不进入序列化结果', () => {
    const entry = createAuditEntry({
      threadId: 'thread-audit-2',
      actorRole: 'system',
      action: 'tool_call:lookupDrug',
      traceId: 'trace-audit-2',
      toolName: 'lookupDrug',
      toolStatus: 'success',
      durationMs: 12,
      evidenceCount: 2,
      errorClass: null,
      detail: {
        summary: '命中 1 条说明书',
        args: { drugName: '布洛芬' },
        raw: { userId: 'u-secret' },
      },
    });

    expect(entry.toolName).toBe('lookupDrug');
    expect(entry.toolStatus).toBe('success');
    expect(entry.durationMs).toBe(12);
    expect(entry.evidenceCount).toBe(2);
    expect(entry.detail.summary).toBe('命中 1 条说明书');
    expect('args' in entry.detail).toBe(false);
    expect('raw' in entry.detail).toBe(false);
    expect(JSON.stringify(entry.detail)).not.toContain('u-secret');
  });
});

describe('audit createToolCallRecord 工具调用记录构造', () => {
  it('callId / name / status / durationMs / evidenceCount / errorClass / summary 字段一一映射', () => {
    const record = createToolCallRecord({
      callId: 'call-001',
      name: 'lookupDrug',
      status: 'success',
      durationMs: 9,
      evidenceCount: 1,
      errorClass: null,
      summary: '命中说明书摘要',
    });

    expect(record.callId).toBe('call-001');
    expect(record.name).toBe('lookupDrug');
    expect(record.status).toBe('success');
    expect(record.durationMs).toBe(9);
    expect(record.evidenceCount).toBe(1);
    expect(record.errorClass).toBeNull();
    expect(record.summary).toBe('命中说明书摘要');
  });

  it('失败记录允许 errorClass 与 summary 为 null 之外的错误分类落痕', () => {
    const record = createToolCallRecord({
      callId: 'call-002',
      name: 'unknownTool',
      status: 'error',
      durationMs: 1,
      evidenceCount: 0,
      errorClass: 'ToolNotFound',
      summary: null,
    });

    expect(record.status).toBe('error');
    expect(record.errorClass).toBe('ToolNotFound');
    expect(record.summary).toBeNull();
    expect(record.evidenceCount).toBe(0);
  });
});
