/**
 * 健澜科技 jlmedaios - 区块链纯函数单测（M215-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildBlockchainReport,
  buildBlockchainTrace,
  validateSmartContract,
  type SmartContract,
} from '../../src/bff/aggregators/blockchainReportAggregator';

describe('buildBlockchainTrace', () => {
  it('64位哈希 → verified true', () => {
    const tx = 'a'.repeat(64);
    const r = buildBlockchainTrace(tx, 'medical-chain');
    expect(r.verified).toBe(true);
  });

  it('短哈希 → verified false', () => {
    const r = buildBlockchainTrace('abc', 'medical-chain');
    expect(r.verified).toBe(false);
  });
});

describe('validateSmartContract', () => {
  it('输入满足规则 → valid true', () => {
    const c: SmartContract = { address: '0x123', rules: ['age > 18'] };
    const r = validateSmartContract(c, { age: 25 });
    expect(r.valid).toBe(true);
  });

  it('输入不满足规则 → valid false', () => {
    const c: SmartContract = { address: '0x123', rules: ['age > 18'] };
    const r = validateSmartContract(c, { age: 15 });
    expect(r.valid).toBe(false);
  });
});

describe('buildBlockchainReport', () => {
  it('生成平台数据', () => {
    const r = buildBlockchainReport('30d');
    expect(r.platform.smartContract).toBeGreaterThan(0);
  });

  it('生成病历共享数据', () => {
    const r = buildBlockchainReport('30d');
    expect(r.eMRSharing.records).toBeGreaterThan(0);
  });

  it('生成药品溯源数据', () => {
    const r = buildBlockchainReport('30d');
    expect(r.drugTrace.drugs).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildBlockchainReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
