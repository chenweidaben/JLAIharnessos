/**
 * 健澜科技 jlmedaios - 低代码智能体搭建聚合器（M4-B）
 *
 * 对接可视化画布：保存草稿、结构与语义校验、发布（SemVer 版本管理 + SHA-256 校验和）、
 * 删除，并把全部动作写入哈希链审计。
 *
 * 安全边界：
 *  - 读写经 agent:build、发布经 agent:publish 权限（路由层强制）；
 *  - 只有智能体所有者（owner_id）或管理员能修改 / 发布 / 删除；
 *  - 发布前必须通过结构（zod schema）与语义（DSL validator：孤立边 / 环 / 不可达 /
 *    工具与知识库引用）校验，任何 error 都会阻断发布；
 *  - 编排 DSL 为纯声明式数据，不含可执行代码；表达式受白名单沙箱约束，安装与发布安全。
 *
 * 执行（运行已发布智能体、执行实例与事件持久化）由后续切片接入，不在本切片范围。
 *
 * 版权所有（c）2026 杭州健澜科技有限公司
 */

import { withTx } from '../../db/pool.js';
import {
  deleteAgent,
  deleteVersionsByAgent,
  getAgentByAgentId,
  getDraftVersion,
  getLatestPublishedVersion,
  insertAgent,
  insertPublishedVersion,
  listAgents,
  listVersions,
  markAgentEnabled,
  updateAgentMeta,
  upsertDraftVersion,
  DRAFT_VERSION,
  type AgentRecord,
  type AgentVersionRecord,
} from '../../db/repositories/agentBuilderRepo.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { DslLoadError, loadAgentPackage } from '../../orchestrator/dsl/loader.js';
import { PACKAGE_FORMAT_VERSION, AgentPackManager } from '../../orchestrator/pack/AgentPackManager.js';
import { AgentRegistry } from '../../orchestrator/agent/AgentRegistry.js';
import type { AgentDefinition, AgentPackage, ValidationResult } from '../../orchestrator/dsl/types.js';
import type { AuthView } from '../view/userView.js';

export class AgentBuilderError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AgentBuilderError';
  }
}

const badRequest = (m: string) => new AgentBuilderError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new AgentBuilderError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new AgentBuilderError(409, 'CONFLICT', m);

/** 校验和计算（computeChecksum 为纯函数，无需真实注册中心） */
const packManager = new AgentPackManager(new AgentRegistry());

/** 智能体业务标识合法性：小写字母 / 数字 / 连字符 / 下划线，2-64 位 */
const AGENT_ID_RE = /^[a-z0-9][a-z0-9_-]{1,63}$/;

/** 版本递增类型 */
export type BumpKind = 'major' | 'minor' | 'patch';

// ============================================================================
// 视图模型
// ============================================================================

export interface AgentSummary {
  agentId: string;
  name: string;
  nameEn: string | null;
  category: string;
  riskLevel: string;
  description: string;
  status: string;
  currentVersion: string | null;
  versionCount: number;
  hasDraft: boolean;
  ownerId: string | null;
  builtin: boolean;
  updatedAt: string;
}

export interface AgentDetail {
  agent: AgentRecord;
  versions: AgentVersionRecord[];
  draft: AgentVersionRecord | null;
}

// ============================================================================
// 查询
// ============================================================================

/** 列出智能体（含版本数与草稿标记） */
export async function listBuilderAgents(actor: AuthView): Promise<AgentSummary[]> {
  const records = await listAgents();
  return Promise.all(
    records.map(async (r) => {
      const versions = await listVersions(r.agentId);
      return {
        agentId: r.agentId,
        name: r.name,
        nameEn: r.nameEn,
        category: r.category,
        riskLevel: r.riskLevel,
        description: r.description,
        status: r.status,
        currentVersion: r.currentVersion,
        versionCount: versions.filter((v) => v.published).length,
        hasDraft: versions.some((v) => v.version === DRAFT_VERSION),
        ownerId: r.ownerId,
        builtin: r.builtin,
        updatedAt: r.updatedAt,
      };
    }),
  );
}

/** 获取智能体详情（含版本列表与草稿定义） */
export async function getBuilderAgent(actor: AuthView, agentId: string): Promise<AgentDetail> {
  const agent = await getAgentByAgentId(agentId);
  if (!agent) throw notFound('智能体不存在');
  const versions = await listVersions(agentId);
  const draft = await getDraftVersion(agentId);
  return { agent, versions, draft };
}

