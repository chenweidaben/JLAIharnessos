/**
 * 健澜科技数智医院智能体 - security/audit/LogStorage.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 日志存储接口与文件系统实现
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件定义日志存储抽象接口，并提供文件系统存储实现（JSON Lines格式），
 * 支持日志滚动（按大小/按日期）和日志压缩。
 *
 * @module security/audit/LogStorage
 */

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

import {
  type AuditLogEntry,
  type AuditLogType,
  type LogStorageConfig,
  SecurityError,
} from '../types';

/**
 * 日志存储抽象接口
 * 所有日志存储实现（文件系统、数据库、ELK等）均需实现此接口
 */
export interface ILogStorage {
  /**
   * 写入日志条目
   *
   * @param entry - 日志条目
   */
  write(entry: AuditLogEntry): Promise<void>;

  /**
   * 批量写入日志条目
   *
   * @param entries - 日志条目列表
   */
  writeBatch(entries: AuditLogEntry[]): Promise<void>;

  /**
   * 读取日志条目
   *
   * @param options - 查询选项
   * @returns 日志条目列表
   */
  read(options?: LogReadOptions): Promise<AuditLogEntry[]>;

  /**
   * 关闭存储
   */
  close(): Promise<void>;

  /**
   * 刷新缓冲区
   */
  flush(): Promise<void>;
}

/**
 * 日志读取选项
 */
export interface LogReadOptions {
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
  /** 日志类型 */
  logType?: AuditLogType;
  /** 用户ID */
  userId?: string;
  /** 最大返回数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * 文件系统日志存储实现
 * 使用JSON Lines格式（每行一个JSON对象），支持按大小/按日期滚动和压缩
 */
export class FileLogStorage implements ILogStorage {
  private readonly config: Required<LogStorageConfig>;
  private currentFilePath: string;
  private currentFileSize = 0;
  private writeQueue: AuditLogEntry[] = [];
  private isWriting = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * 构造文件系统日志存储
   *
   * @param config - 存储配置
   */
  constructor(config: LogStorageConfig) {
    this.config = {
      storagePath: config.storagePath,
      maxFileSize: config.maxFileSize ?? 100 * 1024 * 1024, // 默认100MB
      rotationPolicy: config.rotationPolicy ?? 'date',
      compression: config.compression ?? true,
      retentionDays: config.retentionDays ?? 90,
    };

    // 确保存储目录存在
    if (!fs.existsSync(this.config.storagePath)) {
      fs.mkdirSync(this.config.storagePath, { recursive: true });
    }

    this.currentFilePath = this.getLogFilePath();
    this.currentFileSize = this.getCurrentFileSize();

    // 启动定时刷新
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, 1000);
  }

  /**
   * 写入日志条目（异步队列）
   */
  public async write(entry: AuditLogEntry): Promise<void> {
    this.writeQueue.push(entry);
    await this.processQueue();
  }

  /**
   * 批量写入日志条目
   */
  public async writeBatch(entries: AuditLogEntry[]): Promise<void> {
    this.writeQueue.push(...entries);
    await this.processQueue();
  }

