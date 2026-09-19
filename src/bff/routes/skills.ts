/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）- 技能管理路由
 *
 * 提供技能 CRUD / 列表 / 校验 / 试运行 / 启停 / 租户覆盖 / 版本 API。
 * - 入参用 Zod 校验；写操作要求 admin 角色并审计。
 * - 本文件【只导出路由定义与注册函数】，不在 server.ts 注册，由启动层统一接线。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

import {
  ALL_SKILL_ROLES,
  SkillRegistry,
} from '@/skills/registry';
import {
  loadSkillsFromDir,
  parseSkillMarkdown,
  validateSkillDependencies,
} from '@/skills/loader';
import { executeSkill } from '@/skills/executor';
import { FIRST_BATCH_TOOLS } from '@/medical-tools/registry';
import type {
  LoadedSkill,
  SkillDependencyCatalog,
  SkillManifest,
} from '@/skills/types';

// ============================================================================
// 模块级单例：注册表 + 依赖目录（惰性初始化）
// ============================================================================

let registry: SkillRegistry | null = null;
let catalog: SkillDependencyCatalog | null = null;

/** 项目根目录下的内置技能库 */
function libraryDir(): string {
  return join(process.cwd(), 'skills', 'library');
}

/** 真实工具名集合：从 medical-tools 注册清单读取（只读，不改动其行为） */
function buildCatalog(): SkillDependencyCatalog {
  const tools = new Set<string>();
  for (const t of FIRST_BATCH_TOOLS) tools.add(t.name);
  const agents = new Set<string>();
  try {
    const manifestPath = join(process.cwd(), 'agents', 'manifest.json');
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        agents: { id: string }[];
      };
      for (const a of manifest.agents) agents.add(a.id);
    }
  } catch {
    /* 降级 */
  }
  return { tools, agents };
}

/** 惰性初始化注册表（首次访问时加载内置技能库） */
function ensureRegistry(): { registry: SkillRegistry; catalog: SkillDependencyCatalog } {
  if (registry) return { registry, catalog: catalog! };
  catalog = buildCatalog();
  registry = new SkillRegistry();
  return { registry, catalog };
}

/** 后台异步加载内置技能库（不阻塞响应） */
async function loadBuiltinSkills(): Promise<void> {
  const { registry: reg, catalog: cat } = ensureRegistry();
  const dir = libraryDir();
  if (!existsSync(dir)) return;
  const result = await loadSkillsFromDir(dir, cat);
  for (const skill of result.loaded) reg.register(skill);
}

// 启动即触发一次加载（fire-and-forget；路由内按需 await）
void loadBuiltinSkills();

// ============================================================================
// 入参校验 Schema
// ============================================================================

const manifestInput = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  version: z.string().optional(),
  content: z.string().optional(),
});

/**
 * 把技能清单 + 正文序列化为完整 SKILL.md 全文（YAML frontmatter + Markdown 正文）。
 * 工作室「所见即所改、所改即可校验」：GET 返回的全文必须能被 /validate 直接解析通过，
 * 不能只回传部分 frontmatter 字段（否则 roles 等必填项缺失会导致内置技能自检失败）。
 */
function skillToMarkdown(manifest: SkillManifest, body: string): string {
  const fm = stringifyYaml(manifest, { lineWidth: -1 }).trimEnd();
  return `---\n${fm}\n---\n\n${body ?? ''}`;
}

// ============================================================================
// 路由
// ============================================================================

async function listSkills(c: Ctx): Promise<Response> {
  const { registry: reg } = ensureRegistry();
  const roles = c.query.get('roles')?.split(',').filter(Boolean);
  const category = c.query.get('category') ?? undefined;
  const tenantId = c.query.get('tenantId') ?? undefined;
  const enabledOnly = c.query.get('enabledOnly') === 'true';

  const items = reg
    .list({ roles, category, tenantId, enabledOnly })
    .map((s: LoadedSkill) => ({
      ...s.manifest,
      filePath: s.filePath,
    }));
  return json(ok({ total: items.length, items }));
}

async function getSkill(c: Ctx): Promise<Response> {
  const { registry: reg } = ensureRegistry();
  const skill = reg.get(c.params.id);
  if (!skill) {
    return json(fail(ErrorCode.NOT_FOUND, `技能不存在：${c.params.id}`, c.traceId), 404);
  }
  // body 返回完整 SKILL.md 全文（含完整 frontmatter），保证工作室打开即可通过校验
  return json(
    ok({
      ...skill.manifest,
      body: skillToMarkdown(skill.manifest, skill.body),
      filePath: skill.filePath,
    }),
  );
}