// ============================================================================
// 保存草稿
// ============================================================================

/**
 * 保存画布草稿。
 * @param pkg 前端 builderToPackage 输出的智能体包（{packageFormatVersion, agent, prompts}）
 */
export async function saveDraft(
  actor: AuthView,
  pkg: unknown,
): Promise<{ agentId: string; created: boolean; validation: ValidationResult }> {
  // 结构解析（schema 失败 → 400）
  let parsed: ReturnType<typeof loadAgentPackage>;
  try {
    parsed = loadAgentPackage(pkg);
  } catch (e) {
    if (e instanceof DslLoadError) throw badRequest(e.message);
    throw e;
  }
  const agentDef = parsed.pkg.agent;
  const prompts = parsed.pkg.prompts;

  if (!AGENT_ID_RE.test(agentDef.id)) {
    throw badRequest('智能体标识不合法：需 2-64 位小写字母、数字、连字符或下划线，且以字母或数字开头');
  }

  const existing = await getAgentByAgentId(agentDef.id);
  const created = !existing;
  if (existing) assertCanManage(actor, existing);

  return withTx(async (tx) => {
    if (created) {
      await insertAgent(
        {
          agentId: agentDef.id,
          name: agentDef.name,
          nameEn: agentDef.nameEn,
          category: agentDef.category,
          riskLevel: agentDef.riskLevel,
          description: agentDef.description,
          tags: agentDef.tags,
          allowedRoles: agentDef.allowedRoles,
          tools: agentDef.tools,
          knowledgeBases: agentDef.knowledgeBases ?? [],
          builtin: agentDef.builtin ?? false,
          ownerId: actor.id,
        },
        tx,
      );
    } else {
      await updateAgentMeta(
        agentDef.id,
        {
          name: agentDef.name,
          nameEn: agentDef.nameEn,
          category: agentDef.category,
          riskLevel: agentDef.riskLevel,
          description: agentDef.description,
          tags: agentDef.tags,
          allowedRoles: agentDef.allowedRoles,
          tools: agentDef.tools,
          knowledgeBases: agentDef.knowledgeBases ?? [],
        },
        tx,
      );
    }

    const draftChecksum = packManager.computeChecksum({
      packageFormatVersion: PACKAGE_FORMAT_VERSION,
      agent: agentDef,
      prompts,
      packagedAt: new Date().toISOString(),
    });
    await upsertDraftVersion(
      {
        agentId: agentDef.id,
        definition: agentDef as unknown as Record<string, unknown>,
        prompts,
        checksum: draftChecksum,
      },
      tx,
    );

    await recordChainAudit(
      {
        actorId: actor.id,
        action: 'agent.draft.save',
        resourceType: 'agent',
        resourceId: agentDef.id,
        result: 'success',
        riskLevel: agentDef.riskLevel === 'high' ? 'medium' : 'low',
        detail: { created, version: agentDef.version },
      },
      tx,
    );

    return {
      agentId: agentDef.id,
      created,
      validation: mergeValidation(parsed.validations),
    };
  });
}

// ============================================================================
// 校验
// ============================================================================

/** 对草稿做结构与语义校验，返回问题清单（不阻断、不写库） */
export async function validateDraft(
  actor: AuthView,
  agentId: string,
): Promise<{ agentId: string; validation: ValidationResult }> {
  const agent = await getAgentByAgentId(agentId);
  if (!agent) throw notFound('智能体不存在');
  const draft = await getDraftVersion(agentId);
  if (!draft) throw conflict('尚无草稿，请先在画布保存');

  const reassembled: AgentPackage = {
    packageFormatVersion: PACKAGE_FORMAT_VERSION,
    agent: draft.definition as unknown as AgentDefinition,
    prompts: draft.prompts,
    packagedAt: new Date().toISOString(),
    checksum: 'validate-only',
  };

  let validation: ValidationResult;
  try {
    const parsed = loadAgentPackage(reassembled);
    validation = mergeValidation(parsed.validations);
  } catch (e) {
    if (e instanceof DslLoadError) {
      validation = { valid: false, issues: [{ severity: 'error', code: 'SCHEMA_INVALID', message: e.message }] };
    } else {
      throw e;
    }
  }
  return { agentId, validation };
}

