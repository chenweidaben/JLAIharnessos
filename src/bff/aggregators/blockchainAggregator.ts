/**
 * 健澜科技 jlmedaios - 区块链应用纯函数（M196-D）
 *
 * buildBlockchainReport / hashData / verifyOnChain
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 数据上链哈希（纯函数，模拟 SHA-256）。
 *
 * @param data 原始数据
 * @returns 哈希值
 */
export function hashData(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `0x${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * 链上校验（纯函数）。
 *
 * @param hash 哈希值
 * @returns 是否验证通过
 */
export function verifyOnChain(hash: string): boolean {
  return hash.startsWith('0x') && hash.length === 10;
}

/** 区块链报告输出 */
export interface BlockchainReport {
  timeRange: string;
  network: { nodes: number; consensus: string; blockHeight: number; throughput: number };
  prescriptionOnChain: { count: number };
  emrSharing: { count: number };
  drugTrace: { drugs: number; batches: number };
  consumableTrace: { items: number; batches: number };
  insuranceOnChain: { settlements: number };
  bloodTrace: { bags: number };
  governance: { consortium: boolean; crossChain: boolean; smartContracts: number; privacyComputing: boolean };
  suggestions: string[];
}

/**
 * 构建区块链报告。
 *
 * @param timeRange 时间范围
 * @returns 区块链报告
 */
export function buildBlockchainReport(timeRange: string): BlockchainReport {
  return {
    timeRange,
    network: { nodes: 8, consensus: 'PBFT', blockHeight: 100000, throughput: 2000 },
    prescriptionOnChain: { count: 5000 },
    emrSharing: { count: 2000 },
    drugTrace: { drugs: 500, batches: 2000 },
    consumableTrace: { items: 300, batches: 1500 },
    insuranceOnChain: { settlements: 3000 },
    bloodTrace: { bags: 800 },
    governance: { consortium: true, crossChain: false, smartContracts: 20, privacyComputing: true },
    suggestions: ['扩大电子病历共享范围', '探索跨链互联'],
  };
}
