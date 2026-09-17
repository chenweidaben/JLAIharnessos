/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 系统管理模块 - 类型定义
 * 覆盖：系统配置、字典、机构、知识库、CDS规则、工具、Agent、集成、消息通知、系统监控
 */

/* ============================== 系统配置 ============================== */

/** 密码策略 */
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecialChar: boolean;
  expireDays: number;
  historyCount: number;
}

/** 登录策略 */
export interface LoginPolicy {
  maxFailedAttempts: number;
  lockDurationMinutes: number;
  sessionTimeoutMinutes: number;
  kickRepeatedLogin: boolean;
}

/** 数据保留策略 */
export interface DataRetentionPolicy {
  logRetentionDays: number;
  medicalRecordRetentionYears: number;
  backupRetentionDays: number;
}

/** AI 参数 */
export interface AIParams {
  defaultModel: 'claude-sonnet' | 'claude-opus' | 'claude-haiku' | 'jianlan-medical';
  temperature: number;
  maxTokens: number;
  contextWindow: number;
  streamingEnabled: boolean;
  showThinking: boolean;
}

/** 界面参数 */
export interface UIParams {
  defaultTheme: 'light' | 'dark';
  defaultLanguage: 'zh-CN' | 'en-US';
  tableDensity: 'default' | 'middle' | 'small';
  fontSize: number;
  animationEnabled: boolean;
}

/** 系统配置 */
export interface SystemConfig {
  // 系统参数
  systemName: string;
  systemLogo: string;
  hospitalName: string;
  hospitalLevel: string;
  hospitalAddress: string;
  contactPhone: string;
  contactEmail: string;
  systemVersion: string;
  recordNumber: string; // 备案号

  // 业务参数
  defaultDepartment: string;
  defaultQuotaPerDay: number;
  outpatientStartTime: string;
  outpatientEndTime: string;
  admissionStartTime: string;
  criticalValueNotifyMethod: string[];
  prescriptionAuditFlow: 'none' | 'single' | 'double';

  // 安全参数
  passwordPolicy: PasswordPolicy;
  loginPolicy: LoginPolicy;
  dataRetention: DataRetentionPolicy;
  twoFactorAuth: boolean;

  // 界面参数
  uiParams: UIParams;

  // AI 参数
  aiParams: AIParams;

  // 修改历史
  updateHistory: ConfigHistoryItem[];
}

/** 配置修改历史 */
export interface ConfigHistoryItem {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  operator: string;
  time: string;
}

/* ============================== 字典管理 ============================== */

/** 字典项 */
export interface DictItem {
  id: string;
  dictCode: string; // 字典编码
  dictName: string; // 字典名称
  dictValue: string; // 字典值
  sort: number;
  status: 'enabled' | 'disabled';
  remark?: string;
}

/** 字典分类（树形节点） */
export interface DictCategory {
  id: string;
  name: string;
  code: string;
  children?: DictCategory[];
}

/* ============================== 机构管理 ============================== */

/** 床位 */
export interface Bed {
  bedNo: string;
  bedType: '普通' | '抢救' | '监护' | '隔离';
  status: '空闲' | '占用' | '消毒中' | '维修';
  roomNo: string;
}

/** 病区 */
export interface Ward {
  id: string;
  name: string;
  code: string;
  building: string;
  floor: string;
  nurseHead: string;
  bedCount: number;
  beds: Bed[];
}

/** 科室 */
export interface Department {
  id: string;
  name: string;
  code: string;
  type: '临床' | '医技' | '行政' | '后勤';
  director: string; // 主任
  nurseHead?: string; // 护士长
  bedCount: number;
  location: string;
  status: 'enabled' | 'disabled';
  sort: number;
  parentId?: string;
  wards?: Ward[];
}

/** 机构信息 */
export interface Organization {
  name: string;
  level: string; // 三甲/三乙/二甲...
  type: string; // 综合/专科/中医...
  address: string;
  phone: string;
  email: string;
  president: string; // 院长
  partySecretary: string; // 党委书记
  bedCount: number;
  staffCount: number;
  description: string;
  logo: string;
}

/* ============================== 知识库管理 ============================== */

/** 文档向量化状态 */
export type VectorStatus = 'pending' | 'processing' | 'done' | 'failed';