// ============================================================================
// 发布
// ============================================================================

/**
 * 发布草稿：校验通过 → SemVer 新版本 → 校验和 → 正式版本入库。
 */
export async function publishDraft(
  actor: AuthView,
  agentId: string,
  input: { bump?: BumpKind; changelog?: string } = {},
): Promise<{ agentId: string; version: string; checksum: string }> {
  const agent = await getAgentByAgentId(agentId);
  if (!agent) throw notFound('智能体不存在');
  assertCanManage(actor, agent);

  const draft = await getDraftVersion(agentId);
  if (!draft) throw conflict('尚无草稿，无法发布');

  // 计算新版本号
  const latest = await getLatestPublishedVersion(agentId);
  const bump: BumpKind = input.bump ?? 'minor';
  const newVersion = latest ? bumpSemver(latest.version, bump) : '1.0.0';

  // 用新版本构造发布定义
  const releaseAgent = structuredClone(draft.definition) as unknown as AgentDefinition;
  releaseAgent.version = newVersion;
  releaseAgent.enabled = true;

  const pkgWithoutChecksum = {
    packageFormatVersion: PACKAGE_FORMAT_VERSION,
    agent: releaseAgent,
    prompts: draft.prompts,
    packagedAt: new Date().toISOString(),
  };
  const checksum = packManager.computeChecksum(pkgWithoutChecksum);

  // 先做一次完整校验，确保发布内容合法
  const verify = loadAgentPackage({ ...pkgWithoutChecksum, checksum });
  const validation = mergeValidation(verify.validations);
  if (!validation.valid) {
    throw conflict(`校验未通过，不能发布：${validation.issues.map((i) => i.message).join('；')}`);
  }

  await withTx(async (tx) => {
    await insertPublishedVersion(
      {
        agentId,
        version: newVersion,
        definition: releaseAgent as unknown as Record<string, unknown>,
        prompts: draft.prompts,
        checksum,
        changelog: input.changelog ?? null,
        publishedBy: actor.id,
      },
      tx,
    );
    await markAgentEnabled(agentId, newVersion, tx);
    await recordChainAudit(
      {
        actorId: actor.id,
        action: 'agent.publish',
        resourceType: 'agent',
        resourceId: agentId,
        result: 'success',
        riskLevel: releaseAgent.riskLevel === 'high' ? 'high' : 'medium',
        detail: { version: newVersion, bump, checksum },
      },
      tx,
    );
  });

  return { agentId, version: newVersion, checksum };
}

// ============================================================================
// 删除
// ============================================================================

/** 删除智能体及其全部版本（仅所有者或管理员） */
export async function removeBuilderAgent(
  actor: AuthView,
  agentId: string,
): Promise<void> {
  const agent = await getAgentByAgentId(agentId);
  if (!agent) throw notFound('智能体不存在');
  assertCanManage(actor, agent);

  await withTx(async (tx) => {
    await deleteVersionsByAgent(agentId, tx);
    await deleteAgent(agentId, tx);
    await recordChainAudit(
      {
        actorId: actor.id,
        action: 'agent.delete',
        resourceType: 'agent',
        resourceId: agentId,
        result: 'success',
        riskLevel: 'medium',
        detail: { name: agent.name },
      },
      tx,
    );
  });
}

// ============================================================================
// 辅助
// ============================================================================

/** 权限校验：管理员放行，否则须为所有者 */
function assertCanManage(actor: AuthView, agent: AgentRecord): void {
  if (actor.rawRoles.includes('admin')) return;
  if (agent.ownerId && agent.ownerId === actor.id) return;
  throw new AgentBuilderError(403, 'FORBIDDEN', '只有智能体所有者或管理员可以执行此操作');
}

/** 合并多个工作流的校验结果为一个 */
function mergeValidation(validations: ValidationResult[]): ValidationResult {
  const issues = validations.flatMap((v) => v.issues);
  return { valid: !issues.some((i) => i.severity === 'error'), issues };
}

/** SemVer 递增 */
function bumpSemver(version: string, bump: BumpKind): string {
  const parts = version.split('.').map((v) => Number.parseInt(v, 10));
  let major = parts[0] ?? 0;
  let minor = parts[1] ?? 0;
  let patch = parts[2] ?? 0;
  if (bump === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}
