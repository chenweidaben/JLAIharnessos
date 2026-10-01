/**
 * 健澜科技 jlmedaios - 哈希链审计写入 Repository
 *
 * 写入真实的 audit.audit_logs（BEFORE INSERT 触发器自动维护 seq/prev_hash/hash 哈希链，
 * 链式防篡改）。住院 ADT 等真实事务全程经此记录。
 *
 * 并发完整性（迁移 68）：
 * - 无外部事务（tx 未传）：在显式事务内先 SELECT … FOR UPDATE 锁链头行，
 *   使并发写入按链头行锁串行化，杜绝分叉；唯一约束 uq_audit_chain_prev 兜底，
 *   冲突时自动重试（最多 3 次）。
 * - 外部事务（tx 已传）：沿用调用方事务，冲突由唯一约束抛出（调用方回滚/重试）。
 *
 * 说明：历史 auditRepo.writeAuditLog 指向不存在的 audit.audit_log，且未被业务调用；
 * 本模块为住院闭环补齐“真实可验证”的审计落库路径。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor, type Sql } from '../pool.js';
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

const MAX_CHAIN_RETRY = 3;
const UNIQUE_VIOLATION = '23505';

/** 在给定执行器上执行一次链头加锁读取 + 插入，返回 seq */
async function insertChained(
  db: DbExecutor,
  input: ChainAuditInput,
  detail: string,
): Promise<number> {
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

/** 独立事务路径：事务首句取 advisory 锁（串行化）→ 插入 → 提交；唯一冲突自动重试 */
async function insertWithChainLock(
  db: Sql,
  input: ChainAuditInput,
  detail: string,
): Promise<number> {
  for (let attempt = 1; attempt <= MAX_CHAIN_RETRY; attempt += 1) {
    try {
      return await db.begin(async (tx) => {
        // 事务第一条语句获取 advisory 锁：并发写入串行排队；
        // INSERT 作为事务内新语句，语句级快照读到最新链头（杜绝分叉）
        await tx`SELECT pg_advisory_xact_lock(hashtext('audit.audit_logs.chain'))`;
        return insertChained(tx, input, detail);
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === UNIQUE_VIOLATION && attempt < MAX_CHAIN_RETRY) {
        // 分叉被唯一约束拦截：重试（重新拿锁、重读链头）
        continue;
      }
      throw e;
    }
  }
  throw new Error('audit chain insert failed after retries');
}

/**
 * 写入一条哈希链审计记录，返回自增 seq。
 * - 未传 tx：独立显式事务（链头行锁 + 唯一约束 + 重试），并发安全。
 * - 传入 tx：沿用调用方事务，保证“业务变更 + 审计”同提交/同回滚；
 *   并发冲突由唯一约束抛出，调用方决定重试或回滚。
 * 注意列名以真实 audit.audit_logs 为准：client_ip / actor_name / risk_level；
 * 科室、就诊号等无独立列的信息并入 detail。
 */
export async function recordChainAudit(input: ChainAuditInput, tx?: DbExecutor): Promise<number> {
  const detail = toJson({
    ...(input.actorDept ? { dept: input.actorDept } : {}),
    ...(input.visitRef ? { visitRef: input.visitRef } : {}),
    ...(input.detail ?? {}),
  });
  if (tx) {
    // 调用方事务内：先取 advisory 锁（与并发写入串行化），
    // 残余冲突由唯一约束抛出（调用方回滚/重试）
    await tx`SELECT pg_advisory_xact_lock(hashtext('audit.audit_logs.chain'))`;
    return insertChained(tx, input, detail);
  }
  return insertWithChainLock(getDb(), input, detail);
}
