/**
 * 健澜AI原生医院操作系统OS - security/audit/aiAudit.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * AI 专项审计事件与四维留痕（技术文档 3.6.5 AiAuditEvent 模型、3.6.6 验收标准）：
 * 输入/输出脱敏摘要、模型/知识/提示词/平台发布四维版本快照、工具调用哈希留痕、
 * 处置动作与人工干预点、自有 SHA-256 哈希链、多维检索、病历 ↔ 生成过程 ↔ 四维版本
 * 双向追溯，并桥接既有 AuditLogger 六类日志扩展域。
 *
 * 本切片（S-08）为进程内存台账 + 内存哈希链，不接 DB / 网络 / 真实 LLM；WORM 持久化、
 * 27 条病历写路径真实入链接线、BFF 审计路由与前端看板归后续批次。
 *
 * @module security/audit/aiAudit
 */

import * as crypto from 'node:crypto';

import { desensitizeText } from '../desensitization/index.js';
import { AuditEventType } from './AuditEvent.js';
import { AuditLogger, type LogContext } from './AuditLogger.js';

// ============================================================================
// 错误码常量
// ============================================================================

/** 必填字段缺失 */
export const AUD_ERROR_MISSING_FIELD = 'AUD-001';
/** 枚举值非法 */
export const AUD_ERROR_INVALID_ENUM = 'AUD-002';
/** 数值非负校验失败 */
export const AUD_ERROR_INVALID_NUMBER = 'AUD-003';
/** 知识版本清单结构非法 */
export const AUD_ERROR_INVALID_KNOWLEDGE_VERSIONS = 'AUD-004';
/** 调用者 actor 结构非法 */
export const AUD_ERROR_INVALID_ACTOR = 'AUD-005';
/** 四维版本快照结构非法 */
export const AUD_ERROR_INVALID_VERSIONS = 'AUD-006';
/** traceId 不存在 */
export const AUD_ERROR_TRACE_NOT_FOUND = 'AUD-007';

// ============================================================================
// 类型契约（对齐技术文档 3.6.5 AiAuditEvent）
// ============================================================================

/** 调用者身份与数据归属（原始标识独立存放，不复制进摘要文本） */
export interface AiActor {
  userId: string;
  roleCodes: string[];
  department: string;
}

/** 四维版本快照：模型 / 知识 / 提示词 / 平台发布版本 */
export interface AiVersionSnapshot {
  modelId: string;
  modelVersion: string;
  knowledgeVersion: string[];
  promptVersion: string;
  platformRelease: string;
}

/** 工具调用记录：输入输出只存哈希，不落原文 */
export interface ToolCallRecord {
  toolId: string;
  operation: string;
  purpose?: string;
  riskLevel?: 'read-only' | 'confirm' | 'double-confirm';
  result?: 'success' | 'failure' | 'blocked';
  durationMs?: number;
  toolInputHash?: string;
  toolOutputHash?: string;
}

/** 输出侧防护级别（对齐 S-01 OutboundLevel 口径） */
export type AiGuardLevel = 'PASS' | 'CAUTION' | 'BLOCK';

/** 人工处置动作（含待确认状态，人工干预点留痕） */
export type AiHumanAction = 'adopted' | 'modified' | 'rejected' | 'escalated' | 'pending';

/** AI 专项审计事件（除服务端生成字段外，其余由调用方传入） */
export interface AiAuditEvent {
  eventId: string;
  traceId: string;
  timestamp: string;
  actor: AiActor;
  agentId: string;
  agentVersion: string;
  scenario: string;
  patientId?: string;
  visitId?: string;
  department?: string;
  versions: AiVersionSnapshot;
  inputSummary: string;
  outputSummary: string;
  citations: string[];
  elapsedMs: number;
  tokenUsage: { input: number; output: number };
  guardLevel: AiGuardLevel;
  humanAction: AiHumanAction;
  toolCalls: ToolCallRecord[];
  auditChain: { prevHash: string; hash: string };
  patientMasked: boolean;
  recordRef?: string;
  writePath?: string;
  evidence?: string;
}

/** 事件入参：eventId / timestamp / auditChain / patientMasked 由服务端生成 */
export type AiAuditEventInput = Omit<AiAuditEvent, 'eventId' | 'timestamp' | 'auditChain' | 'patientMasked'>;

