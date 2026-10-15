/**
 * 健澜科技 jlmedaios - M136-A 错误脱敏单测
 *
 * 覆盖：
 *  - sanitizeErrorForClient：生产/开发模式判断、5xx 兜底、401/403/404 保持明确；
 *  - 堆栈 / 物理路径 / SQL / 内网 IP 剥离；
 *  - runErrorMaskingSelfTest：代表性样本在生产模式下全绿。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  hasInternalDetail,
  PROD_FALLBACK_MESSAGE,
  runErrorMaskingSelfTest,
  sanitizeErrorForClient,
} from '../../src/bff/aggregators/errorSanitizerAggregator';

/* ------------------------------------------------------------------ */
/* 生产模式：5xx 统一兜底，不泄露                                       */
/* ------------------------------------------------------------------ */

describe('sanitizeErrorForClient - 生产模式 5xx 兜底', () => {
  it('含堆栈/路径/SQL/内网IP 的数据库错误，生产下统一返回兜底文案', () => {
    const err = new Error(
      "connect ECONNREFUSED 10.0.0.8:5432\n at Query (C:\\app\\src\\db.ts:44:11)\n SELECT * FROM patients WHERE id='1'",
    );
    const out = sanitizeErrorForClient(err, true);
    expect(out.status).toBe(500);
    expect(out.code).toBe(50000);
    expect(out.message).toBe(PROD_FALLBACK_MESSAGE);
    expect(out.exposed).toBe(false);
    // serverDetail 仍保留原始信息供日志
    expect(out.serverDetail).toContain('ECONNREFUSED');
    expect(out.serverDetail).toContain('SELECT');
  });

  it('TypeError 空指针在生产下也兜底', () => {
    const err = new TypeError("Cannot read property 'name' of undefined at /app/src/routes/x.ts:12:3");
    const out = sanitizeErrorForClient(err, true);
    expect(out.message).toBe(PROD_FALLBACK_MESSAGE);
    expect(out.exposed).toBe(false);
    // 客户端消息中不得出现物理路径或堆栈帧
    expect(out.message).not.toMatch(/[A-Za-z]:\\|\/app\//);
  });

  it('字符串异常在生产下也兜底', () => {
    const out = sanitizeErrorForClient('raw boom at /opt/service/internal.log', true);
    expect(out.message).toBe(PROD_FALLBACK_MESSAGE);
    expect(out.exposed).toBe(false);
  });

  it('null/undefined 异常在生产下兜底', () => {
    expect(sanitizeErrorForClient(null, true).message).toBe(PROD_FALLBACK_MESSAGE);
    expect(sanitizeErrorForClient(undefined, true).message).toBe(PROD_FALLBACK_MESSAGE);
  });
});

/* ------------------------------------------------------------------ */
/* 生产模式：401/403/404 保持明确语义                                  */
/* ------------------------------------------------------------------ */

describe('sanitizeErrorForClient - 4xx 保持明确', () => {
  it('401 未登录保持明确文案', () => {
    const err = Object.assign(new Error('jwt expired'), { status: 401, code: 40101 });
    const out = sanitizeErrorForClient(err, true);
    expect(out.status).toBe(401);
    expect(out.code).toBe(40101);
    expect(out.message).toBe('jwt expired');
  });

  it('403 无权限保持明确文案', () => {
    const err = Object.assign(new Error('admin role required'), { status: 403, code: 40300 });
    const out = sanitizeErrorForClient(err, true);
    expect(out.status).toBe(403);
    expect(out.message).toBe('admin role required');
  });

  it('404 资源不存在保持明确文案', () => {
    const err = Object.assign(new Error('patient not found'), { status: 404, code: 40400 });
    const out = sanitizeErrorForClient(err, true);
    expect(out.status).toBe(404);
    expect(out.message).toBe('patient not found');
  });

  it('4xx 原始 message 为空时给兜底文案', () => {
    const out = sanitizeErrorForClient(Object.assign(new Error(''), { status: 401 }), true);
    expect(out.message).toBe('未登录或登录已过期');
  });
});

/* ------------------------------------------------------------------ */
/* 开发模式：剥离细节但保留可读错误                                     */
/* ------------------------------------------------------------------ */

describe('sanitizeErrorForClient - 开发模式剥离堆栈', () => {
  it('开发态 5xx 不返回生产兜底文案，而是剥离后的可读错误', () => {
    const err = new Error(
      "connect ECONNREFUSED 10.0.0.8:5432\n at Query (C:\\app\\src\\db.ts:44:11)\n SELECT * FROM patients WHERE id='1'",
    );
    const out = sanitizeErrorForClient(err, false);
    // 不应是生产兜底文案
    expect(out.message).not.toBe(PROD_FALLBACK_MESSAGE);
    // 堆栈帧应被剥离
    expect(out.message).not.toMatch(/at\s+\w+\s*\(/);
    // 物理路径应被剥离
    expect(out.message).not.toMatch(/[A-Za-z]:\\/);
    expect(out.message).not.toMatch(/\/app\//);
    // SQL 片段应被剥离
    expect(out.message).not.toMatch(/\bSELECT\s+\w+/i);
    // 内网 IP 应被剥离
    expect(out.message).not.toMatch(/\b10\.0\.0\.8\b/);
  });
});

/* ------------------------------------------------------------------ */
/* hasInternalDetail 判据                                              */
/* ------------------------------------------------------------------ */

describe('hasInternalDetail 判据', () => {
  it('检测堆栈帧残留', () => {
    expect(hasInternalDetail('at Query (C:\\app\\db.ts:44:11)')).toBe(true);
  });
  it('检测物理路径残留', () => {
    expect(hasInternalDetail('/app/src/server.ts')).toBe(true);
    expect(hasInternalDetail('C:\\app\\src\\db.ts')).toBe(true);
  });
  it('检测 SQL 残留', () => {
    expect(hasInternalDetail('SELECT * FROM patients')).toBe(true);
  });
  it('检测内网 IP', () => {
    expect(hasInternalDetail('10.0.0.8')).toBe(true);
    expect(hasInternalDetail('192.168.1.10')).toBe(true);
  });
  it('干净文案返回 false', () => {
    expect(hasInternalDetail('系统繁忙，请稍后重试')).toBe(false);
    expect(hasInternalDetail('jwt expired')).toBe(false);
    expect(hasInternalDetail('')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* 自检：生产模式全绿                                                  */
/* ------------------------------------------------------------------ */

describe('runErrorMaskingSelfTest', () => {
  it('全部样本通过，生产模式无内部细节泄露', () => {
    const r = runErrorMaskingSelfTest();
    expect(r.green).toBe(true);
    expect(r.passed).toBe(r.total);
    // 至少包含 4xx 与 5xx 样本
    const statuses = r.samples.map((s) => s.status);
    expect(statuses).toContain(401);
    expect(statuses).toContain(403);
    expect(statuses).toContain(404);
    // 所有 5xx 样本的客户端文案都是统一兜底
    for (const s of r.samples) {
      if (s.status >= 500) {
        expect(s.prodMessage).toBe(PROD_FALLBACK_MESSAGE);
      }
      expect(s.exposed).toBe(false);
    }
  });
});
