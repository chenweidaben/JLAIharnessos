/**
 * 健澜AI原生医院操作系统OS - 编排事件批量入链适配器
 *
 * 将工作流节点完成 / 人工决议 / 阻断 / 降级事件映射为 S-08 AI 审计事件，
 * 保持 SHA-256 哈希链先后顺序；不新增审计枚举值，不吞掉主流程异常。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import {
  validateAiAuditInput,
  type AiActor,
  type AiAuditEvent,
  type AiAuditEventInput,
  type AiAuditService,
  type AiGuardLevel,
  type AiHumanAction,
  type AiVersionSnapshot,
  type ToolCallRecord,
} from '@/security/audit/aiAudit.js';

/** 编排侧上报事件（字段口径对齐 S-08 入参；自由文本由 S-08 内部脱敏） */
export interface OrchestratorAuditEvent {
  traceId: string;
  actor: AiActor;
  agentId: string;
  agentVersion: string;
  scenario: string;
  patientId?: string;
  visitId?: string;
  department?: string;
  versions?: AiVersionSnapshot;
  inputSummary: string;
  outputSummary: string;
  citations?: string[];
  elapsedMs?: number;
  tokenUsage?: { input: number; output: number };
  guardLevel?: AiGuardLevel;
  humanAction?: AiHumanAction;
  toolCalls?: ToolCallRecord[];
  writePath?: string;
  evidence?: string;
}

const OFFLINE_VERSIONS: AiVersionSnapshot = {
  modelId: 'offline-unknown',
  modelVersion: '0.0.0',
  knowledgeVersion: [],
  promptVersion: 'offline-unknown',
  platformRelease: 'offline-unknown',
};

function normalizeVersions(versions: AiVersionSnapshot | undefined): AiVersionSnapshot {
  if (!versions) return { ...OFFLINE_VERSIONS, knowledgeVersion: [] };
  return {
    modelId: versions.modelId || OFFLINE_VERSIONS.modelId,
    modelVersion: versions.modelVersion || OFFLINE_VERSIONS.modelVersion,
    knowledgeVersion: Array.isArray(versions.knowledgeVersion) ? versions.knowledgeVersion : [],
    promptVersion: versions.promptVersion || OFFLINE_VERSIONS.promptVersion,
    platformRelease: versions.platformRelease || OFFLINE_VERSIONS.platformRelease,
  };
}

/** 纯映射：编排事件 -> S-08 审计入参；不在此处吞错，结构校验在 recordBatch 内完成 */
export function buildAuditInput(event: OrchestratorAuditEvent): AiAuditEventInput {
  return {
    traceId: event.traceId,
    actor: { ...event.actor, roleCodes: [...event.actor.roleCodes] },
    agentId: event.agentId,
    agentVersion: event.agentVersion,
    scenario: event.scenario,
    patientId: event.patientId,
    visitId: event.visitId,
    department: event.department,
    versions: normalizeVersions(event.versions),
    inputSummary: event.inputSummary,
    outputSummary: event.outputSummary,
    citations: [...(event.citations ?? [])],
    elapsedMs: event.elapsedMs ?? 0,
    tokenUsage: event.tokenUsage ?? { input: 0, output: 0 },
    guardLevel: event.guardLevel ?? 'PASS',
    humanAction: event.humanAction ?? 'pending',
    toolCalls: (event.toolCalls ?? []).map((tool) => ({ ...tool })),
    writePath: event.writePath,
    evidence: event.evidence,
  };
}

/** 批量入链适配器：顺序写入，前一条 hash 即后一条 prevHash；校验失败整批抛错并指明序号 */
export class OrchestratorAuditBridge {
  private readonly auditService: AiAuditService;
  private pendingCount = 0;
  private recordedCount = 0;

  constructor(auditService: AiAuditService) {
    this.auditService = auditService;
  }

  get pending(): number {
    return this.pendingCount;
  }

  get recorded(): number {
    return this.recordedCount;
  }

  /** 顺序批量记录；不包装节点成功/失败状态，不兜底捕获主流程异常 */
  recordBatch(events: OrchestratorAuditEvent[]): AiAuditEvent[] {
    this.pendingCount = events.length;
    const recorded: AiAuditEvent[] = [];
    events.forEach((event, index) => {
      const input = buildAuditInput(event);
      const errors = validateAiAuditInput(input);
      if (errors.length > 0) {
        throw new Error(`编排审计批次 #${index + 1} 校验失败: ${errors.join('；')}`);
      }
      recorded.push(this.auditService.record(input));
      this.recordedCount++;
      this.pendingCount--;
    });
    return recorded;
  }
}
