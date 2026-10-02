/**
 * 健澜科技 jlmedaios - 智能体定义 / 版本 Repository（M4-B）
 *
 * agent.agents / agent.agent_versions 读写，支撑低代码画布的保存、发布与版本管理。
 *
 * 版本模型：
 *  - 画布每次保存写入（或覆盖）一条 version='draft' 的草稿版本（published=false）；
 *  - 发布时由聚合器对草稿做结构与语义校验，计算 SemVer 新版本号与 SHA-256 校验和，
 *    插入一条正式版本（published=true），并回写 agents.current_version / status。
 *
 * 并发与一致性：
 *  - agents 以 agent_id 为业务唯一键，保存用 INSERT ... ON CONFLICT 回查，保证幂等；
 *  - 所有函数接受可选事务句柄，保证版本发布与审计同提交同回滚。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';
import { getDb, type DbExecutor } from '../pool.js';

// ============================================================================
// 类型
// ============================================================================

export interface AgentRecord {
  id: string;
  agentId: string;
  name: string;
  nameEn: string | null;
  category: string;
  riskLevel: string;
  description: string;
  tags: string[];
  allowedRoles: string[];
  tools: string[];
  knowledgeBases: string[];
  builtin: boolean;
  status: string;
  currentVersion: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentVersionRecord {
  id: string;
  agentId: string;
  version: string;
  definition: Record<string, unknown>;
  prompts: Record<string, string>;
  checksum: string | null;
  changelog: string | null;
  published: boolean;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
}

/** 草稿版本的固定版本号 */
export const DRAFT_VERSION = 'draft';

function parseJsonb<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

// ============================================================================
// agents
// ============================================================================

/** 列出全部智能体（按更新时间倒序） */
export async function listAgents(exec?: DbExecutor): Promise<AgentRecord[]> {
  const db = exec ?? getDb();
  const rows = await db`
    SELECT * FROM agent.agents ORDER BY updated_at DESC
  `;
  return rows.map(mapAgent);
}

/** 按业务标识获取智能体 */
export async function getAgentByAgentId(
  agentId: string,
  exec?: DbExecutor,
): Promise<AgentRecord | null> {
  const db = exec ?? getDb();
  const rows = await db`
    SELECT * FROM agent.agents WHERE agent_id = ${agentId} LIMIT 1
  `;
  return rows.length ? mapAgent(rows[0]) : null;
}

/** 新建智能体（agent_id 冲突时回查既有记录，保证幂等） */
export async function insertAgent(
  input: {
    agentId: string;
    name: string;
    nameEn?: string | null;
    category: string;
    riskLevel: string;
    description: string;
    tags: string[];
    allowedRoles: string[];
    tools: string[];
    knowledgeBases: string[];
    builtin?: boolean;
    ownerId?: string | null;
  },
  exec?: DbExecutor,
): Promise<AgentRecord> {
  const db = exec ?? getDb();
  const rows = await db`
    INSERT INTO agent.agents (
      id, agent_id, name, name_en, category, risk_level, description,
      tags, allowed_roles, tools, knowledge_bases, builtin, status,
      current_version, owner_id
    ) VALUES (
      ${randomUUID()}, ${input.agentId}, ${input.name}, ${input.nameEn ?? null},
      ${input.category}, ${input.riskLevel}, ${input.description},
      ${input.tags}::jsonb, ${input.allowedRoles}::jsonb,
      ${input.tools}::jsonb, ${input.knowledgeBases}::jsonb,
      ${input.builtin ?? false}, 'draft', '0.0.0', ${input.ownerId ?? null}
    )
    ON CONFLICT (agent_id) DO UPDATE SET updated_at = now()
    RETURNING *
  `;
  return mapAgent(rows[0]);
}

/** 更新智能体元信息（保存草稿时同步画布上的元信息） */
export async function updateAgentMeta(
  agentId: string,
  patch: {
    name?: string;
    nameEn?: string | null;
    category?: string;
    riskLevel?: string;
    description?: string;
    tags?: string[];
    allowedRoles?: string[];
    tools?: string[];
    knowledgeBases?: string[];
  },
  exec?: DbExecutor,
): Promise<AgentRecord | null> {
  const db = exec ?? getDb();
  const rows = await db`
    UPDATE agent.agents SET
      name = COALESCE(${patch.name ?? null}, name),
      name_en = COALESCE(${patch.nameEn ?? null}, name_en),
      category = COALESCE(${patch.category ?? null}, category),
      risk_level = COALESCE(${patch.riskLevel ?? null}, risk_level),
      description = COALESCE(${patch.description ?? null}, description),
      tags = COALESCE(${patch.tags ?? null}::jsonb, tags),
      allowed_roles = COALESCE(${patch.allowedRoles ?? null}::jsonb, allowed_roles),
      tools = COALESCE(${patch.tools ?? null}::jsonb, tools),
      knowledge_bases = COALESCE(${patch.knowledgeBases ?? null}::jsonb, knowledge_bases),
      updated_at = now()
    WHERE agent_id = ${agentId}
    RETURNING *
  `;
  return rows.length ? mapAgent(rows[0]) : null;
}

/** 发布后回写状态为已启用与当前版本（状态模型：draft / enabled / disabled） */
export async function markAgentEnabled(
  agentId: string,
  version: string,
  exec?: DbExecutor,
): Promise<AgentRecord | null> {
  const db = exec ?? getDb();
  const rows = await db`
    UPDATE agent.agents
    SET status = 'enabled', current_version = ${version}, updated_at = now()
    WHERE agent_id = ${agentId}
    RETURNING *
  `;
  return rows.length ? mapAgent(rows[0]) : null;
}

