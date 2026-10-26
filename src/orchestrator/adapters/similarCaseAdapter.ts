/**
 * 健澜AI原生医院操作系统OS - similar-case-query 编排隔离适配器
 *
 * 隔离判定、审计入链、角色/用途/就诊标识规则全部复用 S-13 患者隔离服务；
 * 编排侧只负责上下文取值、错误码透传与离线降级，不复制隔离规则、不新增审计枚举值。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { AiActor, AiAuditService, AiVersionSnapshot } from '@/security/audit/aiAudit.js';
import {
  getPatientIsolationService,
  ISOLATION_TOOL_ID,
  type IsolationQuery,
  type IsolationVerdict,
  type PatientIsolationService,
} from '@/knowledge-platform/isolation/patientIsolation.js';
import type { WorkflowContext } from '../engine/context.js';

/** 调用方角色上下文（可直接传 AiActor，也可由工作流 user 上下文兜底解析） */
export interface SimilarCaseActorInput {
  userId?: string;
  roleCodes?: string[];
  department?: string;
}

/** 适配器调用依赖 */
export interface SimilarCaseQueryDeps {
  query: IsolationQuery;
  /** 可选注入隔离服务；缺省取 S-13 进程单例 */
  service?: PatientIsolationService;
  /** 隔离服务未初始化时用于创建单例的审计服务 */
  auditService?: AiAuditService;
}

function firstNonEmpty(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

/**
 * 从工作流上下文构造 similar-case-query 隔离查询；用途固定为 similar-case-only，
 * 编排侧不允许通过上下文改写用途。
 */
export function buildSimilarCaseQuery(
  ctx: WorkflowContext,
  actor: SimilarCaseActorInput,
  traceId: string,
  versions: AiVersionSnapshot,
  metadata?: { agentId?: string; agentVersion?: string; queryText?: string },
): IsolationQuery {
  const patientId = firstNonEmpty(
    ctx.patient.patientId,
    ctx.getVariables().patientId,
    ctx.input.patientId,
  ) ?? '';
  const visitId = firstNonEmpty(
    ctx.patient.visitId,
    ctx.getVariables().visitId,
    ctx.input.visitId,
  );
  const roles = actor.roleCodes ?? (ctx.user.roleCodes as string[] | undefined) ?? [];
  const auditActor: AiActor = {
    userId: actor.userId ?? firstNonEmpty(ctx.user.userId, ctx.getVariables().userId) ?? 'anonymous',
    roleCodes: roles,
    department: actor.department ?? firstNonEmpty(ctx.user.department) ?? 'unknown',
  };
  const variables = ctx.getVariables();
  return {
    traceId,
    actor: auditActor,
    patientId,
    visitId,
    roles,
    purpose: 'similar-case-only',
    agentId: metadata?.agentId ?? firstNonEmpty(variables.agentId, ctx.user.agentId) ?? 'orchestrator-similar-case-query',
    agentVersion: metadata?.agentVersion ?? firstNonEmpty(variables.agentVersion) ?? '1.0.0',
    versions,
    queryText: metadata?.queryText ?? firstNonEmpty(variables.similarCaseQuery, ctx.input.similarCaseQuery) ?? '',
  };
}

/**
 * 调用 S-13 隔离服务执行相似病例查询；返回分区内命中片段深拷贝，不做相似度打分。
 * 阻断原因码由 S-13 透传，编排侧不二次映射、不吞掉审计事件。
 */
export function invokeSimilarCaseQuery(deps: SimilarCaseQueryDeps): IsolationVerdict {
  const service = deps.service ?? getPatientIsolationService({ auditService: deps.auditService });
  const verdict = service.querySimilarCases(deps.query);
  return {
    ...verdict,
    hits: verdict.hits.map((chunk) => ({ ...chunk, provenance: { ...chunk.provenance } })),
  };
}

/** 工具节点标识（与 S-13 常量保持一致，便于监控台账按工具聚合） */
export const SIMILAR_CASE_TOOL_ID = ISOLATION_TOOL_ID;
