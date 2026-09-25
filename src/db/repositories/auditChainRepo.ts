/**
 * 健澜科技 jlmedaios - 哈希链审计写入 Repository
 *
 * 写入真实的 audit.audit_logs（BEFORE INSERT 触发器自动维护 seq/prev_hash/hash 哈希链，
 * 链式防篡改）。住院 ADT 等真实事务全程经此记录。
 *
 * 说明：历史 auditRepo.writeAuditLog 指向不存在的 audit.audit_log，且未被业务调用；
 * 本模块为住院闭环补齐“真实可验证”的审计落库路径。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';

export type AuditResult = 'success' | 'failure' | 'denied';

export interface ChainAuditInput {
  actorId: string; // iam 用户 UUID（操作者）
  actorName?: string | null;
  actorRole?: string | null;
  actorDept?: string | null; // 并入 detail（审计表无独立列）
  action: string; // 如 inpatient.admit / inpatient.bed_change / inpatient.transfer / inpatient.discharge
  resourceType: string; // visit / bed / ward
  resourceId?: string | null;
  patientRef?: string | null;
  visitRef?: string | null; // 并入 detail
  riskLevel?: 'low' | 'medium' | 'high' | null;
  ip?: string | null;
  userAgent?: string | null;
  result?: AuditResult;
  detail?: Record<string, unknown>;
}

/**
 * 写入一条哈希链审计记录，返回自增 seq。
 * 可在事务内（传入 tx）写入，保证“业务变更 + 审计”同提交/同回滚。
 * 注意列名以真实 audit.audit_logs 为准：client_ip / actor_name / risk_level；
 * 科室、就诊号等无独立列的信息并入 detail。
 */
export async function recordChainAudit(input: ChainAuditInput, tx?: DbExecutor): Promise<number> {
  const db = tx ?? getDb();
  const detail = toJson({
    ...(input.actorDept ? { dept: input.actorDept } : {}),
    ...(input.visitRef ? { visitRef: input.visitRef } : {}),
    ...(input.detail ?? {}),
  });
  const rows = await db`
    INSERT INTO audit.audit_logs (
      actor_id, actor_name, actor_role, action, resource_type, resource_id,
      patient_ref, result, risk_level, client_ip, user_agent, detail
    ) VALUES (
      ${input.actorId}, ${input.actorName ?? null}, ${input.actorRole ?? null},
      ${input.action}, ${input.resourceType}, ${input.resourceId ?? null},
      ${input.patientRef ?? null}, ${input.result ?? 'success'}, ${input.riskLevel ?? null},
      ${input.ip ?? null}, ${input.userAgent ?? null}, ${db.json(detail)}
    )
    RETURNING seq
  `;
  return Number(rows[0]?.seq ?? 0);
}
