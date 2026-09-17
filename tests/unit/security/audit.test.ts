/**
 * 健澜科技数智医院智能体 - 审计日志单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AuditLogger,
  AuditEventType,
  AuditLogType,
  AuditLogLevel,
  AuditResult,
  RiskLevel,
  LogIntegrityManager,
  MemoryLogStorage,
  FileLogStorage,
  type LogContext,
} from '../../../src/security';

const TEST_LOG_DIR = path.join(__dirname, 'test-logs');

describe('AuditEvent', () => {
  test('审计事件类型数量充足', () => {
    const eventCount = Object.keys(AuditEventType).length;
    expect(eventCount).toBeGreaterThan(50);
  });

  test('登录成功事件元数据正确', () => {
    const { getAuditEventMetadata } = require('../../../src/security');
    const metadata = getAuditEventMetadata(AuditEventType.LOGIN_SUCCESS);
    expect(metadata.logType).toBe(AuditLogType.AUTH);
    expect(metadata.defaultLevel).toBe('INFO');
  });

  test('SQL注入检测事件为CRITICAL级别', () => {
    const { getAuditEventMetadata } = require('../../../src/security');
    const metadata = getAuditEventMetadata(AuditEventType.SQL_INJECTION_DETECTED);
    expect(metadata.logType).toBe(AuditLogType.SECURITY);
    expect(metadata.defaultLevel).toBe('CRITICAL');
  });

  test('处方开具事件为高风险', () => {
    const { getAuditEventMetadata } = require('../../../src/security');
    const metadata = getAuditEventMetadata(AuditEventType.PRESCRIPTION_CREATE);
    expect(metadata.defaultRiskLevel).toBe('high');
  });
});

describe('LogIntegrityManager', () => {
  test('哈希链：第一条日志prevHash为全零', () => {
    const manager = new LogIntegrityManager();
    const entry = manager.sealLogEntry({
      logId: 'log-001',
      logType: AuditLogType.AUTH,
      level: AuditLogLevel.INFO,
      timestamp: new Date().toISOString(),
      timestampReceived: new Date().toISOString(),
      userId: 'user-001',
      userName: '测试用户',
      userRole: '主治医师',
      userDepartment: '心内科',
      sessionId: 'sess-001',
      clientIp: '10.0.0.1',
      operationType: 'TEST',
      operationModule: 'test',
      operationAction: 'test_action',
      operationObject: 'obj-001',
      operationObjectType: 'test',
      result: AuditResult.SUCCESS,
    });
    expect(entry.prevLogHash).toBe('0'.repeat(64));
    expect(entry.logHash).toBeDefined();
    expect(entry.logHash.length).toBe(64);
  });

  test('哈希链：后续日志prevHash等于前一条logHash', () => {
    const manager = new LogIntegrityManager();
    const baseEntry = {
      logType: AuditLogType.AUTH,
      level: AuditLogLevel.INFO,
      timestamp: new Date().toISOString(),
      timestampReceived: new Date().toISOString(),
      userId: 'user-001',
      userName: '测试用户',
      userRole: '主治医师',
      userDepartment: '心内科',
      sessionId: 'sess-001',
      clientIp: '10.0.0.1',
      operationType: 'TEST',
      operationModule: 'test',
      operationAction: 'test_action',
      operationObject: 'obj-001',
      operationObjectType: 'test',
      result: AuditResult.SUCCESS,
    };

    const entry1 = manager.sealLogEntry({ ...baseEntry, logId: 'log-001' });
    const entry2 = manager.sealLogEntry({ ...baseEntry, logId: 'log-002' });
    expect(entry2.prevLogHash).toBe(entry1.logHash);
  });

  test('哈希链验证：完整链验证通过', () => {
    const manager = new LogIntegrityManager();
    const baseEntry = {
      logType: AuditLogType.AUTH,
      level: AuditLogLevel.INFO,
      timestamp: new Date().toISOString(),
      timestampReceived: new Date().toISOString(),
      userId: 'user-001',
      userName: '测试用户',
      userRole: '主治医师',
      userDepartment: '心内科',
      sessionId: 'sess-001',
      clientIp: '10.0.0.1',
      operationType: 'TEST',
      operationModule: 'test',
      operationAction: 'test_action',
      operationObject: 'obj-001',
      operationObjectType: 'test',
      result: AuditResult.SUCCESS,
    };

    const entries = [];
    for (let i = 0; i < 5; i++) {
      entries.push(manager.sealLogEntry({ ...baseEntry, logId: `log-${i}` }));
    }
    const result = manager.verifyLogChain(entries);
    expect(result.valid).toBe(true);
    expect(result.verifiedCount).toBe(5);
  });

  test('哈希链验证：篡改日志导致验证失败', () => {
    const manager = new LogIntegrityManager();
    const baseEntry = {
      logType: AuditLogType.AUTH,
      level: AuditLogLevel.INFO,
      timestamp: new Date().toISOString(),
      timestampReceived: new Date().toISOString(),
      userId: 'user-001',
      userName: '测试用户',
      userRole: '主治医师',
      userDepartment: '心内科',
      sessionId: 'sess-001',
      clientIp: '10.0.0.1',
      operationType: 'TEST',
      operationModule: 'test',
      operationAction: 'test_action',
      operationObject: 'obj-001',
      operationObjectType: 'test',
      result: AuditResult.SUCCESS,
    };

    const entries = [];
    for (let i = 0; i < 3; i++) {
      entries.push(manager.sealLogEntry({ ...baseEntry, logId: `log-${i}` }));
    }
    // 篡改第二条日志的userId
    entries[1].userId = 'hacker';
    const result = manager.verifyLogChain(entries);
    expect(result.valid).toBe(false);
    expect(result.firstInvalidIndex).toBe(1);
  });

  test('每日根哈希计算', () => {
    const manager = new LogIntegrityManager();
    const baseEntry = {
      logType: AuditLogType.AUTH,
      level: AuditLogLevel.INFO,
      timestamp: new Date().toISOString(),
      timestampReceived: new Date().toISOString(),
      userId: 'user-001',
      userName: '测试用户',
      userRole: '主治医师',
      userDepartment: '心内科',
      sessionId: 'sess-001',
      clientIp: '10.0.0.1',
      operationType: 'TEST',
      operationModule: 'test',
      operationAction: 'test_action',
      operationObject: 'obj-001',
      operationObjectType: 'test',
      result: AuditResult.SUCCESS,
    };
    const entries = [];
    for (let i = 0; i < 4; i++) {
      entries.push(manager.sealLogEntry({ ...baseEntry, logId: `log-${i}` }));
    }
    const rootHash = manager.computeDailyRootHash(entries);
    expect(rootHash).toBeDefined();
    expect(rootHash.length).toBe(64);
  });
});

describe('MemoryLogStorage', () => {
  test('写入和读取日志', async () => {
    const storage = new MemoryLogStorage();
    const entry = {
      logId: 'log-001',
      logType: AuditLogType.AUTH,
      level: AuditLogLevel.INFO,
      timestamp: new Date().toISOString(),
      timestampReceived: new Date().toISOString(),
      userId: 'user-001',
      userName: '测试用户',
      userRole: '主治医师',
      userDepartment: '心内科',
      sessionId: 'sess-001',
      clientIp: '10.0.0.1',
      operationType: 'TEST',
      operationModule: 'test',
      operationAction: 'test',
      operationObject: 'obj-001',
      operationObjectType: 'test',
      result: AuditResult.SUCCESS,
      logHash: 'hash1',
      prevLogHash: '0',
    };
    await storage.write(entry);
    const all = storage.getAll();
    expect(all.length).toBe(1);
    expect(all[0].logId).toBe('log-001');
  });

  test('按用户ID过滤', async () => {
    const storage = new MemoryLogStorage();
    const baseEntry = {
      logType: AuditLogType.AUTH,
      level: AuditLogLevel.INFO,
      timestamp: new Date().toISOString(),
      timestampReceived: new Date().toISOString(),
      userName: '测试',
      userRole: '主治医师',
      userDepartment: '心内科',
      sessionId: 'sess-001',
      clientIp: '10.0.0.1',
      operationType: 'TEST',
      operationModule: 'test',
      operationAction: 'test',
      operationObject: 'obj',
      operationObjectType: 'test',
      result: AuditResult.SUCCESS,
      logHash: 'hash',
      prevLogHash: '0',
    };
    await storage.write({ ...baseEntry, logId: '1', userId: 'user-A' });
    await storage.write({ ...baseEntry, logId: '2', userId: 'user-B' });
    const results = await storage.read({ userId: 'user-A' });
    expect(results.length).toBe(1);
    expect(results[0].userId).toBe('user-A');
  });
});

describe('AuditLogger', () => {
  const testContext: LogContext = {
    userId: 'doc-001',
    userName: '张医生',
    userRole: '主治医师',
    userDepartment: '心内科',
    sessionId: 'sess-test-001',
    clientIp: '10.0.1.50',
  };

  test('记录登录成功日志', async () => {
    const storage = new MemoryLogStorage();
    const logger = new AuditLogger({ storage, asyncWrite: false });
    logger.setContext(testContext);
    await logger.logSync(AuditEventType.LOGIN_SUCCESS);
    const logs = storage.getAll();
    expect(logs.length).toBe(1);
    expect(logs[0].logType).toBe(AuditLogType.AUTH);
    expect(logs[0].userId).toBe('doc-001');
  });

  test('记录患者查询日志', async () => {
    const storage = new MemoryLogStorage();
    const logger = new AuditLogger({ storage, asyncWrite: false });
    logger.setContext(testContext);
    await logger.logSync(AuditEventType.PATIENT_READ, {
      operationObject: 'P-2026-001234',
      operationObjectType: 'patient',
      patientId: 'P-2026-001234',
    });
    const logs = storage.getAll();
    expect(logs.length).toBe(1);
    expect(logs[0].logType).toBe(AuditLogType.DATA_ACCESS);
    expect(logs[0].operationObject).toBe('P-2026-001234');
  });

  test('记录处方开具日志（高风险）', async () => {
    const storage = new MemoryLogStorage();
    const logger = new AuditLogger({ storage, asyncWrite: false });
    logger.setContext(testContext);
    await logger.logSync(AuditEventType.PRESCRIPTION_CREATE, {
      operationObject: 'RX-001',
      parameters: { drug: '阿司匹林', dose: '100mg' },
    });
    const logs = storage.getAll();
    expect(logs[0].riskLevel).toBe(RiskLevel.HIGH);
  });

  test('日志包含哈希链字段', async () => {
    const storage = new MemoryLogStorage();
    const logger = new AuditLogger({ storage, asyncWrite: false, enableIntegrity: true });
    logger.setContext(testContext);
    await logger.logSync(AuditEventType.LOGIN_SUCCESS);
    await logger.logSync(AuditEventType.PATIENT_READ, { operationObject: 'P-001' });
    const logs = storage.getAll();
    expect(logs[0].logHash).toBeDefined();
    expect(logs[0].prevLogHash).toBe('0'.repeat(64));
    expect(logs[1].prevLogHash).toBe(logs[0].logHash);
  });

  test('未设置上下文时抛出错误', () => {
    const logger = new AuditLogger({ storage: new MemoryLogStorage() });
    expect(() => logger.log(AuditEventType.LOGIN_SUCCESS)).toThrow();
  });

  test('日志级别过滤：低于minLevel的日志不记录', async () => {
    const storage = new MemoryLogStorage();
    const logger = new AuditLogger({
      storage,
      asyncWrite: false,
      minLevel: AuditLogLevel.ERROR,
    });
    logger.setContext(testContext);
    await logger.logSync(AuditEventType.LOGIN_SUCCESS); // INFO级别
    expect(storage.getAll().length).toBe(0);
  });

  test('异步写入日志', (done) => {
    const storage = new MemoryLogStorage();
    const logger = new AuditLogger({ storage, asyncWrite: true });
    logger.setContext(testContext);
    logger.log(AuditEventType.LOGIN_SUCCESS);
    // 异步写入需要一点时间
    setTimeout(() => {
      expect(storage.getAll().length).toBe(1);
      done();
    }, 100);
  });
});

describe('FileLogStorage', () => {
  beforeAll(() => {
    if (!fs.existsSync(TEST_LOG_DIR)) {
      fs.mkdirSync(TEST_LOG_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // 清理测试日志
    if (fs.existsSync(TEST_LOG_DIR)) {
      fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
    }
  });

  test('文件存储写入和读取', async () => {
    const storage = new FileLogStorage({
      storagePath: TEST_LOG_DIR,
      rotationPolicy: 'date',
    });
    const entry = {
      logId: 'file-log-001',
      logType: AuditLogType.AUTH,
      level: AuditLogLevel.INFO,
      timestamp: new Date().toISOString(),
      timestampReceived: new Date().toISOString(),
      userId: 'user-001',
      userName: '测试用户',
      userRole: '主治医师',
      userDepartment: '心内科',
      sessionId: 'sess-001',
      clientIp: '10.0.0.1',
      operationType: 'TEST',
      operationModule: 'test',
      operationAction: 'test',
      operationObject: 'obj-001',
      operationObjectType: 'test',
      result: AuditResult.SUCCESS,
      logHash: 'hash1',
      prevLogHash: '0',
    };
    await storage.write(entry);
    await storage.flush();
    const results = await storage.read({ limit: 10 });
    expect(results.length).toBeGreaterThan(0);
    await storage.close();
  });
});
