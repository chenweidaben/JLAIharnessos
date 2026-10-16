/**
 * 健澜科技 jlmedaios - 备份容灾纯函数单测（M184-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildBackupStrategy,
  calculateRTO_RPO,
  verifyBackupIntegrity,
} from '../../src/bff/aggregators/backupStrategyAggregator';

describe('buildBackupStrategy', () => {
  it('全量备份每日凌晨，保留7天', () => {
    const s = buildBackupStrategy();
    expect(s.fullBackup.schedule).toBe('0 2 * * *');
    expect(s.fullBackup.retentionDays).toBe(7);
  });

  it('增量备份每小时，保留24小时', () => {
    const s = buildBackupStrategy();
    expect(s.incrementalBackup.schedule).toBe('0 * * * *');
    expect(s.incrementalBackup.retentionHours).toBe(24);
  });

  it('异地容灾开启', () => {
    const s = buildBackupStrategy();
    expect(s.disasterRecovery.geoRedundancy).toBe(true);
  });
});

describe('verifyBackupIntegrity', () => {
  it('校验和一致且大小正常 → 有效', () => {
    const r = verifyBackupIntegrity('b1', 'abc', 'abc', 500 * 1024 * 1024, 100 * 1024 * 1024);
    expect(r.valid).toBe(true);
  });

  it('校验和不一致 → 无效', () => {
    const r = verifyBackupIntegrity('b1', 'abc', 'xyz', 500 * 1024 * 1024, 100 * 1024 * 1024);
    expect(r.valid).toBe(false);
    expect(r.checksumMatch).toBe(false);
  });

  it('文件过小 → 无效', () => {
    const r = verifyBackupIntegrity('b1', 'abc', 'abc', 10 * 1024 * 1024, 100 * 1024 * 1024);
    expect(r.valid).toBe(false);
    expect(r.sizeOk).toBe(false);
  });
});

describe('calculateRTO_RPO', () => {
  it('默认策略满足 HIPAA 和 HL7', () => {
    const s = buildBackupStrategy();
    const r = calculateRTO_RPO(s);
    expect(r.meetsHipaa).toBe(true);
    expect(r.meetsHl7).toBe(true);
  });

  it('RTO=1440分钟 不满足 HL7（≤240分钟）', () => {
    const s = buildBackupStrategy();
    s.disasterRecovery.rtoMinutes = 1440;
    const r = calculateRTO_RPO(s);
    expect(r.meetsHl7).toBe(false);
    expect(r.meetsHipaa).toBe(true);
  });
});
