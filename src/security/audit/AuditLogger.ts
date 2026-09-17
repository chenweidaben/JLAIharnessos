/**
 * 健澜科技数智医院智能体 - security/audit/AuditLogger.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 审计日志器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件实现审计日志器，支持六类日志（登录/操作/数据访问/Agent操作/系统/安全事件），
 * 支持同步和异步写入，JSON格式化，日志级别管理。
 * 符合等保三级对审计日志的要求。
 *
 * @module security/audit/AuditLogger
 */

import * as crypto from 'node:crypto';

import {
  type AuditLogEntry,
  AuditLogLevel,
  AuditResult,
  ConfirmationType,
  DataLevel,
  SecurityError,
} from '../types';
import { type AuditEventType, getAuditEventMetadata } from './AuditEvent';
import { LogIntegrityManager } from './LogIntegrity';
import { FileLogStorage, type ILogStorage, MemoryLogStorage } from './LogStorage';

/**
 * 审计日志器配置
 */
export interface AuditLoggerConfig {
  /** 日志存储实现 */
  storage?: ILogStorage;
  /** 文件存储路径（当未指定storage时使用） */
  storagePath?: string;
  /** 是否启用异步写入 */
  asyncWrite?: boolean;
  /** 是否启用日志完整性保护（哈希链） */
  enableIntegrity?: boolean;
  /** 最小日志级别（低于此级别的日志不记录） */
  minLevel?: AuditLogLevel;
  /** 应用名称 */
  applicationName?: string;
}

/**
 * 日志记录上下文
 * 记录当前用户和会话信息，避免每次调用都传入
 */
export interface LogContext {
  userId: string;
  userName: string;
  userRole: string;
  userDepartment: string;
  userTitle?: string;
  sessionId: string;
  clientIp: string;
  clientLocation?: string;
  deviceId?: string;
  deviceType?: string;
}

/**
 * 审计日志器
 *
 * 负责记录系统中所有安全相关操作，支持六类审计日志，
 * 内置哈希链防篡改机制，支持同步/异步写入。
 *
 * @example
 * const logger = new AuditLogger({ storagePath: './logs/audit' });
 * logger.setContext({ userId: 'doc001', ... });
 * logger.log(AuditEventType.PATIENT_READ, { operationObject: 'P001' });
 */
export class AuditLogger {
  private readonly storage: ILogStorage;
  private readonly asyncWrite: boolean;
  private readonly enableIntegrity: boolean;
  private readonly minLevel: AuditLogLevel;
  private readonly applicationName: string;
  private readonly integrityManager: LogIntegrityManager;
  private context: LogContext | null = null;
  private static instance: AuditLogger | null = null;

  /**
   * 构造审计日志器
   *
   * @param config - 配置
   */
  constructor(config?: AuditLoggerConfig) {
    this.asyncWrite = config?.asyncWrite ?? true;
    this.enableIntegrity = config?.enableIntegrity ?? true;
    this.minLevel = config?.minLevel ?? AuditLogLevel.INFO;
    this.applicationName = config?.applicationName ?? 'jianlan-medical-agent';
    this.integrityManager = new LogIntegrityManager();

    if (config?.storage) {
      this.storage = config.storage;
    } else if (config?.storagePath) {
      this.storage = new FileLogStorage({ storagePath: config.storagePath });
    } else {
      this.storage = new MemoryLogStorage();
    }
  }

  /**
   * 获取单例实例
   *
   * @param config - 配置（首次调用时使用）
   * @returns AuditLogger单例
   */
  public static getInstance(config?: AuditLoggerConfig): AuditLogger {
    AuditLogger.instance ??= new AuditLogger(config);
    return AuditLogger.instance;
  }

  /**
   * 设置当前日志上下文
   *
   * @param context - 日志上下文
   */
  public setContext(context: LogContext): void {
    this.context = context;
  }

  /**
   * 清除当前日志上下文
   */
  public clearContext(): void {
    this.context = null;
  }

  /**
   * 记录审计日志
   *
   * @param eventType - 审计事件类型
   * @param details - 日志详情（可选字段）
   * @param context - 覆盖默认上下文（可选）
   */
  public log(
    eventType: AuditEventType,
    details?: Partial<AuditLogEntry>,
    context?: LogContext,
  ): void {
    const metadata = getAuditEventMetadata(eventType);

    // 检查日志级别
    if (!this.shouldLog(metadata.defaultLevel)) {
      return;
    }

    const ctx = context ?? this.context;
    if (!ctx) {
      throw new SecurityError('AUDIT_CONTEXT_MISSING', '审计日志上下文未设置，无法记录日志', {
        eventType,
      });
    }

    const entry = this.buildLogEntry(eventType, metadata, ctx, details);

    if (this.asyncWrite) {
      void this.storage.write(entry).catch((error) => {
        // 异步写入失败不抛出，避免影响主流程
        console.error('[AuditLogger] 异步写入失败:', error);
      });
    } else {
      void this.storage.write(entry);
    }
  }

