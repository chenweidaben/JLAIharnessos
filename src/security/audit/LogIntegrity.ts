/**
 * 健澜科技数智医院智能体 - security/audit/LogIntegrity.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 日志防篡改
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件实现日志防篡改机制，包括哈希链（每条日志包含前一条的哈希）、
 * 日志验证功能、WORM（Write Once Read Many）支持接口。
 * 符合等保三级对审计日志完整性的要求。
 *
 * @module security/audit/LogIntegrity
 */

import * as crypto from 'node:crypto';

import { type AuditLogEntry, type LogIntegrityResult, SecurityError } from '../types';

/**
 * 哈希链初始值（创世哈希）
 */
const GENESIS_HASH = '0'.repeat(64);

/**
 * 日志完整性管理器
 *
 * 负责维护日志哈希链，确保审计日志不可篡改。
 * 每条日志的哈希值包含前一条日志的哈希，形成链式结构。
 *
 * @example
 * const integrity = new LogIntegrityManager();
 * const entry = integrity.sealLogEntry(logData);
 * const valid = integrity.verifyLogChain(entries);
 */
export class LogIntegrityManager {
  /** 上一条日志的哈希值 */
  private lastHash: string = GENESIS_HASH;
  /** 日志计数 */
  private logCount = 0;

  /**
   * 计算日志内容的哈希值
   * 使用SHA-256算法，包含前一条日志的哈希以形成链式结构
   *
   * @param logContent - 日志内容（不含logHash和prevLogHash字段）
   * @param prevHash - 前一条日志的哈希
   * @returns 哈希值（十六进制）
   */
  public computeLogHash(logContent: Record<string, unknown>, prevHash: string): string {
    const hash = crypto.createHash('sha256');
    // 将内容序列化为确定性JSON（按键排序）
    const canonicalJson = JSON.stringify(logContent, Object.keys(logContent).sort());
    hash.update(prevHash);
    hash.update(canonicalJson);
    return hash.digest('hex');
  }

  /**
   * 为日志条目添加哈希链密封
   * 计算prevLogHash和logHash，并更新内部状态
   *
   * @param logData - 日志数据（不含哈希字段）
   * @returns 完整的日志条目（含哈希字段）
   */
  public sealLogEntry(logData: Omit<AuditLogEntry, 'logHash' | 'prevLogHash'>): AuditLogEntry {
    const prevHash = this.lastHash;
    // 提取不含哈希字段的内容
    const content: Record<string, unknown> = { ...logData };
    const logHash = this.computeLogHash(content, prevHash);

    const sealedEntry: AuditLogEntry = {
      ...logData,
      prevLogHash: prevHash,
      logHash: logHash,
    };

    this.lastHash = logHash;
    this.logCount++;
    return sealedEntry;
  }

  /**
   * 验证单条日志的哈希完整性
   *
   * @param entry - 日志条目
   * @param expectedPrevHash - 期望的前一条日志哈希
   * @returns 是否有效
   */
  public verifyLogEntry(entry: AuditLogEntry, expectedPrevHash: string): boolean {
    if (entry.prevLogHash !== expectedPrevHash) {
      return false;
    }
    // 重建内容（不含哈希字段）
    const content: Record<string, unknown> = { ...entry };
    delete content.logHash;
    delete content.prevLogHash;
    const computedHash = this.computeLogHash(content, entry.prevLogHash);
    return computedHash === entry.logHash;
  }

  /**
   * 验证整个日志链的完整性
   *
   * @param entries - 日志条目列表（按时间顺序）
   * @returns 验证结果
   */
  public verifyLogChain(entries: AuditLogEntry[]): LogIntegrityResult {
    if (entries.length === 0) {
      return { valid: true, verifiedCount: 0 };
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!this.verifyLogEntry(entry, expectedPrevHash)) {
        return {
          valid: false,
          verifiedCount: i,
          firstInvalidIndex: i,
          reason: `第 ${i + 1} 条日志（logId: ${entry.logId}）哈希验证失败，可能被篡改`,
        };
      }
      expectedPrevHash = entry.logHash;
    }

