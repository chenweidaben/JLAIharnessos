/**
 * 健澜科技 jlmedaios - M123-A 数据访问审计日志单测
 *
 * 验证「构造日志 -> 条件筛选 -> 出参脱敏」闭环：
 *  - 日志记录：logDataAccess 七参数归一（trim / 默认值 / id 占位 / ISO 时间）；
 *  - 筛选查询：员工 / 动作 / 资源类型 / 患者号 / 时间窗口过滤，空条件返回全量倒序，
 *    非法入参安全兜底；
 *  - 数据脱敏：maskDataAccessLog 对患者号中段、IP 末两段打码，短号段兜底。
 * 全部为纯函数断言，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  logDataAccess,
  maskDataAccessLog,
  maskIp,
  maskPatientId,
  queryAuditLogs,
  type DataAccessLog,
} from '../../src/bff/aggregators/auditLogAggregator';

/** 构造一条审计日志的快捷函数 */
const rec = (over: Partial<DataAccessLog>): DataAccessLog => ({
  id: 1,
  staffId: 'D001',
  staffRole: 'doctor',
  action: 'view',
  resourceType: 'emr',
  resourceId: 'MR-100',
  patientId: 'PAT-10001',
  accessedAt: '2026-10-16T08:00:00.000Z',
  ipAddress: '10.20.30.40',
  ...over,
});

describe('M123-A 数据访问审计日志', () => {
  it('日志记录：七参数归一，trim 去空白，id 占位 0，时间为合法 ISO', () => {
    const log = logDataAccess(
      ' D002 ',
      ' nurse ',
      ' view ',
      ' emr ',
      ' MR-200 ',
      ' PAT-20002 ',
      ' 10.20.30.41 ',
    );
    expect(log.staffId).toBe('D002');
    expect(log.staffRole).toBe('nurse');
    expect(log.action).toBe('view');
    expect(log.resourceType).toBe('emr');
    expect(log.resourceId).toBe('MR-200');
    expect(log.patientId).toBe('PAT-20002');
    expect(log.ipAddress).toBe('10.20.30.41');
    // 生产安全加固：应用层不自造主键，由数据库 bigserial 分配
    expect(log.id).toBe(0);
    expect(() => new Date(log.accessedAt).toISOString()).not.toThrow();
  });

  it('日志记录：空入参兜底为空字符串，不抛错', () => {
    const log = logDataAccess('', '', '', '', '', '', '');
    expect(log.staffId).toBe('');
    expect(log.patientId).toBe('');
    expect(log.ipAddress).toBe('');
  });

  it('筛选查询：按员工工号精确命中（大小写不敏感）', () => {
    const list = [
      rec({ id: 1, staffId: 'D001' }),
      rec({ id: 2, staffId: 'N009' }),
      rec({ id: 3, staffId: 'd001', action: 'export' }),
    ];
    const r = queryAuditLogs({ staffId: 'd001' }, list);
    expect(r).toHaveLength(2);
    expect(r.every((l) => l.staffId.toLowerCase() === 'd001')).toBe(true);
  });

  it('筛选查询：动作 / 资源类型 / 患者号组合过滤', () => {
    const list = [
      rec({ id: 1, action: 'view', resourceType: 'emr' }),
      rec({ id: 2, action: 'export', resourceType: 'emr' }),
      rec({ id: 3, action: 'export', resourceType: 'prescription', patientId: 'PAT-9' }),
    ];
    const r = queryAuditLogs({ action: 'export', resourceType: 'emr' }, list);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(2);
    const byPatient = queryAuditLogs({ patientId: 'pat-9' }, list);
    expect(byPatient).toHaveLength(1);
    expect(byPatient[0].resourceType).toBe('prescription');
  });

  it('筛选查询：时间窗口闭区间过滤并按时间倒序', () => {
    const list = [
      rec({ id: 1, accessedAt: '2026-10-15T08:00:00.000Z' }),
      rec({ id: 2, accessedAt: '2026-10-16T08:00:00.000Z' }),
      rec({ id: 3, accessedAt: '2026-10-17T08:00:00.000Z' }),
    ];
    const r = queryAuditLogs(
      { startTime: '2026-10-15T00:00:00.000Z', endTime: '2026-10-16T23:59:59.000Z' },
      list,
    );
    expect(r.map((l) => l.id)).toEqual([2, 1]); // 倒序：16 日在前
  });

  it('筛选查询：空条件返回全量并倒序；非法入参安全兜底', () => {
    const list = [
      rec({ id: 1, accessedAt: '2026-10-15T08:00:00.000Z' }),
      rec({ id: 2, accessedAt: '2026-10-17T08:00:00.000Z' }),
    ];
    expect(queryAuditLogs({}, list)).toHaveLength(2);
    expect(queryAuditLogs({}, list)[0].id).toBe(2);
    // 非数组 / null filters 不抛错
    expect(queryAuditLogs({}, null as unknown as DataAccessLog[])).toEqual([]);
    expect(queryAuditLogs(null as unknown as never, [])).toEqual([]);
  });

  it('数据脱敏：患者号保留前后段、中段打码；短号段兜底', () => {
    expect(maskPatientId('PAT-10001')).toBe('PAT***01');
    expect(maskPatientId('AB12')).toBe('A***');
    expect(maskPatientId('')).toBe('');
  });

  it('数据脱敏：IPv4 末两段打码；非 IPv4 原样返回', () => {
    expect(maskIp('10.20.30.40')).toBe('10.20.*.*');
    expect(maskIp('2001:db8::1')).toBe('2001:db8::1');
    expect(maskIp('')).toBe('');
  });

  it('数据脱敏：出参脱敏不改其他字段，明文患者号与 IP 不回传', () => {
    const masked = maskDataAccessLog(rec({}));
    expect(masked.patientId).toBe('PAT***01');
    expect(masked.ipAddress).toBe('10.20.*.*');
    // 其余字段原样保留
    expect(masked.staffId).toBe('D001');
    expect(masked.action).toBe('view');
    expect(masked.resourceId).toBe('MR-100');
  });
});
