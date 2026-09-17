/**
 * 健澜科技数智医院智能体 - security/index.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 安全合规模块统一导出
 *
 * 版权所有 (c) 2026 健澜科技
 *
 * 本模块为健澜科技数智医院智能体提供完整的安全合规能力，包括：
 * - 数据脱敏引擎：支持掩码、替换、哈希、泛化等多种脱敏算法
 * - 审计日志系统：六类审计日志，哈希链防篡改，符合等保三级要求
 * - 权限管理：RBAC+ABAC混合授权，12种角色定义，数据范围控制
 * - 加密模块：AES-256-GCM字段加密，双层密钥体系，密码哈希
 * - 输入安全：SQL注入/命令注入/XSS防护，Prompt注入五层防护
 *
 * @module security
 */

// ===== 类型定义 =====
export {
  type AbacPolicyRule,
  type AuditLogEntry,
  AuditLogLevel,
  AuditLogType,
  AuditResult,
  ConfirmationType,
  DataLevel,
  DataScope,
  DesensitizationAlgorithm,
  type DesensitizationConfig,
  type DesensitizationRule,
  DesensitizationScenario,
  type DetectedSensitiveData,
  type EncryptedData,
  EncryptionAlgorithm,
  EncryptionError,
  type EnvironmentContext,
  HashAlgorithm,
  InjectionType,
  InputValidationError,
  type InputValidationResult,
  type KeyMetadata,
  KeyType,
  type LogIntegrityResult,
  type LogStorageConfig,
  PasswordHashAlgorithm,
  PermissionAction,
  type PermissionCheckResult,
  PermissionDecision,
  PermissionDeniedError,
  type PermissionKey,
  PermissionModule,
  type PromptInjectionResult,
  PromptInjectionType,
  type ResourceContext,
  RiskLevel,
  RoleCode,
  type RoleDefinition,
  SecurityError,
  SensitiveFieldType,
  type SessionConfig,
  SessionStatus,
  type UserContext,
  type UserSession,
} from './types';

// ===== 数据脱敏模块 =====
export {
  ADDRESS_RULE,
  AGE_RULE,
  applyRuleToValue,
  BANK_CARD_RULE,
  createDesensitizationEngine,
  DATE_OF_BIRTH_RULE,
  DEFAULT_DESENSITIZATION_RULES,
  DesensitizationEngine,
  desensitizeObject,
  desensitizeText,
  detectSensitiveData,
  EMAIL_RULE,
  EMERGENCY_CONTACT_RULE,
  generalizeAge,
  generalizeDate,
  hashDesensitize,
  ID_CARD_RULE,
  maskAddress,
  maskEmail,
  maskName,
  maskString,
  MEDICAL_RECORD_NO_RULE,
  NAME_RULE,
  PHONE_RULE,
  SENSITIVE_DATA_PATTERNS,
} from './desensitization';

// ===== 审计日志模块 =====
export {
  type AnomalyDetectionResult,
  AUDIT_EVENT_METADATA,
  type AuditEventMetadata,
  AuditEventType,
  AuditLogger,
  type AuditLoggerConfig,
  AuditReportGenerator,
  FileLogStorage,
  FileWormStorage,
  getAuditEventMetadata,
  type ILogStorage,
  type IWormStorage,
  type LogContext,
  LogIntegrityManager,
  type LogReadOptions,
  MemoryLogStorage,
  type OperationReportOptions,
  type UserOperationStat,
} from './audit';

// ===== 权限管理模块 =====
export {
  ACTION_DEFINITIONS,
  ASSOCIATE_CHIEF_PHYSICIAN_ROLE,
  ATTENDING_PHYSICIAN_ROLE,
  buildPermissionLookup,
  CHIEF_PHYSICIAN_ROLE,
  DATA_SCOPE_LEVEL,
  DEPARTMENT_HEAD_ROLE,
  getMatrixEntry,
  getRoleDefinition,
  getRolePermissions,
  getUserPermissions,
  GUEST_ROLE,
  hasModuleActionPermission,
  MODULE_DEFINITIONS,
  NURSE_ROLE,
  PATIENT_ROLE,
  PERMISSION_MATRIX,
  PermissionChecker,
  type PermissionCheckerConfig,
  type PermissionMatrixEntry,
  PHARMACIST_ROLE,
  RESIDENT_PHYSICIAN_ROLE,
  ROLE_DEFINITIONS,
  SessionManager,
  SYSTEM_ADMIN_ROLE,
  TECHNICIAN_ROLE,
  VISITING_PHYSICIAN_ROLE,
} from './auth';

// ===== 加密模块 =====
export {
  argon2Hash,
  bcryptHash,
  EncryptionService,
  type EncryptionServiceConfig,
  generateSalt,
  generateToken,
  generateUuid,
  hash,
  hmac,
  type IKeyManager,
  LocalFileKeyManager,
  pbkdf2Hash,
  saltedHash,
  sha256,
  sha512,
  timingSafeEqual,
  verifyArgon2Hash,
  verifyBcryptHash,
  verifyHmac,
  verifyPbkdf2Hash,
  verifySaltedHash,
} from './encryption';

// ===== 输入安全模块 =====
export { InputValidator, PromptInjectionGuard, type PromptInjectionGuardConfig } from './input';

// ===== 数据分级分类模块 =====
export {
  type ClassificationAuditRecord,
  type ClassificationResult,
  type ClassificationRule,
  DATA_CLASSIFICATION_RULES,
  DATA_LEVEL_META,
  DataClassifier,
  type DataClassifierConfig,
} from './classification';

// ===== 等保合规检查模块 =====
export {
  ComplianceChecker,
  type ComplianceCheckerConfig,
  type ComplianceCheckItem,
  type ComplianceCheckResult,
  ComplianceFamily,
  type ComplianceReport,
  ComplianceReportGenerator,
  type ComplianceStatus,
} from './compliance';
