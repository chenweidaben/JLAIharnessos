/**
 * 健澜科技数智医院智能体 - security/types.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 安全合规模块类型定义
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技数智医院智能体的安全合规模块类型定义，
 * 涵盖数据脱敏、审计日志、权限管理、加密、输入安全等子模块的核心类型。
 *
 * @module security/types
 */

// ============================================================
// 通用错误类型
// ============================================================

/**
 * 安全模块自定义错误类
 * 所有安全相关异常均使用此类或其子类
 */
export class SecurityError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, SecurityError.prototype);
  }
}

/**
 * 权限拒绝错误
 */
export class PermissionDeniedError extends SecurityError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PERMISSION_DENIED', message, details);
    this.name = 'PermissionDeniedError';
    Object.setPrototypeOf(this, PermissionDeniedError.prototype);
  }
}

/**
 * 加密错误
 */
export class EncryptionError extends SecurityError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('ENCRYPTION_ERROR', message, details);
    this.name = 'EncryptionError';
    Object.setPrototypeOf(this, EncryptionError.prototype);
  }
}

/**
 * 输入验证错误
 */
export class InputValidationError extends SecurityError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('INPUT_VALIDATION_ERROR', message, details);
    this.name = 'InputValidationError';
    Object.setPrototypeOf(this, InputValidationError.prototype);
  }
}

// ============================================================
// 数据分级
// ============================================================

/**
 * 数据安全级别（四级分类分级）
 * L1 公开级 / L2 内部级 / L3 敏感级 / L4 机密级
 */
export enum DataLevel {
  L1_PUBLIC = 'L1',
  L2_INTERNAL = 'L2',
  L3_SENSITIVE = 'L3',
  L4_CONFIDENTIAL = 'L4',
}

// ============================================================
// 数据脱敏相关类型
// ============================================================

/**
 * 脱敏算法类型
 */
export enum DesensitizationAlgorithm {
  MASK = 'mask',
  REPLACE = 'replace',
  HASH = 'hash',
  GENERALIZE = 'generalize',
  ENCRYPT = 'encrypt',
}

/**
 * 敏感字段类型
 */
export enum SensitiveFieldType {
  ID_CARD = 'id_card',
  PHONE = 'phone',
  NAME = 'name',
  ADDRESS = 'address',
  BANK_CARD = 'bank_card',
  EMAIL = 'email',
  EMERGENCY_CONTACT = 'emergency_contact',
  MEDICAL_RECORD_NO = 'medical_record_no',
  DATE_OF_BIRTH = 'date_of_birth',
  AGE = 'age',
  /** 住院号 */
  INPATIENT_NO = 'inpatient_no',
  /** 门诊号 */
  OUTPATIENT_NO = 'outpatient_no',
  /** 医保卡/社会保障卡号 */
  INSURANCE_CARD = 'insurance_card',
  /** 车牌号 */
  LICENSE_PLATE = 'license_plate',
  /** IP地址 */
  IP_ADDRESS = 'ip_address',
  /** MAC地址 */
  MAC_ADDRESS = 'mac_address',
}

/**
 * 脱敏规则配置
 */
export interface DesensitizationRule {
  fieldType: SensitiveFieldType;
  algorithm: DesensitizationAlgorithm;
  /** 掩码保留前缀长度 */
  keepPrefix?: number;
  /** 掩码保留后缀长度 */
  keepSuffix?: number;
  /** 掩码字符 */
  maskChar?: string;
  /** 替换值模板 */
  replacement?: string;
  /** 哈希算法 */
  hashAlgorithm?: 'sha256' | 'sha512' | 'sm3';
  /** 哈希盐值 */
  salt?: string;
  /** 泛化配置 */
  generalizeConfig?: {
    /** 年龄段区间大小 */
    ageBucket?: number;
    /** 日期泛化精度：year/month/day */
    datePrecision?: 'year' | 'month' | 'day';
  };
  /** 是否可还原（授权场景） */
  reversible?: boolean;
}