/** 删除智能体（调用方需先删除版本） */
export async function deleteAgent(agentId: string, exec?: DbExecutor): Promise<void> {
  const db = exec ?? getDb();
  await db`DELETE FROM agent.agents WHERE agent_id = ${agentId}`;
}

// ============================================================================
// agent_versions
// ============================================================================

/** 列出智能体的全部版本（草稿在前，正式版本按创建时间倒序） */
export async function listVersions(
  agentId: string,
  exec?: DbExecutor,
): Promise<AgentVersionRecord[]> {
  const db = exec ?? getDb();
  const rows = await db`
    SELECT * FROM agent.agent_versions
    WHERE agent_id = ${agentId}
    ORDER BY (version = 'draft') DESC, created_at DESC
  `;
  return rows.map(mapVersion);
}

/** 获取草稿版本 */
export async function getDraftVersion(
  agentId: string,
  exec?: DbExecutor,
): Promise<AgentVersionRecord | null> {
  return getVersion(agentId, DRAFT_VERSION, exec);
}

/** 按版本号获取 */
export async function getVersion(
  agentId: string,
  version: string,
  exec?: DbExecutor,
): Promise<AgentVersionRecord | null> {
  const db = exec ?? getDb();
  const rows = await db`
    SELECT * FROM agent.agent_versions
    WHERE agent_id = ${agentId} AND version = ${version}
    LIMIT 1
  `;
  return rows.length ? mapVersion(rows[0]) : null;
}

/** 获取最近一个已发布版本 */
export async function getLatestPublishedVersion(
  agentId: string,
  exec?: DbExecutor,
): Promise<AgentVersionRecord | null> {
  const db = exec ?? getDb();
  const rows = await db`
    SELECT * FROM agent.agent_versions
    WHERE agent_id = ${agentId} AND published = true
    ORDER BY published_at DESC
    LIMIT 1
  `;
  return rows.length ? mapVersion(rows[0]) : null;
}

/** 保存（覆盖）草稿版本；草稿也计算 checksum，保证内容完整性可核验 */
export async function upsertDraftVersion(
  input: {
    agentId: string;
    definition: Record<string, unknown>;
    prompts: Record<string, string>;
    checksum: string;
  },
  exec?: DbExecutor,
): Promise<AgentVersionRecord> {
  const db = exec ?? getDb();
  const rows = await db`
    INSERT INTO agent.agent_versions (
      id, agent_id, version, definition, prompts, checksum,
      changelog, published, published_by, published_at
    ) VALUES (
      ${randomUUID()}, ${input.agentId}, 'draft',
      ${input.definition}::jsonb, ${input.prompts}::jsonb,
      ${input.checksum}, NULL, false, NULL, NULL
    )
    ON CONFLICT (agent_id, version) DO UPDATE SET
      definition = EXCLUDED.definition,
      prompts = EXCLUDED.prompts,
      checksum = EXCLUDED.checksum,
      created_at = now()
    RETURNING *
  `;
  return mapVersion(rows[0]);
}

/** 插入一条正式发布版本 */
export async function insertPublishedVersion(
  input: {
    agentId: string;
    version: string;
    definition: Record<string, unknown>;
    prompts: Record<string, string>;
    checksum: string;
    changelog?: string | null;
    publishedBy: string;
  },
  exec?: DbExecutor,
): Promise<AgentVersionRecord> {
  const db = exec ?? getDb();
  const rows = await db`
    INSERT INTO agent.agent_versions (
      id, agent_id, version, definition, prompts, checksum,
      changelog, published, published_by, published_at
    ) VALUES (
      ${randomUUID()}, ${input.agentId}, ${input.version},
      ${input.definition}::jsonb, ${input.prompts}::jsonb,
      ${input.checksum}, ${input.changelog ?? null},
      true, ${input.publishedBy}, now()
    )
    ON CONFLICT (agent_id, version) DO UPDATE SET
      checksum = EXCLUDED.checksum,
      definition = EXCLUDED.definition,
      prompts = EXCLUDED.prompts,
      published = true,
      published_by = EXCLUDED.published_by,
      published_at = now()
    RETURNING *
  `;
  return mapVersion(rows[0]);
}

/** 删除智能体的全部版本 */
export async function deleteVersionsByAgent(
  agentId: string,
  exec?: DbExecutor,
): Promise<void> {
  const db = exec ?? getDb();
  await db`DELETE FROM agent.agent_versions WHERE agent_id = ${agentId}`;
}

// ============================================================================
// 行映射
// ============================================================================

function mapAgent(row: Record<string, unknown>): AgentRecord {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    name: String(row.name),
    nameEn: row.name_en != null ? String(row.name_en) : null,
    category: String(row.category),
    riskLevel: String(row.risk_level),
    description: String(row.description ?? ''),
    tags: parseJsonb<string[]>(row.tags, []),
    allowedRoles: parseJsonb<string[]>(row.allowed_roles, []),
    tools: parseJsonb<string[]>(row.tools, []),
    knowledgeBases: parseJsonb<string[]>(row.knowledge_bases, []),
    builtin: Boolean(row.builtin),
    status: String(row.status),
    currentVersion: row.current_version != null ? String(row.current_version) : null,
    ownerId: row.owner_id != null ? String(row.owner_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapVersion(row: Record<string, unknown>): AgentVersionRecord {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    version: String(row.version),
    definition: parseJsonb<Record<string, unknown>>(row.definition, {}),
    prompts: parseJsonb<Record<string, string>>(row.prompts, {}),
    checksum: row.checksum != null ? String(row.checksum) : null,
    changelog: row.changelog != null ? String(row.changelog) : null,
    published: Boolean(row.published),
    publishedBy: row.published_by != null ? String(row.published_by) : null,
    publishedAt: row.published_at != null ? String(row.published_at) : null,
    createdAt: String(row.created_at),
  };
}
