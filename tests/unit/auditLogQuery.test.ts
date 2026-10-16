/**
 * 健澜科技 jlmedaios - 审计日志查询纯函数单测（M183-D）
 *
 * 覆盖：queryAuditLog（分页边界、筛选、IP 脱敏、空集、越界页）、
 *       maskIp（IPv4 打码、空值、非 IPv4）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  maskIp,
  queryAuditLog,
  type AuditLogRow,
} from '../../src/bff/aggregators/auditLogQueryAggregator';

function makeLogs(n: number): AuditLogRow[] {
  return Array.from({ length: n }, (_, i) => ({
    seq: n - i,
    actorName: `user${i}`,
    actorRole: i % 2 === 0 ? 'doctor' : 'admin',
    action: ['login', 'read', 'write', 'export'][i % 4],
    resourceType: 'patient',
    result: ['success', 'success', 'denied'][i % 3],
    riskLevel: ['low', 'medium', 'high', null][i % 4],
    clientIp: `10.0.${(i % 3) + 1}.${(i % 50) + 1}`,
    userAgent: 'test-agent',
    hospitalId: i % 2 === 0 ? 'hospital-a' : 'hospital-b',
    createdAt: new Date(Date.now() - i * 1000).toISOString(),
  }));
}

describe('queryAuditLog 分页边界', () => {
  it('第1页返回 pageSize 条', () => {
    const logs = makeLogs(25);
    const result = queryAuditLog(logs, { page: 1, pageSize: 10 });
    expect(result.rows.length).toBe(10);
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
  });

  it('最后一页返回剩余条数', () => {
    const logs = makeLogs(25);
    const result = queryAuditLog(logs, { page: 3, pageSize: 10 });
    expect(result.rows.length).toBe(5);
    expect(result.page).toBe(3);
  });

  it('越界页被钳制到最后一页', () => {
    const logs = makeLogs(25);
    const result = queryAuditLog(logs, { page: 999, pageSize: 10 });
    expect(result.page).toBe(3);
    expect(result.rows.length).toBe(5);
  });

  it('空集返回空行', () => {
    const result = queryAuditLog([], { page: 1, pageSize: 20 });
    expect(result.rows).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
  });
});

describe('queryAuditLog 筛选', () => {
  it('按 action 筛选', () => {
    const logs = makeLogs(20);
    const result = queryAuditLog(logs, { page: 1, pageSize: 50, action: 'login' });
    expect(result.total).toBe(5); // i%4==0 → 0,4,8,12,16
  });

  it('按 result=denied 筛选', () => {
    const logs = makeLogs(20);
    const result = queryAuditLog(logs, { page: 1, pageSize: 50, result: 'denied' });
    expect(result.total).toBe(6); // i%3==2 → 2,5,8,11,14,17（n=20）
  });

  it('按 hospitalId 筛选', () => {
    const logs = makeLogs(20);
    const result = queryAuditLog(logs, { page: 1, pageSize: 50, hospitalId: 'hospital-a' });
    expect(result.total).toBe(10);
  });

  it('按 keyword 模糊匹配操作人', () => {
    const logs = makeLogs(10);
    const result = queryAuditLog(logs, { page: 1, pageSize: 50, keyword: 'user5' });
    expect(result.total).toBe(1);
  });
});

describe('queryAuditLog 脱敏', () => {
  it('返回的 clientIp 末两段被打码', () => {
    const logs = makeLogs(3);
    const result = queryAuditLog(logs, { page: 1, pageSize: 10 });
    for (const r of result.rows) {
      expect(r.clientIp).toMatch(/^\d+\.\d+\.x\.x$/);
    }
  });
});

describe('maskIp', () => {
  it('IPv4 末两段打码', () => {
    expect(maskIp('192.168.1.100')).toBe('192.168.x.x');
  });

  it('空值返回 null', () => {
    expect(maskIp(null)).toBeNull();
    expect(maskIp('')).toBeNull();
  });

  it('非 IPv4 原样返回', () => {
    expect(maskIp('::1')).toBe('::1');
  });
});