/**
 * 检测到的敏感数据项
 */
export interface DetectedSensitiveData {
  type: SensitiveFieldType;
  value: string;
  startIndex: number;
  endIndex: number;
}

/**
 * 脱敏引擎配置
 */
export interface DesensitizationConfig {
  /** 默认规则集 */
  defaultRules: Map<SensitiveFieldType, DesensitizationRule>;
  /** 自定义规则（按字段名） */
  customRules?: Map<string, DesensitizationRule>;
  /** 是否启用自动检测 */
  autoDetect?: boolean;
  /** 脱敏场景 */
  scenario?: DesensitizationScenario;
}

/**
 * 脱敏场景
 */
export enum DesensitizationScenario {
  /** LLM输入脱敏 */
  LLM_INPUT = 'llm_input',
  /** 终端展示脱敏 */
  DISPLAY = 'display',
  /** 日志脱敏 */
  LOG = 'log',
  /** 数据导出脱敏 */
  EXPORT = 'export',
  /** API响应脱敏 */
  API_RESPONSE = 'api_response',
  /** 缓存脱敏 */
  CACHE = 'cache',
  /** 科研数据脱敏 */
  RESEARCH = 'research',
}

// ============================================================
// 审计日志相关类型
// ============================================================

/**
 * 日志类型（六类审计日志）
 */
export enum AuditLogType {
  /** 登录日志 */
  AUTH = 'auth',
  /** 操作日志 */
  OPERATION = 'op',
  /** 数据访问日志 */
  DATA_ACCESS = 'data',
  /** Agent操作日志 */
  AGENT = 'agent',
  /** 系统日志 */
  SYSTEM = 'sys',
  /** 安全事件日志 */
  SECURITY = 'sec',
}

/**
 * 日志级别
 */
export enum AuditLogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * 操作结果
 */
export enum AuditResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  DENIED = 'denied',
  PENDING = 'pending',
}

/**
 * 风险等级
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * 确认方式
 */
export enum ConfirmationType {
  NONE = 'none',
  USER_CONFIRM = 'user_confirm',
  CA_SIGNATURE = 'ca_signature',
  DUAL_REVIEW = 'dual_review',
}

/**
 * 审计日志条目（符合等保三级字段规范）
 */
export interface AuditLogEntry {
  /** 日志唯一标识 */
  logId: string;
  /** 日志类型 */
  logType: AuditLogType;
  /** 日志级别 */
  level: AuditLogLevel;
  /** 事件发生时间（ISO 8601，毫秒精度，带时区） */
  timestamp: string;
  /** 日志接收时间 */
  timestampReceived: string;
  /** 操作用户ID */
  userId: string;
  /** 操作用户姓名 */
  userName: string;
  /** 用户角色 */
  userRole: string;
  /** 用户科室 */
  userDepartment: string;
  /** 用户职称 */
  userTitle?: string;
  /** 会话ID */
  sessionId: string;
  /** 客户端IP */
  clientIp: string;
  /** 客户端位置 */
  clientLocation?: string;
  /** 设备标识 */
  deviceId?: string;
  /** 设备类型 */
  deviceType?: string;
  /** 操作类型 */
  operationType: string;
  /** 操作模块 */
  operationModule: string;
  /** 具体操作动作 */
  operationAction: string;
  /** 操作对象标识 */
  operationObject: string;
  /** 操作对象类型 */
  operationObjectType: string;
  /** 操作参数（脱敏后） */
  parameters?: Record<string, unknown>;
  /** 操作结果 */
  result: AuditResult;
  /** 结果编码 */
  resultCode?: string;
  /** 结果描述 */
  resultMessage?: string;
  /** 错误详情 */
  errorDetail?: string;
  /** 操作耗时（毫秒） */
  durationMs?: number;
  /** 风险等级 */
  riskLevel?: RiskLevel;
  /** 确认方式 */
  confirmationType?: ConfirmationType;
  /** 确认人ID */
  confirmerId?: string;
  /** 审核人ID */
  approverId?: string;
  /** 关联患者ID（脱敏） */
  patientId?: string;
  /** 患者科室 */
  patientDepartment?: string;
  /** 涉及数据级别 */
  dataLevel?: DataLevel;
  /** 涉及数据量 */
  dataSize?: number;
  /** Agent实例ID */
  agentId?: string;
  /** Agent类型 */
  agentType?: string;
  /** Agent决策链摘要 */
  agentDecisionChain?: string;
  /** 引用知识库来源 */
  knowledgeRefs?: string[];
  /** 调用工具名 */
  toolName?: string;
  /** 工具输入（脱敏） */
  toolInput?: Record<string, unknown>;
  /** 工具输出摘要（脱敏） */
  toolOutput?: Record<string, unknown>;
  /** 来源系统 */
  sourceSystem?: string;
  /** 分布式追踪ID */
  traceId?: string;
  /** 日志内容哈希（防篡改） */
  logHash: string;
  /** 前一条日志哈希（哈希链） */
  prevLogHash: string;
}

