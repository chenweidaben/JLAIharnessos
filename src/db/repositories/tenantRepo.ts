/**
 * 健澜科技 jlmedaios - 租户 / 院区 Repository
 *
 * iam.tenants 持久化读写。承载「平台级」租户注册表：
 *  - BFF 启动时 listAll() 把节点加载到 TenantService（hydrate）；
 *  - 管理端写操作经 upsert() 写穿透，先落库再更新内存。
 *
 * 层级校验、默认租户保护、级联软删等业务规则在 TenantService 层；
 * 本仓储只负责原始行的读写与映射。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import type { Tenant, TenantId } from '../../tenant/types';

const TENANT_COLS = `
  id, name, level, parent_id, enabled, config, created_at, updated_at, deleted_at
`;

function mapTenant(row: Record<string, unknown>): Tenant {
  return {
    id: String(row.id),
    name: String(row.name),
    level: row.level as Tenant['level'],
    parentId: row.parent_id ? String(row.parent_id) : undefined,
    enabled: Boolean(row.enabled),
    config: (row.config ?? {}) as Record<string, unknown>,
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    deletedAt: row.deleted_at ? String(row.deleted_at) : undefined,
  };
}

/** 列出全部租户节点（含停用/软删，供启动加载与管理端使用） */
export async function listAllTenants(sql?: DbExecutor): Promise<Tenant[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(TENANT_COLS)} FROM iam.tenants ORDER BY level, created_at
  `;
  return (rows as Record<string, unknown>[]).map(mapTenant);
}

/** 按 id 取租户节点；不存在返回 null */
export async function getTenantById(id: TenantId, sql?: DbExecutor): Promise<Tenant | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(TENANT_COLS)} FROM iam.tenants WHERE id = ${id}
  `;
  return rows.length > 0 ? mapTenant(rows[0] as Record<string, unknown>) : null;
}

/**
 * 插入或更新一个租户节点（写穿透）。
 * 以 id 为冲突键，全字段覆盖（保留 created_at 不变）。
 */
export async function upsertTenant(node: Tenant, sql?: DbExecutor): Promise<Tenant> {
  const db = sql ?? getDb();
  const config = JSON.parse(JSON.stringify(node.config ?? {}));
  const rows = await db`
    INSERT INTO iam.tenants (id, name, level, parent_id, enabled, config, created_at, updated_at, deleted_at)
    VALUES (
      ${node.id}, ${node.name}, ${node.level}, ${node.parentId ?? null},
      ${node.enabled}, ${config}::jsonb,
      ${node.createdAt}, now(), ${node.deletedAt ?? null}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      level = EXCLUDED.level,
      parent_id = EXCLUDED.parent_id,
      enabled = EXCLUDED.enabled,
      config = EXCLUDED.config,
      updated_at = now(),
      deleted_at = EXCLUDED.deleted_at
    RETURNING ${db.unsafe(TENANT_COLS)}
  `;
  return mapTenant(rows[0] as Record<string, unknown>);
}