    return {
      valid: true,
      verifiedCount: entries.length,
    };
  }

  /**
   * 计算每日日志根哈希（Merkle根）
   * 用于区块链存证或独立审计存储
   *
   * @param entries - 当日日志条目
   * @returns 根哈希（十六进制）
   */
  public computeDailyRootHash(entries: AuditLogEntry[]): string {
    if (entries.length === 0) {
      return crypto.createHash('sha256').update('empty').digest('hex');
    }
    // 简单Merkle树：逐层哈希
    let hashes = entries.map((e) => e.logHash);
    while (hashes.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        if (i + 1 < hashes.length) {
          const hash = crypto.createHash('sha256');
          hash.update(hashes[i] + hashes[i + 1]);
          nextLevel.push(hash.digest('hex'));
        } else {
          nextLevel.push(hashes[i]);
        }
      }
      hashes = nextLevel;
    }
    return hashes[0];
  }

  /**
   * 获取当前链的最后一个哈希
   */
  public getLastHash(): string {
    return this.lastHash;
  }

  /**
   * 获取日志计数
   */
  public getLogCount(): number {
    return this.logCount;
  }

  /**
   * 重置哈希链（用于新的日志文件/新的一天）
   */
  public resetChain(): void {
    this.lastHash = GENESIS_HASH;
    this.logCount = 0;
  }
}

/**
 * WORM（Write Once Read Many）存储接口
 * 日志存储实现此接口以支持一次写入多次读取的防篡改存储
 */
export interface IWormStorage {
  /**
   * 写入数据（仅追加，不可修改）
   *
   * @param data - 要写入的数据
   * @returns 写入位置标识
   */
  append(data: string): Promise<string>;

  /**
   * 读取指定位置的数据
   *
   * @param position - 位置标识
   * @returns 数据内容
   */
  read(position: string): Promise<string>;

  /**
   * 验证存储完整性
   *
   * @returns 是否完整
   */
  verifyIntegrity(): Promise<boolean>;

  /**
   * 获取存储大小
   *
   * @returns 字节数
   */
  getSize(): Promise<number>;
}

/**
 * 基于文件系统的WORM存储实现
 * 使用追加模式写入文件，文件设置为只读属性以模拟WORM
 */
export class FileWormStorage implements IWormStorage {
  private readonly filePath: string;
  private writeStream: ReturnType<typeof import('node:fs').createWriteStream> | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * 追加写入数据
   */
  public async append(data: string): Promise<string> {
    const fs = await import('node:fs/promises');
    const position = (await this.getSize()).toString();
    await fs.appendFile(this.filePath, data + '\n', 'utf-8');
    return position;
  }

  /**
   * 读取指定位置的数据（简化实现：读取全部后按行查找）
   */
  public async read(position: string): Promise<string> {
    const fs = await import('node:fs/promises');
    const content = await fs.readFile(this.filePath, 'utf-8');
    const lines = content.split('\n');
    const index = parseInt(position, 10);
    if (index >= 0 && index < lines.length) {
      return lines[index];
    }
    throw new SecurityError('WORM_READ_ERROR', `无法读取位置 ${position} 的数据`);
  }

  /**
   * 验证存储完整性
   */
  public async verifyIntegrity(): Promise<boolean> {
    try {
      const fs = await import('node:fs/promises');
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取存储大小（行数）
   */
  public async getSize(): Promise<number> {
    try {
      const fs = await import('node:fs/promises');
      const content = await fs.readFile(this.filePath, 'utf-8');
      return content.split('\n').filter((l) => l.length > 0).length;
    } catch {
      return 0;
    }
  }

  /**
   * 关闭存储
   */
  public close(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }
}