/**
 * 日志存储配置
 */
export interface LogStorageConfig {
  /** 存储目录 */
  storagePath: string;
  /** 单文件最大大小（字节），默认 100MB */
  maxFileSize?: number;
  /** 滚动策略：size/date */
  rotationPolicy?: 'size' | 'date';
  /** 是否启用压缩 */
  compression?: boolean;
  /** 保留天数 */
  retentionDays?: number;
}

/**
 * 日志完整性验证结果
 */
export interface LogIntegrityResult {
  valid: boolean;
  /** 验证的日志数量 */
  verifiedCount: number;
  /** 第一个无效日志的索引（如有） */
  firstInvalidIndex?: number;
  /** 无效原因 */
  reason?: string;
}

// ============================================================
// 权限管理相关类型
// ============================================================

/**
 * 角色编码
 */
export enum RoleCode {
  SYSTEM_ADMIN = 'R01',
  DEPARTMENT_HEAD = 'R02',
  CHIEF_PHYSICIAN = 'R03',
  ASSOCIATE_CHIEF_PHYSICIAN = 'R04',
  ATTENDING_PHYSICIAN = 'R05',
  RESIDENT_PHYSICIAN = 'R06',
  VISITING_PHYSICIAN = 'R07',
  NURSE = 'R08',
  PHARMACIST = 'R09',
  TECHNICIAN = 'R10',
  PATIENT = 'R11',
  GUEST = 'R12',
}

/**
 * 数据范围
 */
export enum DataScope {
  /** 仅本人 */
  SELF = 'self',
  /** 本组 */
  GROUP = 'group',
  /** 本科室 */
  DEPARTMENT = 'department',
  /** 全院 */
  HOSPITAL = 'hospital',
  /** 已分配/在管患者 */
  ASSIGNED = 'assigned',
  /** 经授权的特定数据 */
  AUTHORIZED = 'authorized',
}

/**
 * 权限模块
 */
export enum PermissionModule {
  PATIENT = 'patient',
  EMR = 'emr',
  ORDER = 'order',
  PRESCRIPTION = 'prescription',
  LAB = 'lab',
  IMAGING = 'imaging',
  CDS = 'cds',
  SYSTEM = 'system',
  ADMIN = 'admin',
}

/**
 * 权限操作
 */
export enum PermissionAction {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  AUDIT = 'audit',
  EXPORT = 'export',
  APPROVE = 'approve',
}

/**
 * 权限标识：模块:操作:数据范围
 */
export type PermissionKey = `${PermissionModule}:${PermissionAction}:${DataScope}`;

/**
 * 角色定义
 */