/** 知识文档 */
export interface KnowledgeDocument {
  id: string;
  title: string;
  categoryId: string;
  tags: string[];
  wordCount: number;
  chunkCount: number;
  source: '指南' | '药品' | '院制' | '路径' | '文献' | '其他';
  format: 'PDF' | 'Word' | 'Markdown' | 'TXT';
  version: string;
  status: 'published' | 'draft' | 'archived';
  vectorStatus: VectorStatus;
  updatedAt: string;
  updatedBy: string;
  content?: string;
  chunks?: KnowledgeChunk[];
}

/** 知识分块 */
export interface KnowledgeChunk {
  id: string;
  index: number;
  content: string;
  tokenCount: number;
}

/** 知识分类 */
export interface KnowledgeCategory {
  id: string;
  name: string;
  code: string;
  docCount: number;
  sort: number;
  children?: KnowledgeCategory[];
}

/** 知识库 */
export interface KnowledgeBase {
  id: string;
  name: string;
  category: string;
  docCount: number;
  source: string;
  version: string;
  status: 'published' | 'draft' | 'archived';
  updatedAt: string;
  updatedBy: string;
}

/** 检索结果 */
export interface SearchResult {
  chunkId: string;
  docTitle: string;
  content: string;
  score: number;
  source: string;
}

/** 知识版本 */
export interface KnowledgeVersion {
  version: string;
  publishedAt: string;
  publishedBy: string;
  changeLog: string;
}

/* ============================== CDS 规则管理 ============================== */

/** CDS 规则类型 */
export type CDSRuleType =
  '药物相互作用' | '药物过敏' | '剂量异常' | '禁忌症' | '危急值' | '诊疗规范';

/** CDS 规则等级 */
export type CDSRuleLevel = '高' | '中' | '低';

/** CDS 规则状态 */
export type CDSRuleStatus = 'enabled' | 'disabled' | 'testing';

/** CDS 动作 */
export type CDSAction = 'alert' | 'warning' | 'block' | 'suggest' | 'log';

/** 规则条件 */
export interface CDSCondition {
  id: string;
  group: 'patient' | 'diagnosis' | 'lab' | 'drug' | 'order' | 'vital';
  field: string;
  operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'contains' | 'in' | 'empty' | 'not_empty';
  value: string;
  logic: 'and' | 'or';
}

/** CDS 规则 */
export interface CDSRule {
  id: string;
  code: string;
  name: string;
  description: string;
  type: CDSRuleType;
  level: CDSRuleLevel;
  action: CDSAction;
  conditions: CDSCondition[];
  messageTemplate: string;
  applicableDepts: string[];
  applicableDoctorLevels: string[];
  applicablePatientTypes: string[];
  evidenceSource: string;
  status: CDSRuleStatus;
  version: string;
  triggerCount: number;
  hitRate: number;
  updatedAt: string;
  updatedBy: string;
}

/** 规则测试结果 */
export interface CDSTestResult {
  triggered: boolean;
  ruleId: string;
  ruleName: string;
  message: string;
  matchedConditions: string[];
  timestamp: string;
}

/* ============================== 工具管理 ============================== */

/** 工具风险等级 */
export type ToolRisk = 'low' | 'medium' | 'high';

/** 工具状态 */
export type ToolStatus = 'enabled' | 'disabled' | 'maintenance';

/** 工具分类 */
export type ToolCategory =
  | '患者管理'
  | '病历'
  | '医嘱'
  | '处方'
  | '检验'
  | 'CDS'
  | '质控'
  | '患者服务'
  | '运营'
  | '系统集成';

/** 工具参数 */
export interface ToolParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  example?: string;
}

/** 工具配置 */
export interface ToolConfig {
  id: string;
  name: string;
  code: string;
  category: ToolCategory;
  description: string;
  risk: ToolRisk;
  status: ToolStatus;
  version: string;
  inputParams: ToolParam[];
  outputParams: ToolParam[];
  errorCodes: { code: string; message: string }[];
  // 运行配置
  allowedRoles: string[];
  requireConfirm: boolean;
  confirmTimeout: number; // 秒
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  timeoutSeconds: number;
  retryCount: number;
  retryIntervalMs: number;
  mockMode: boolean;
}

/** 工具统计 */
export interface ToolStat {
  toolCode: string;
  callCount: number;
  successRate: number; // 百分比
  avgResponseMs: number;
  errorCount: number;
}

/** 工具调用日志 */
export interface ToolCallLog {
  id: string;
  toolCode: string;
  caller: string;
  callerRole: string;
  params: string;
  result: 'success' | 'failed';
  durationMs: number;
  error?: string;
  time: string;
}