  /**
   * 同步记录审计日志（等待写入完成）
   *
   * @param eventType - 审计事件类型
   * @param details - 日志详情
   * @param context - 覆盖默认上下文
   */
  public async logSync(
    eventType: AuditEventType,
    details?: Partial<AuditLogEntry>,
    context?: LogContext,
  ): Promise<void> {
    const metadata = getAuditEventMetadata(eventType);
    if (!this.shouldLog(metadata.defaultLevel)) {
      return;
    }
    const ctx = context ?? this.context;
    if (!ctx) {
      throw new SecurityError('AUDIT_CONTEXT_MISSING', '审计日志上下文未设置');
    }
    const entry = this.buildLogEntry(eventType, metadata, ctx, details);
    await this.storage.write(entry);
  }

  /**
   * 记录INFO级别日志
   */
  public info(eventType: AuditEventType, details?: Partial<AuditLogEntry>): void {
    this.log(eventType, { ...details, level: AuditLogLevel.INFO });
  }

  /**
   * 记录WARN级别日志
   */
  public warn(eventType: AuditEventType, details?: Partial<AuditLogEntry>): void {
    this.log(eventType, { ...details, level: AuditLogLevel.WARN });
  }

  /**
   * 记录ERROR级别日志
   */
  public error(eventType: AuditEventType, details?: Partial<AuditLogEntry>): void {
    this.log(eventType, { ...details, level: AuditLogLevel.ERROR });
  }

  /**
   * 记录CRITICAL级别日志
   */
  public critical(eventType: AuditEventType, details?: Partial<AuditLogEntry>): void {
    this.log(eventType, { ...details, level: AuditLogLevel.CRITICAL });
  }

  /**
   * 验证日志链完整性
   *
   * @param entries - 日志条目列表
   * @returns 验证结果
   */
  public verifyIntegrity(entries: AuditLogEntry[]) {
    return this.integrityManager.verifyLogChain(entries);
  }

  /**
   * 获取日志存储引用
   */
  public getStorage(): ILogStorage {
    return this.storage;
  }

  /**
   * 关闭日志器
   */
  public async close(): Promise<void> {
    await this.storage.close();
  }

  /**
   * 构建日志条目
   */
  private buildLogEntry(
    eventType: AuditEventType,
    metadata: ReturnType<typeof getAuditEventMetadata>,
    ctx: LogContext,
    details?: Partial<AuditLogEntry>,
  ): AuditLogEntry {
    const now = new Date().toISOString();
    const logId = `log-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const baseEntry: Omit<AuditLogEntry, 'logHash' | 'prevLogHash'> = {
      logId,
      logType: metadata.logType,
      level: details?.level ?? metadata.defaultLevel,
      timestamp: now,
      timestampReceived: now,
      userId: ctx.userId,
      userName: ctx.userName,
      userRole: ctx.userRole,
      userDepartment: ctx.userDepartment,
      userTitle: ctx.userTitle,
      sessionId: ctx.sessionId,
      clientIp: ctx.clientIp,
      clientLocation: ctx.clientLocation,
      deviceId: ctx.deviceId,
      deviceType: ctx.deviceType,
      operationType: eventType,
      operationModule: this.extractModule(eventType),
      operationAction: eventType,
      operationObject: details?.operationObject ?? 'N/A',
      operationObjectType: details?.operationObjectType ?? 'unknown',
      parameters: metadata.recordParameters ? details?.parameters : undefined,
      result: details?.result ?? AuditResult.SUCCESS,
      resultCode: details?.resultCode,
      resultMessage: details?.resultMessage,
      errorDetail: details?.errorDetail,
      durationMs: details?.durationMs,
      riskLevel: details?.riskLevel ?? metadata.defaultRiskLevel,
      confirmationType: details?.confirmationType ?? ConfirmationType.NONE,
      confirmerId: details?.confirmerId,
      approverId: details?.approverId,
      patientId: details?.patientId,
      patientDepartment: details?.patientDepartment,
      dataLevel: details?.dataLevel ?? DataLevel.L2_INTERNAL,
      dataSize: details?.dataSize,
      agentId: details?.agentId,
      agentType: details?.agentType,
      agentDecisionChain: details?.agentDecisionChain,
      knowledgeRefs: details?.knowledgeRefs,
      toolName: details?.toolName,
      toolInput: details?.toolInput,
      toolOutput: details?.toolOutput,
      sourceSystem: details?.sourceSystem ?? this.applicationName,
      traceId: details?.traceId,
    };

    // 应用完整性保护
    if (this.enableIntegrity) {
      return this.integrityManager.sealLogEntry(baseEntry);
    }

    // 无完整性保护时，填充空哈希
    return {
      ...baseEntry,
      logHash: '',
      prevLogHash: '',
    };
  }

  /**
   * 从事件类型提取模块
   */
  private extractModule(eventType: AuditEventType): string {
    const parts = eventType.split('_');
    if (parts.length >= 2) {
      return parts[1].toLowerCase();
    }
    return 'system';
  }

  /**
   * 判断是否应该记录该级别的日志
   */
  private shouldLog(level: AuditLogLevel): boolean {
    const levelOrder: Record<AuditLogLevel, number> = {
      [AuditLogLevel.INFO]: 1,
      [AuditLogLevel.WARN]: 2,
      [AuditLogLevel.ERROR]: 3,
      [AuditLogLevel.CRITICAL]: 4,
    };
    return levelOrder[level] >= levelOrder[this.minLevel];
  }
}