export interface RoleDefinition {
  code: RoleCode;
  name: string;
  description: string;
  /** 权限列表 */
  permissions: PermissionKey[];
  /** 默认数据范围 */
  defaultDataScope: DataScope;
  /** 继承的角色编码 */
  inheritsFrom?: RoleCode[];
  /** 是否需要MFA */
  requireMfa?: boolean;
}

/**
 * 用户上下文（用于权限检查）
 */
export interface UserContext {
  userId: string;
  userName: string;
  roles: RoleCode[];
  department: string;
  title?: string;
  groupId?: string;
  /** 用户属性（ABAC用） */
  attributes?: Record<string, unknown>;
}

/**
 * 资源上下文（用于权限检查）
 */
export interface ResourceContext {
  module: PermissionModule;
  action: PermissionAction;
  /** 资源所属科室 */
  department?: string;
  /** 资源所属医疗组 */
  groupId?: string;
  /** 资源负责人ID */
  ownerId?: string;
  /** 数据级别 */
  dataLevel?: DataLevel;
  /** 资源属性（ABAC用） */
  attributes?: Record<string, unknown>;
}

/**
 * 环境上下文（ABAC用）
 */
export interface EnvironmentContext {
  /** 当前时间 */
  currentTime?: Date;
  /** 客户端IP */
  clientIp?: string;
  /** 网络位置：intranet/internet/vpn */
  networkLocation?: 'intranet' | 'internet' | 'vpn';
  /** 设备信任等级 */
  deviceTrust?: 'high' | 'medium' | 'low';
  /** 是否工作时间 */
  isWorkingHours?: boolean;
}

/**
 * 权限决策结果
 */
export enum PermissionDecision {
  ALLOW = 'allow',
  DENY = 'deny',
  ASK = 'ask',
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  decision: PermissionDecision;
  /** 匹配的权限规则 */
  matchedRule?: string;
  /** 拒绝原因 */
  denyReason?: string;
  /** 是否需要二次确认 */
  requireConfirmation?: boolean;
  /** 确认方式 */
  confirmationType?: ConfirmationType;
}

/**
 * ABAC策略规则
 */
export interface AbacPolicyRule {
  id: string;
  name: string;
  /** 效果：allow/deny */
  effect: 'allow' | 'deny';
  /** 用户属性条件 */
  userAttributes?: Record<string, unknown>;
  /** 资源属性条件 */
  resourceAttributes?: Record<string, unknown>;
  /** 环境属性条件 */
  environmentAttributes?: Record<string, unknown>;
  /** 优先级（数字越小优先级越高） */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
}

// ============================================================
// 会话管理相关类型
// ============================================================

/**
 * 会话状态
 */
export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  LOCKED = 'locked',
}

/**
 * 用户会话
 */
export interface UserSession {
  sessionId: string;
  userId: string;
  userName: string;
  roles: RoleCode[];
  department: string;
  /** 创建时间 */
  createdAt: string;
  /** 最后活动时间 */
  lastActivityAt: string;
  /** 过期时间 */
  expiresAt: string;
  /** 客户端IP */
  clientIp: string;
  /** 设备信息 */
  deviceInfo?: string;
  /** 会话状态 */
  status: SessionStatus;
  /** JWT令牌 */
  token?: string;
}

/**
 * 会话管理配置
 */
export interface SessionConfig {
  /** 空闲超时（分钟），默认30 */
  idleTimeoutMinutes?: number;
  /** 绝对超时（小时），默认12 */
  absoluteTimeoutHours?: number;
  /** 同一用户最大并发会话数，默认3 */
  maxConcurrentSessions?: number;
  /** 是否启用会话固定防护 */
  enableSessionFixationProtection?: boolean;
}

// ============================================================
// 加密模块相关类型
// ============================================================

/**
 * 加密算法
 */
export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes-256-gcm',
  AES_256_CBC = 'aes-256-cbc',
  SM4 = 'sm4',
}

/**
 * 加密数据格式（版本+IV+密文+认证标签）
 */
