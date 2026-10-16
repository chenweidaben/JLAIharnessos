/**
 * 健澜科技 jlmedaios - 区块链纯函数单测（M196-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildBlockchainReport,
  hashData,
  verifyOnChain,
} from '../../src/bff/aggregators/blockchainAggregator';

describe('hashData', () => {
  it('生成 0x 开头哈希', () => {
    const h = hashData('test-data');
    expect(h.startsWith('0x')).toBe(true);
  });

  it('相同输入 → 相同哈希', () => {
    expect(hashData('abc')).toBe(hashData('abc'));
  });
});

describe('verifyOnChain', () => {
  it('有效哈希 → true', () => {
    expect(verifyOnChain('0x12345678')).toBe(true);
  });

  it('无效哈希 → false', () => {
    expect(verifyOnChain('invalid')).toBe(false);
  });
});

describe('buildBlockchainReport', () => {
  it('生成网络数据', () => {
    const r = buildBlockchainReport('30d');
    expect(r.network.nodes).toBeGreaterThan(0);
  });

  it('生成处方上链', () => {
    const r = buildBlockchainReport('30d');
    expect(r.prescriptionOnChain.count).toBeGreaterThan(0);
  });

  it('生成药品溯源', () => {
    const r = buildBlockchainReport('30d');
    expect(r.drugTrace.batches).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildBlockchainReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
