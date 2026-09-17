/**
 * 健澜科技数智医院智能体 - security/audit/index.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 审计日志模块统一导出
 *
 * 版权所有 (c) 2026
 *
 * @module security/audit
 */

export {
  AUDIT_EVENT_METADATA,
  type AuditEventMetadata,
  AuditEventType,
  getAuditEventMetadata,
} from './AuditEvent';
export { AuditLogger, type AuditLoggerConfig, type LogContext } from './AuditLogger';
export {
  type AnomalyDetectionResult,
  AuditReportGenerator,
  type OperationReportOptions,
  type UserOperationStat,
} from './AuditReportGenerator';
export { FileWormStorage, type IWormStorage, LogIntegrityManager } from './LogIntegrity';
export {
  FileLogStorage,
  type ILogStorage,
  type LogReadOptions,
  MemoryLogStorage,
} from './LogStorage';