  /**
   * 读取日志条目
   */
  public async read(options?: LogReadOptions): Promise<AuditLogEntry[]> {
    const results: AuditLogEntry[] = [];
    const files = this.getLogFiles();
    const limit = options?.limit ?? 1000;
    const offset = options?.offset ?? 0;
    let count = 0;

    for (const file of files) {
      if (results.length >= limit) break;
      try {
        let content: string;
        if (file.endsWith('.gz')) {
          const compressed = await fsPromises.readFile(file);
          content = zlib.gunzipSync(compressed).toString('utf-8');
        } else {
          content = await fsPromises.readFile(file, 'utf-8');
        }
        const lines = content.split('\n').filter((l) => l.trim().length > 0);
        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as AuditLogEntry;
            if (this.matchesFilters(entry, options)) {
              if (count >= offset) {
                results.push(entry);
                if (results.length >= limit) break;
              }
              count++;
            }
          } catch {
            // 跳过无法解析的行
          }
        }
      } catch (error) {
        // 读取失败跳过该文件
      }
    }
    return results;
  }

  /**
   * 刷新缓冲区，将队列中的日志写入磁盘
   */
  public async flush(): Promise<void> {
    await this.processQueue();
  }

  /**
   * 关闭存储
   */
  public async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * 处理写入队列
   */
  private async processQueue(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0) {
      return;
    }
    this.isWriting = true;
    try {
      const batch = this.writeQueue.splice(0, this.writeQueue.length);
      const lines = batch.map((e) => JSON.stringify(e)).join('\n') + '\n';

      // 检查是否需要滚动
      if (this.needsRotation(lines.length)) {
        await this.rotate();
      }

      await fsPromises.appendFile(this.currentFilePath, lines, 'utf-8');
      this.currentFileSize += Buffer.byteLength(lines, 'utf-8');
    } catch (error) {
      throw new SecurityError('LOG_WRITE_ERROR', '日志写入失败', { error: String(error) });
    } finally {
      this.isWriting = false;
    }
  }

  /**
   * 检查是否需要滚动日志文件
   */
  private needsRotation(dataSize: number): boolean {
    if (this.config.rotationPolicy === 'size') {
      return this.currentFileSize + dataSize > this.config.maxFileSize;
    }
    // 按日期滚动：检查当前文件日期是否为今天
    const todayFile = this.getLogFilePath();
    return this.currentFilePath !== todayFile;
  }

  /**
   * 滚动日志文件
   */
  private async rotate(): Promise<void> {
    // 压缩旧文件（如果启用压缩且文件存在）
    if (this.config.compression && fs.existsSync(this.currentFilePath)) {
      try {
        const content = await fsPromises.readFile(this.currentFilePath);
        const compressed = zlib.gzipSync(content);
        const gzPath = this.currentFilePath + '.gz';
        await fsPromises.writeFile(gzPath, compressed);
        await fsPromises.unlink(this.currentFilePath);
      } catch {
        // 压缩失败保留原文件
      }
    }

    // 清理过期文件
    await this.cleanupOldFiles();

    // 创建新文件
    this.currentFilePath = this.getLogFilePath();
    this.currentFileSize = 0;
  }

  /**
   * 清理过期日志文件
   */
  private async cleanupOldFiles(): Promise<void> {
    try {
      const files = await fsPromises.readdir(this.config.storagePath);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      for (const file of files) {
        if (!file.startsWith('audit_')) continue;
        const filePath = path.join(this.config.storagePath, file);
        const stat = await fsPromises.stat(filePath);
        if (stat.mtime < cutoffDate) {
          await fsPromises.unlink(filePath);
        }
      }
    } catch {
      // 清理失败不影响主流程
    }
  }

  /**
   * 获取日志文件路径
   */
  private getLogFilePath(): string {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return path.join(this.config.storagePath, `audit_${dateStr}.log`);
  }

  /**
   * 获取当前文件大小
   */
  private getCurrentFileSize(): number {
    try {
      if (fs.existsSync(this.currentFilePath)) {
        return fs.statSync(this.currentFilePath).size;
      }
    } catch {
      // 忽略
    }
    return 0;
  }

  /**
   * 获取所有日志文件（按时间倒序）
   */
  private getLogFiles(): string[] {
    try {
      const files = fs
        .readdirSync(this.config.storagePath)
        .filter((f) => f.startsWith('audit_'))
        .map((f) => path.join(this.config.storagePath, f))
        .sort((a, b) => {
          const statA = fs.statSync(a);
          const statB = fs.statSync(b);
          return statB.mtime.getTime() - statA.mtime.getTime();
        });
      return files;
    } catch {
      return [];
    }
  }

  /**
   * 检查日志条目是否匹配过滤条件
   */
  private matchesFilters(entry: AuditLogEntry, options?: LogReadOptions): boolean {
    if (!options) return true;
    if (options.startTime && entry.timestamp < options.startTime) return false;
    if (options.endTime && entry.timestamp > options.endTime) return false;
    if (options.logType && entry.logType !== options.logType) return false;
    if (options.userId && entry.userId !== options.userId) return false;
    return true;
  }
}

/**
 * 内存日志存储实现（用于测试和开发环境）
 */
export class MemoryLogStorage implements ILogStorage {
  private entries: AuditLogEntry[] = [];

  public async write(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }

  public async writeBatch(entries: AuditLogEntry[]): Promise<void> {
    this.entries.push(...entries);
  }

  public async read(options?: LogReadOptions): Promise<AuditLogEntry[]> {
    let result = [...this.entries];
    if (options?.logType) {
      result = result.filter((e) => e.logType === options.logType);
    }
    if (options?.userId) {
      result = result.filter((e) => e.userId === options.userId);
    }
    if (options?.limit) {
      result = result.slice(0, options.limit);
    }
    return result;
  }

  public async close(): Promise<void> {
    // 内存存储无需关闭
  }

  public async flush(): Promise<void> {
    // 内存存储无需刷新
  }

  /**
   * 获取所有日志条目（测试用）
   */
  public getAll(): AuditLogEntry[] {
    return [...this.entries];
  }

  /**
   * 清空日志（测试用）
   */
  public clear(): void {
    this.entries = [];
  }
}
