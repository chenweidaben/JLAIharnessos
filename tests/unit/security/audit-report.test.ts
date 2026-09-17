/**
 * 健澜科技数智医院智能体 - 审计报告生成器单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, expect, test } from 'bun:test';
import {
  AuditReportGenerator,
} from '../../../src/security';
import {
  AuditLogEntry,
  AuditLogType,
  AuditLogLevel,
  AuditResult,
  RiskLevel,
} from '../../../src/security';

/**
 * 构造一条最小审计日志
 */
function makeEntry(partial: Partial<AuditLogEntry> & { operationAction: string }): AuditLogEntry {
  return {
    logId: partial.logId ?? `log-${Math.random().toString(36).slice(2)}`,
    logType: partial.logType ?? AuditLogType.OPERATION,
    level: partial.level ?? AuditLogLevel.INFO,
    timestamp: partial.timestamp ?? '2026-09-16T10:00:00.000Z',
    timestampReceived: partial.timestampReceived ?? '2026-09-16T10:00:00.000Z',
    userId: partial.userId ?? 'u001',
    userName: partial.userName ?? '张三',
    userRole: partial.userRole ?? 'attending',
    userDepartment: partial.userDepartment ?? '心内科',
    sessionId: partial.sessionId ?? 'sess-1',
    clientIp: partial.clientIp ?? '10.0.0.1',
    operationType: partial.operationType ?? 'op',
    operationModule: partial.operationModule ?? 'emr',
    operationAction: partial.operationAction,
    operationObject: partial.operationObject ?? 'P001',
    operationObjectType: partial.operationObjectType ?? 'patient',
    result: partial.result ?? AuditResult.SUCCESS,
    riskLevel: partial.riskLevel,
    logHash: partial.logHash ?? 'hash',
    prevLogHash: partial.prevLogHash ?? 'prev',
  } as AuditLogEntry;
}

describe('AuditReportGenerator', () => {
  test('按用户聚合操作统计', () => {
    const entries = [
      makeEntry({ userId: 'u001', userName: '张三', userDepartment: '心内科', operationAction: 'EMR_READ' }),
      makeEntry({ userId: 'u001', userName: '张三', userDepartment: '心内科', operationAction: 'EMR_WRITE', riskLevel: RiskLevel.HIGH }),
      makeEntry({ userId: 'u002', userName: '李四', userDepartment: '骨科', operationAction: 'EMR_DELETE', result: AuditResult.DENIED }),
    ];
    const gen = new AuditReportGenerator(entries);
    const stats = gen.generateOperationReport();
    const zhang = stats.find((s) => s.userId === 'u001')!;
    expect(zhang.totalOperations).toBe(2);
    expect(zhang.highRiskOperations).toBe(1);

    const ortho = gen.generateOperationReport({ department: '骨科' });
    expect(ortho.length).toBe(1);
    expect(ortho[0].deniedOperations).toBe(1);
  });

  test('电子病历评级报告覆盖读写删签', () => {
    const entries = [
      makeEntry({ operationAction: 'EMR_READ' }),
      makeEntry({ operationAction: 'EMR_WRITE' }),
      makeEntry({ operationAction: 'EMR_DELETE' }),
      makeEntry({ operationAction: 'EMR_SIGN' }),
    ];
    const gen = new AuditReportGenerator(entries);
    const report = gen.generateEmrRatingReport();
    expect(report.readOps).toBe(1);
    expect(report.writeOps).toBeGreaterThanOrEqual(1);
    expect(report.deleteOps).toBe(1);
    expect(report.signedOps).toBe(1);
  });

  test('检测高频登录失败异常', () => {
    const entries = Array.from({ length: 6 }, () =>
      makeEntry({ userId: 'attacker', operationAction: 'AUTH_LOGIN_FAILURE', result: AuditResult.FAILURE }),
    );
    const gen = new AuditReportGenerator(entries);
    const anomalies = gen.detectAnomalies({ failedLoginPerUser: 5 });
    const brute = anomalies.find((a) => a.type === '高频登录失败');
    expect(brute).toBeDefined();
    expect(brute!.severity).toBe(RiskLevel.CRITICAL);
  });

  test('检测越权访问', () => {
    const entries = Array.from({ length: 3 }, () =>
      makeEntry({ userId: 'guest', operationAction: 'SEC_UNAUTHORIZED_ACCESS', result: AuditResult.DENIED }),
    );
    const gen = new AuditReportGenerator(entries);
    const anomalies = gen.detectAnomalies();
    expect(anomalies.find((a) => a.type === '越权访问尝试')).toBeDefined();
  });

  test('正常操作无异常', () => {
    const entries = [
      makeEntry({ operationAction: 'EMR_READ' }),
      makeEntry({ operationAction: 'OP_PATIENT_QUERY' }),
    ];
    const gen = new AuditReportGenerator(entries);
    const anomalies = gen.detectAnomalies();
    expect(anomalies.length).toBe(0);
  });

  test('生成等保合规审计报告Markdown', () => {
    const entries = [
      makeEntry({ operationAction: 'EMR_READ', riskLevel: RiskLevel.LOW }),
      makeEntry({ operationAction: 'AUTH_LOGIN', logType: AuditLogType.AUTH }),
    ];
    const gen = new AuditReportGenerator(entries);
    const md = gen.generateComplianceReport();
    expect(md).toContain('等保三级审计日志合规报告');
    expect(gen.toJson()).toContain('anomalies');
  });
});