/* ============================== Agent 管理 ============================== */

/** Agent 类型 */
export type AgentType = '主Agent' | '科室子代理' | '专科Agent';

/** Agent 状态 */
export type AgentStatus = 'online' | 'offline' | 'maintenance';

/** Agent 模型配置 */
export interface AgentModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;
}

/** Agent 配置 */
export interface AgentConfig {
  id: string;
  name: string;
  code: string;
  type: AgentType;
  description: string;
  department: string;
  modelConfig: AgentModelConfig;
  systemPrompt: string;
  rolePrompt: string;
  specialtyPrompt: string;
  availableTools: string[];
  knowledgeBases: string[];
  knowledgeTopK: number;
  knowledgeSimilarity: number;
  enableRerank: boolean;
  subAgents: string[];
  allowedRoles: string[];
  dataScope: 'all' | 'own_dept' | 'own_patient';
  riskPolicy: 'auto' | 'confirm' | 'approval';
  status: AgentStatus;
}

/** Agent 统计 */
export interface AgentStat {
  agentCode: string;
  activeSessions: number;
  todayCalls: number;
  totalCalls: number;
  avgResponseMs: number;
  tokenToday: number;
  tokenTotal: number;
  errorRate: number;
}

/** Agent 会话日志 */
export interface AgentSessionLog {
  sessionId: string;
  user: string;
  agent: string;
  startTime: string;
  endTime?: string;
  messageCount: number;
  tokenUsed: number;
  status: 'active' | 'completed' | 'error';
}

/* ============================== 集成管理 ============================== */

/** 集成系统类型 */
export type IntegrationType = 'HIS' | 'EMR' | 'LIS' | 'PACS' | '医保' | 'CA' | 'HRP' | 'OA';

/** 连接方式 */
export type ConnectionMethod = 'REST' | 'SOAP' | 'HL7' | 'FHIR' | 'DICOM' | '数据库直连';

/** 连接状态 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'maintenance';

/** 字段映射 */
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  defaultValue?: string;
  transform?: string;
}

/** 集成配置 */
export interface IntegrationConfig {
  id: string;
  name: string;
  type: IntegrationType;
  vendor: string;
  version: string;
  method: ConnectionMethod;
  endpoint: string;
  port: number;
  protocol: string;
  authType: 'none' | 'basic' | 'token' | 'apikey' | 'certificate';
  username?: string;
  password?: string;
  apiKey?: string;
  status: ConnectionStatus;
  lastSyncTime?: string;
  fieldMappings: FieldMapping[];
  syncStrategy: 'realtime' | 'scheduled' | 'manual';
  syncIntervalSeconds: number;
  syncMode: 'incremental' | 'full';
  maxRetries: number;
  retryIntervalMs: number;
  timeoutSeconds: number;
  dataFilter?: string;
  enabled: boolean;
}

/** 集成日志 */
export interface IntegrationLog {
  id: string;
  integrationId: string;
  time: string;
  direction: 'in' | 'out';
  dataType: string;
  recordCount: number;
  status: 'success' | 'failed' | 'partial';
  durationMs: number;
  error?: string;
  rawData?: string;
  retryCount: number;
}

/** 消息总线 Topic */
export interface MessageTopic {
  name: string;
  type: 'Topic' | 'Queue';
  backlog: number;
  consumerCount: number;
  throughput: number; // 条/秒
  deadLetter: number;
}

/* ============================== 消息通知管理 ============================== */

/** 通知渠道 */
export type NotifyChannel = '站内信' | '短信' | '邮件' | '微信' | '企业微信' | '钉钉' | 'APP推送';

/** 通知模板 */
export interface NotificationTemplate {
  id: string;
  name: string;
  type: string; // 模板类型
  channel: NotifyChannel;
  title: string;
  content: string;
  variables: string[];
  status: 'enabled' | 'disabled';
  updatedAt: string;
  updatedBy: string;
  version: string;
}

/** 推送规则 */
export interface PushRule {
  id: string;
  name: string;
  triggerEvent: string;
  targetRoles: string[];
  targetDepts: string[];
  channels: NotifyChannel[];
  channelPriority: NotifyChannel[];
  sendTiming: 'immediate' | 'scheduled' | 'digest';
  quietHoursStart?: string;
  quietHoursEnd?: string;
  escalationEnabled: boolean;
  escalationMinutes: number;
  escalationTarget: string;
  status: 'enabled' | 'disabled';
}