/** 多维检索过滤器（AND 组合；knowledgeVersion 按包含匹配；from/to 为时间闭区间） */
export interface AiAuditQuery {
  traceId?: string;
  agentId?: string;
  agentVersion?: string;
  modelId?: string;
  modelVersion?: string;
  promptVersion?: string;
  knowledgeVersion?: string;
  patientId?: string;
  department?: string;
  scenario?: string;
  guardLevel?: AiGuardLevel;
  humanAction?: AiHumanAction;
  from?: string;
  to?: string;
}

/** trace 导出结果：事件序列 + 四维版本快照 + 病历记录引用清单 */
export interface AiTraceExport {
  events: AiAuditEvent[];
  versionSnapshot: AiVersionSnapshot;
  recordRefs: string[];
}

/** 链完整性校验结果 */
export interface AiChainVerification {
  valid: boolean;
  verifiedCount: number;
  firstInvalidIndex?: number;
  reason?: string;
}

// ============================================================================
// 枚举常量与校验辅助
// ============================================================================

const GUARD_LEVELS: readonly AiGuardLevel[] = ['PASS', 'CAUTION', 'BLOCK'];
const HUMAN_ACTIONS: readonly AiHumanAction[] = ['adopted', 'modified', 'rejected', 'escalated', 'pending'];
const TOOL_RISKS: readonly ToolCallRecord['riskLevel'][] = ['read-only', 'confirm', 'double-confirm'];
const TOOL_RESULTS: readonly ToolCallRecord['result'][] = ['success', 'failure', 'blocked'];

/** 哈希链创世哈希（与 LogIntegrityManager 口径一致：0×64） */
export const AUDIT_GENESIS_HASH = '0'.repeat(64);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

// ============================================================================
// 纯函数：入参校验
// ============================================================================

/** 校验 AI 审计事件入参，返回错误信息数组（空数组 = 通过） */
export function validateAiAuditInput(input: unknown): string[] {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null) return ['审计事件入参必须为对象'];
  const e = input as Record<string, unknown>;

  // 必填字符串字段
  for (const field of ['traceId', 'agentId', 'agentVersion', 'scenario'] as const) {
    if (!isNonEmptyString(e[field])) errors.push(`[${AUD_ERROR_MISSING_FIELD}] ${field} 必须为非空字符串`);
  }

  // actor 结构校验
  const actor = e.actor;
  if (typeof actor !== 'object' || actor === null) {
    errors.push(`[${AUD_ERROR_INVALID_ACTOR}] actor 必须为调用者对象`);
  } else {
    const a = actor as Record<string, unknown>;
    if (!isNonEmptyString(a.userId)) errors.push(`[${AUD_ERROR_MISSING_FIELD}] actor.userId 必须为非空字符串`);
    if (!Array.isArray(a.roleCodes) || !a.roleCodes.every((item) => typeof item === 'string'))
      errors.push(`[${AUD_ERROR_INVALID_ACTOR}] actor.roleCodes 必须为字符串数组`);
    if (!isNonEmptyString(a.department)) errors.push(`[${AUD_ERROR_MISSING_FIELD}] actor.department 必须为非空字符串`);
  }

  // 四维版本快照校验
  const versions = e.versions;
  if (typeof versions !== 'object' || versions === null) {
    errors.push(`[${AUD_ERROR_INVALID_VERSIONS}] versions 必须为四维版本快照对象`);
  } else {
    const v = versions as Record<string, unknown>;
    for (const field of ['modelId', 'modelVersion', 'promptVersion', 'platformRelease'] as const) {
      if (!isNonEmptyString(v[field])) errors.push(`[${AUD_ERROR_MISSING_FIELD}] versions.${field} 必须为非空字符串`);
    }
    if (!isStringArray(v.knowledgeVersion))
      errors.push(`[${AUD_ERROR_INVALID_KNOWLEDGE_VERSIONS}] versions.knowledgeVersion 必须为字符串数组`);
  }

  // 枚举校验
  if (!GUARD_LEVELS.includes(e.guardLevel as AiGuardLevel))
    errors.push(`[${AUD_ERROR_INVALID_ENUM}] guardLevel 必须为 ${GUARD_LEVELS.join(' / ')} 之一`);
  if (!HUMAN_ACTIONS.includes(e.humanAction as AiHumanAction))
    errors.push(`[${AUD_ERROR_INVALID_ENUM}] humanAction 必须为 ${HUMAN_ACTIONS.join(' / ')} 之一`);

  // 数值非负校验
  if (!Number.isFinite(e.elapsedMs) || (e.elapsedMs as number) < 0)
    errors.push(`[${AUD_ERROR_INVALID_NUMBER}] elapsedMs 必须为非负有限数值`);
  const usage = e.tokenUsage;
  if (typeof usage !== 'object' || usage === null) {
    errors.push(`[${AUD_ERROR_INVALID_NUMBER}] tokenUsage 必须为用量对象`);
  } else {
    const u = usage as Record<string, unknown>;
    if (!Number.isFinite(u.input) || (u.input as number) < 0)
      errors.push(`[${AUD_ERROR_INVALID_NUMBER}] tokenUsage.input 必须为非负数值`);
    if (!Number.isFinite(u.output) || (u.output as number) < 0)
      errors.push(`[${AUD_ERROR_INVALID_NUMBER}] tokenUsage.output 必须为非负数值`);
  }

  // 工具调用记录结构校验
  if (!Array.isArray(e.toolCalls)) {
    errors.push(`[${AUD_ERROR_INVALID_ENUM}] toolCalls 必须为工具调用数组`);
  } else {
    e.toolCalls.forEach((tool, index) => {
      if (typeof tool !== 'object' || tool === null) {
        errors.push(`toolCalls[${index}] 必须为工具调用对象`);
        return;
      }
      const t = tool as Record<string, unknown>;
      if (!isNonEmptyString(t.toolId)) errors.push(`toolCalls[${index}].toolId 必须为非空字符串`);
      if (!isNonEmptyString(t.operation)) errors.push(`toolCalls[${index}].operation 必须为非空字符串`);
      if (t.riskLevel !== undefined && !TOOL_RISKS.includes(t.riskLevel as ToolCallRecord['riskLevel']))
        errors.push(`toolCalls[${index}].riskLevel 必须为 ${TOOL_RISKS.join(' / ')} 之一`);
      if (t.result !== undefined && !TOOL_RESULTS.includes(t.result as ToolCallRecord['result']))
        errors.push(`toolCalls[${index}].result 必须为 ${TOOL_RESULTS.join(' / ')} 之一`);
      if (t.durationMs !== undefined && (!Number.isFinite(t.durationMs) || (t.durationMs as number) < 0))
        errors.push(`toolCalls[${index}].durationMs 必须为非负有限数值`);
    });
  }

  if (!isStringArray(e.citations)) errors.push('citations 必须为字符串数组');

  return errors;
}