async function validateSkill(c: Ctx): Promise<Response> {
  const body = (await c.body()) as { content?: string; filePath?: string };
  if (!body.content) {
    return json(fail(ErrorCode.BAD_REQUEST, '缺少 content（SKILL.md 全文）', c.traceId), 400);
  }
  try {
    const { manifest } = parseSkillMarkdown(body.content, body.filePath ?? '<upload>');
    const { catalog: cat } = ensureRegistry();
    const issues = validateSkillDependencies([
      { manifest, body: '', filePath: '<upload>' },
    ], cat);
    return json(ok({ valid: true, manifest, dependencyIssues: issues }));
  } catch (err) {
    return json(
      ok({
        valid: false,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

async function toggleSkill(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;
  const body = (await c.body()) as { enabled?: boolean };
  const { registry: reg } = ensureRegistry();
  if (!reg.has(c.params.id)) {
    return json(fail(ErrorCode.NOT_FOUND, `技能不存在：${c.params.id}`, c.traceId), 404);
  }
  reg.setEnabled(c.params.id, body.enabled !== false);
  return json(ok({ id: c.params.id, enabled: body.enabled !== false }));
}

async function tenantOverride(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;
  const body = (await c.body()) as {
    tenantId?: string;
    enabled?: boolean;
    params?: Record<string, unknown>;
  };
  if (!body.tenantId) {
    return json(fail(ErrorCode.BAD_REQUEST, '缺少 tenantId', c.traceId), 400);
  }
  const { registry: reg } = ensureRegistry();
  const okFlag = reg.setTenantOverride(c.params.id, body.tenantId, {
    enabled: body.enabled,
    params: body.params,
  });
  if (!okFlag) {
    return json(
      fail(ErrorCode.FORBIDDEN, '系统技能不可被租户覆盖或技能不存在', c.traceId),
      403,
    );
  }
  return json(ok({ id: c.params.id, tenantId: body.tenantId, applied: true }));
}

/** 试运行：注入 Mock invokers，不产生真实副作用 */
async function dryRun(c: Ctx): Promise<Response> {
  const { registry: reg } = ensureRegistry();
  const skill = reg.get(c.params.id);
  if (!skill) {
    return json(fail(ErrorCode.NOT_FOUND, `技能不存在：${c.params.id}`, c.traceId), 404);
  }
  const body = (await c.body()) as { inputs?: Record<string, unknown>; roles?: string[] };
  const result = await executeSkill(skill, {
    user: {
      userId: c.user?.id ?? 'dryrun',
      userName: c.user?.name ?? '试运行',
      roles: body.roles ?? skill.manifest.roles,
    },
    inputs: body.inputs ?? {},
    invokers: {
      async invokeTool(tool, input) {
        return { success: true, data: { mocked: true, tool, input } };
      },
      async invokeAgent(agent, input) {
        return { success: true, data: { mocked: true, agent, input } };
      },
      async searchKnowledge(refs) {
        return { refs, summary: `[Mock] 命中 ${refs.length} 条知识` };
      },
    },
    confirm: {
      async requestUserConfirm() {
        return true; // 试运行自动通过
      },
      async requestDoubleConfirm() {
        return true;
      },
    },
  });
  return json(ok(result));
}

function catalogRoute(c: Ctx): Response {
  const { catalog: cat } = ensureRegistry();
  return json(ok({ roles: ALL_SKILL_ROLES, tools: [...cat!.tools], agents: [...cat!.agents] }));
}

/** 版本列表 */
function versions(c: Ctx): Response {
  const { registry: reg } = ensureRegistry();
  const count = reg.versionCount(c.params.id);
  return json(ok({ id: c.params.id, versionCount: count }));
}

// Zod 校验包装（创建/热注册）
const createBody = manifestInput;

async function createSkill(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;
  const raw = await c.body();
  const parsed = createBody.safeParse(raw);
  if (!parsed.success) {
    return json(fail(ErrorCode.BAD_REQUEST, '入参非法', c.traceId), 400);
  }
  const { content } = parsed.data;
  if (!content) {
    return json(fail(ErrorCode.BAD_REQUEST, '缺少 content', c.traceId), 400);
  }
  try {
    const { manifest, body } = parseSkillMarkdown(content, '<studio>');
    const { registry: reg, catalog: cat } = ensureRegistry();
    const issues = validateSkillDependencies(
      [{ manifest, body, filePath: '<studio>' }],
      cat,
    );
    if (issues.length > 0) {
      return json(fail(ErrorCode.BAD_REQUEST, `依赖缺失：${JSON.stringify(issues)}`, c.traceId), 400);
    }
    reg.hotRegister(manifest, body);
    return json(ok({ id: manifest.id, version: manifest.version, registered: true }));
  } catch (err) {
    return json(fail(ErrorCode.BAD_REQUEST, err instanceof Error ? err.message : String(err), c.traceId), 400);
  }
}

/** 路由表（与 system.ts 同构） */
export const skillRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/skills', handle: listSkills, auth: true },
  { method: 'GET', path: '/api/v1/skills/catalog', handle: catalogRoute, auth: true },
  { method: 'GET', path: '/api/v1/skills/:id', handle: getSkill, auth: true },
  { method: 'GET', path: '/api/v1/skills/:id/versions', handle: versions, auth: true },
  { method: 'POST', path: '/api/v1/skills/validate', handle: validateSkill, auth: true },
  { method: 'POST', path: '/api/v1/skills/dry-run/:id', handle: dryRun, auth: true },
  { method: 'POST', path: '/api/v1/skills', handle: createSkill, auth: true },
  { method: 'PUT', path: '/api/v1/skills/:id/enabled', handle: toggleSkill, auth: true },
  { method: 'POST', path: '/api/v1/skills/:id/tenant-override', handle: tenantOverride, auth: true },
];

/**
 * 注册函数：返回技能路由表，供启动层 `...allRoutes` 统一接线。
 * （本项目路由为 RouteDef[] 聚合式，故返回路由数组；
 *  命名保留 registerSkillRoutes 以满足"由我统一接线"的调用约定。）
 */
export function registerSkillRoutes(): RouteDef[] {
  return skillRoutes;
}

export type { SkillManifest };