/** 通知记录 */
export interface NotificationRecord {
  id: string;
  templateName: string;
  recipient: string;
  recipientRole: string;
  channel: NotifyChannel;
  status: 'sent' | 'failed' | 'pending';
  readStatus: 'read' | 'unread';
  sentAt: string;
  readAt?: string;
  failReason?: string;
  content: string;
}

/* ============================== 系统监控 ============================== */

/** 服务状态 */
export type ServiceStatusType = 'running' | 'error' | 'stopped' | 'maintenance';

/** 服务 */
export interface ServiceStatus {
  name: string;
  type: string;
  status: ServiceStatusType;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  responseMs: number;
  qps: number;
  errorRate: number;
  uptimeSeconds: number;
  version: string;
}

/** 性能指标点 */
export interface PerformancePoint {
  time: string;
  qps: number;
  avgMs: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  cpu: number;
  memory: number;
}

/** 性能指标 */
export interface PerformanceMetric {
  timeline: PerformancePoint[];
  concurrentUsers: number;
  throughput: number;
}

/** 数据库监控 */
export interface DatabaseMonitor {
  connections: number;
  activeConnections: number;
  queriesPerSecond: number;
  slowQueries: number;
  cacheHitRate: number;
  tableSpaceUsage: number;
  lockWaitCount: number;
  slowQueryList: { sql: string; durationMs: number; callCount: number }[];
}

/** 缓存监控 */
export interface CacheMonitor {
  memoryUsed: number;
  keyCount: number;
  hitRate: number;
  throughput: number;
  slowCommands: { command: string; durationMs: number }[];
}

/** 消息队列监控 */
export interface MQMonitor {
  topics: MessageTopic[];
  totalBacklog: number;
  productionRate: number;
  consumptionRate: number;
}

/** Agent 服务监控 */
export interface AgentServiceMonitor {
  instanceCount: number;
  onlineCount: number;
  activeSessions: number;
  concurrentSessions: number;
  tokenToday: number;
  tokenTotal: number;
  modelCalls: number;
  toolCalls: number;
  avgResponseMs: number;
  errorRate: number;
}

/** 集成服务监控 */
export interface IntegrationServiceMonitor {
  integrations: {
    name: string;
    status: ConnectionStatus;
    successRate: number;
    latencyMs: number;
    dataCount: number;
    errorRate: number;
  }[];
}

/** 告警级别 */
export type AlertLevel = 'P0' | 'P1' | 'P2' | 'P3';

/** 告警 */
export interface Alert {
  id: string;
  time: string;
  level: AlertLevel;
  type: string;
  content: string;
  status: 'active' | 'acknowledged' | 'resolved';
  handler?: string;
  source: string;
}

/** 错误日志 */
export interface ErrorLog {
  id: string;
  time: string;
  service: string;
  level: 'ERROR' | 'WARN' | 'FATAL';
  message: string;
  traceId: string;
  userId?: string;
  stack?: string;
  requestParams?: string;
}

/** 调用链 */
export interface TraceInfo {
  traceId: string;
  service: string;
  durationMs: number;
  status: 'ok' | 'error';
  startTime: string;
  spanCount: number;
  spans?: { service: string; durationMs: number; status: 'ok' | 'error' }[];
}

/** 健康检查项 */
export interface HealthCheckItem {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  detail: string;
  lastCheck: string;
}

/** 系统监控汇总 */
export interface MonitorData {
  services: ServiceStatus[];
  performance: PerformanceMetric;
  database: DatabaseMonitor;
  cache: CacheMonitor;
  mq: MQMonitor;
  agentService: AgentServiceMonitor;
  integrationService: IntegrationServiceMonitor;
  alerts: Alert[];
  errorLogs: ErrorLog[];
  traces: TraceInfo[];
  healthScore: number;
  healthChecks: HealthCheckItem[];
  healthTrend: { date: string; score: number }[];
}

/* ============================== 常量映射 ============================== */

export const CD_RULE_TYPE_LABEL: Record<CDSRuleType, string> = {
  药物相互作用: '药物相互作用',
  药物过敏: '药物过敏',
  剂量异常: '剂量异常',
  禁忌症: '禁忌症',
  危急值: '危急值',
  诊疗规范: '诊疗规范',
};

export const TOOL_RISK_COLOR: Record<ToolRisk, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

export const ALERT_LEVEL_COLOR: Record<AlertLevel, string> = {
  P0: '#F5222D',
  P1: '#FA8C16',
  P2: '#FAAD14',
  P3: '#1890FF',
};