// ============================================================================
// 哈希链辅助（确定性按键排序 JSON + SHA-256，创世哈希 0×64）
// ============================================================================

function canonicalJson(value: Record<string, unknown>): string {
  return JSON.stringify(value, Object.keys(value).sort());
}

function computeChainHash(body: Record<string, unknown>, prevHash: string): string {
  return crypto.createHash('sha256').update(prevHash).update(canonicalJson(body)).digest('hex');
}

/** 工具输入 / 输出摘要哈希（落链只存哈希，不落原文） */
export function hashToolPayload(payload: string): string {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ============================================================================
// AI 专项审计服务（进程内存台账 + 自有哈希链 + AuditLogger 桥接）
// ============================================================================

/**
 * AI 专项审计服务：事件登记、脱敏入链、多维检索、trace 导出、链完整性校验、
 * 病历引用绑定。内存台账深拷贝隔离；WORM 持久化归后续切片。
 */
export class AiAuditService {
  private readonly events: AiAuditEvent[] = [];
  private readonly recordRefs = new Map<string, Set<string>>();
  private readonly logger?: AuditLogger;
  private lastHash: string = AUDIT_GENESIS_HASH;

  constructor(options?: { logger?: AuditLogger }) {
    this.logger = options?.logger;
  }

  /**
   * 登记一条 AI 审计事件：校验 → 摘要脱敏 → 四维版本去重排序 → 入哈希链 →
   * 桥接既有 AuditLogger；返回事件深拷贝。
   */
  record(input: AiAuditEventInput): AiAuditEvent {
    const errors = validateAiAuditInput(input);
    if (errors.length > 0) {
      throw new Error(`[${AUD_ERROR_MISSING_FIELD}] AI 审计事件校验未通过：${errors.join('；')}`);
    }

    const rawInput = input.inputSummary ?? '';
    const rawOutput = input.outputSummary ?? '';
    const maskedInput = desensitizeText(rawInput);
    const maskedOutput = desensitizeText(rawOutput);
    const patientMasked = maskedInput !== rawInput || maskedOutput !== rawOutput;

    const knowledgeVersion = [...input.versions.knowledgeVersion].sort();
    const timestamp = new Date().toISOString();
    const eventId = `evt-${timestamp}-${crypto.randomBytes(6).toString('hex')}`;

    const seeded: AiAuditEvent = {
      eventId,
      traceId: input.traceId,
      timestamp,
      actor: structuredClone(input.actor),
      agentId: input.agentId,
      agentVersion: input.agentVersion,
      scenario: input.scenario,
      patientId: input.patientId,
      visitId: input.visitId,
      department: input.department,
      versions: {
        modelId: input.versions.modelId,
        modelVersion: input.versions.modelVersion,
        knowledgeVersion,
        promptVersion: input.versions.promptVersion,
        platformRelease: input.versions.platformRelease,
      },
      inputSummary: maskedInput,
      outputSummary: maskedOutput,
      citations: [...input.citations],
      elapsedMs: input.elapsedMs,
      tokenUsage: { ...input.tokenUsage },
      guardLevel: input.guardLevel,
      humanAction: input.humanAction,
      toolCalls: structuredClone(input.toolCalls),
      auditChain: { prevHash: this.lastHash, hash: '' },
      patientMasked,
      recordRef: input.recordRef,
      writePath: input.writePath,
      evidence: input.evidence,
    };

    const body: Record<string, unknown> = { ...seeded };
    delete body.auditChain;
    const hash = computeChainHash(body, this.lastHash);
    seeded.auditChain = { prevHash: this.lastHash, hash };
    this.lastHash = hash;

    this.events.push(seeded);

    if (seeded.recordRef) {
      this.bindRecordRef(seeded.traceId, seeded.recordRef);
    }

    this.bridgeToLogger(seeded);
    return structuredClone(seeded);
  }

  /** 多维检索：字段 AND 组合，knowledgeVersion 包含匹配，from/to 时间闭区间；返回深拷贝 */
  query(filter: AiAuditQuery = {}): AiAuditEvent[] {
    const fromMs = filter.from ? Date.parse(filter.from) : undefined;
    const toMs = filter.to ? Date.parse(filter.to) : undefined;
    const result = this.events.filter((event) => {
      if (filter.traceId && event.traceId !== filter.traceId) return false;
      if (filter.agentId && event.agentId !== filter.agentId) return false;
      if (filter.agentVersion && event.agentVersion !== filter.agentVersion) return false;
      if (filter.modelId && event.versions.modelId !== filter.modelId) return false;
      if (filter.modelVersion && event.versions.modelVersion !== filter.modelVersion) return false;
      if (filter.promptVersion && event.versions.promptVersion !== filter.promptVersion) return false;
      if (filter.knowledgeVersion && !event.versions.knowledgeVersion.includes(filter.knowledgeVersion)) return false;
      if (filter.patientId && event.patientId !== filter.patientId) return false;
      if (filter.department && event.department !== filter.department) return false;
      if (filter.scenario && event.scenario !== filter.scenario) return false;
      if (filter.guardLevel && event.guardLevel !== filter.guardLevel) return false;
      if (filter.humanAction && event.humanAction !== filter.humanAction) return false;
      const eventMs = Date.parse(event.timestamp);
      if (fromMs !== undefined && eventMs < fromMs) return false;
      if (toMs !== undefined && eventMs > toMs) return false;
      return true;
    });
    return result.map((event) => structuredClone(event));
  }

  /** 按 traceId 导出全过程事件、四维版本快照与病历记录引用清单（双向追溯） */
  exportTrace(traceId: string): AiTraceExport {
    const events = this.events.filter((event) => event.traceId === traceId);
    if (events.length === 0) {
      throw new Error(`[${AUD_ERROR_TRACE_NOT_FOUND}] traceId「${traceId}」不存在，无法导出追溯链`);
    }
    const recordRefs = this.collectRecordRefs(traceId, events);
    return {
      events: events.map((event) => structuredClone(event)),
      versionSnapshot: structuredClone(events[0].versions),
      recordRefs,
    };
  }

  /** 绑定病历记录引用；同一 traceId 可追加多个，重复引用去重；traceId 不存在抛错 */
  linkMedicalRecord(traceId: string, recordRef: string): void {
    const exists = this.events.some((event) => event.traceId === traceId);
    if (!exists) throw new Error(`[${AUD_ERROR_TRACE_NOT_FOUND}] traceId「${traceId}」不存在，无法绑定病历引用`);
    this.bindRecordRef(traceId, recordRef);
  }

  /** 回读 traceId 绑定的病历记录引用清单（去重）；未知 traceId 返回空数组 */
  getRecordRefs(traceId: string): string[] {
    return [...(this.recordRefs.get(traceId) ?? [])];
  }

  /** 按时间顺序重算整条哈希链；任一篡改返回首个失效位置与中文原因 */
  verifyChain(): AiChainVerification {
    let expectedPrev = AUDIT_GENESIS_HASH;
    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      const body: Record<string, unknown> = { ...event };
      delete body.auditChain;
      const computed = computeChainHash(body, event.auditChain.prevHash);
      if (event.auditChain.prevHash !== expectedPrev || computed !== event.auditChain.hash) {
        return {
          valid: false,
          verifiedCount: i,
          firstInvalidIndex: i,
          reason: `第 ${i + 1} 条 AI 审计事件（eventId: ${event.eventId}）哈希验证失败，事件内容或链序可能被篡改`,
        };
      }
      expectedPrev = event.auditChain.hash;
    }
    return { valid: true, verifiedCount: this.events.length };
  }

  /** 回读全部事件深拷贝（按登记顺序） */
  listEvents(): AiAuditEvent[] {
    return this.events.map((event) => structuredClone(event));
  }

  /** 测试专用：清空台账、病历引用映射与链尾哈希 */
  reset(): void {
    this.events.length = 0;
    this.recordRefs.clear();
    this.lastHash = AUDIT_GENESIS_HASH;
  }

  // --------------------------------------------------------------------------
  // 内部辅助
  // --------------------------------------------------------------------------

  private bindRecordRef(traceId: string, recordRef: string): void {
    const set = this.recordRefs.get(traceId) ?? new Set<string>();
    set.add(recordRef);
    this.recordRefs.set(traceId, set);
  }

  private collectRecordRefs(traceId: string, events: AiAuditEvent[]): string[] {
    const linked = this.recordRefs.get(traceId) ?? new Set<string>();
    events.forEach((event) => {
      if (event.recordRef) linked.add(event.recordRef);
    });
    return [...linked];
  }

  /** 桥接既有 AuditLogger 六类日志扩展域；桥接失败不阻断主流程 */
  private bridgeToLogger(event: AiAuditEvent): void {
    if (!this.logger) return;
    try {
      const eventType = this.selectAuditEventType(event);
      const context: LogContext = {
        userId: event.actor.userId,
        userName: event.actor.userId,
        userRole: event.actor.roleCodes.join(','),
        userDepartment: event.actor.department,
        sessionId: event.traceId,
        clientIp: 'ai-audit-internal',
      };
      const details = {
        operationObject: event.scenario,
        operationObjectType: 'ai-agent',
        agentId: event.agentId,
        agentType: event.agentVersion,
        knowledgeRefs: event.versions.knowledgeVersion,
        toolName: event.toolCalls[0]?.toolId,
        patientId: event.patientId,
        durationMs: event.elapsedMs,
        traceId: event.traceId,
        parameters: {
          scenario: event.scenario,
          guardLevel: event.guardLevel,
          humanAction: event.humanAction,
          citations: event.citations,
          evidence: event.evidence,
        },
      };
      this.logger.log(eventType, details, context);
    } catch {
      // 桥接为旁路增强：审计台账已先行入链，桥接异常不得阻断主流程
    }
  }

  /** 既有 AuditEventType 选择口径（不新增枚举值） */
  private selectAuditEventType(event: AiAuditEvent): AuditEventType {
    if (event.toolCalls.length > 0) return AuditEventType.AGENT_TOOL_CALL;
    if (event.guardLevel === 'BLOCK') return AuditEventType.UNAUTHORIZED_ACCESS;
    if (event.evidence && /泄露|leak/i.test(event.evidence)) return AuditEventType.DATA_LEAK_DETECTED;
    return AuditEventType.AGENT_DECISION;
  }
}

// ============================================================================
// 模块级单例与测试重置
// ============================================================================

let _service: AiAuditService | null = null;

/** 获取进程级 AI 审计服务单例（首次可注入既有 AuditLogger；后续注入不替换） */
export function getAiAuditService(options?: { logger?: AuditLogger }): AiAuditService {
  if (!_service) _service = new AiAuditService(options);
  return _service;
}

/** 测试专用：重置模块级单例 */
export function _resetAiAuditService(): void {
  _service = null;
}