export interface EncryptedData {
  /** 格式版本 */
  version: number;
  /** 加密算法 */
  algorithm: EncryptionAlgorithm;
  /** 初始向量（Base64） */
  iv: string;
  /** 密文（Base64） */
  ciphertext: string;
  /** 认证标签（Base64，GCM模式） */
  authTag?: string;
  /** 密钥ID（用于密钥轮换） */
  keyId: string;
  /** 加密时间 */
  encryptedAt: string;
}

/**
 * 密钥类型
 */
export enum KeyType {
  /** 主密钥 */
  MASTER = 'master',
  /** 数据密钥 */
  DATA = 'data',
  /** 会话密钥 */
  SESSION = 'session',
}

/**
 * 密钥元数据
 */
export interface KeyMetadata {
  keyId: string;
  keyType: KeyType;
  algorithm: EncryptionAlgorithm;
  /** 创建时间 */
  createdAt: string;
  /** 过期时间 */
  expiresAt?: string;
  /** 状态：active/rotated/archived/destroyed */
  status: 'active' | 'rotated' | 'archived' | 'destroyed';
  /** 关联的主密钥ID（数据密钥用） */
  masterKeyId?: string;
}

/**
 * 哈希算法
 */
export enum HashAlgorithm {
  SHA_256 = 'sha256',
  SHA_512 = 'sha512',
  SM3 = 'sm3',
}

/**
 * 密码哈希算法
 */
export enum PasswordHashAlgorithm {
  BCRYPT = 'bcrypt',
  ARGON2 = 'argon2',
  PBKDF2 = 'pbkdf2',
}

// ============================================================
// 输入安全相关类型
// ============================================================

/**
 * 注入攻击类型
 */
export enum InjectionType {
  SQL_INJECTION = 'sql_injection',
  COMMAND_INJECTION = 'command_injection',
  XSS = 'xss',
  PROMPT_INJECTION = 'prompt_injection',
  PATH_TRAVERSAL = 'path_traversal',
}

/**
 * 输入验证结果
 */
export interface InputValidationResult {
  valid: boolean;
  /** 检测到的攻击类型 */
  detectedInjections?: InjectionType[];
  /** 风险等级 */
  riskLevel: RiskLevel;
  /** 清洗后的输入 */
  sanitizedInput?: string;
  /** 检测详情 */
  details?: {
    type: InjectionType;
    matchedPattern: string;
    position: number;
  }[];
}

/**
 * Prompt注入检测结果
 */
export interface PromptInjectionResult {
  /** 是否检测到注入 */
  detected: boolean;
  /** 注入类型 */
  injectionTypes: PromptInjectionType[];
  /** 风险等级 */
  riskLevel: RiskLevel;
  /** 匹配的特征 */
  matchedPatterns: string[];
  /** 建议处理方式 */
  recommendation: 'allow' | 'block' | 'flag' | 'manual_review';
  /** 清洗后的输入（移除注入内容） */
  sanitizedInput?: string;
}

/**
 * Prompt注入类型
 */
export enum PromptInjectionType {
  /** 指令覆盖 */
  INSTRUCTION_OVERRIDE = 'instruction_override',
  /** 角色冒充 */
  ROLE_IMPERSONATION = 'role_impersonation',
  /** 数据泄露诱导 */
  DATA_LEAK_INDUCTION = 'data_leak_induction',
  /** 间接注入 */
  INDIRECT_INJECTION = 'indirect_injection',
  /** 编码混淆 */
  ENCODING_OBFUSCATION = 'encoding_obfuscation',
  /** 分隔符注入 */
  DELIMITER_INJECTION = 'delimiter_injection',
  /** 敏感操作诱导 */
  SENSITIVE_OPERATION_INDUCTION = 'sensitive_operation_induction',
  /** SQL 注入 */
  SQL_INJECTION = 'sql_injection',
  /** XSS 跨站脚本 */
  XSS_ATTACK = 'xss_attack',
  /** 命令注入 */
  COMMAND_INJECTION = 'command_injection',
}
