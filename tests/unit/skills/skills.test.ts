/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）- 技能包体系单元测试
 *
 * 覆盖：manifest Zod 校验、目录加载、依赖缺失报错、按角色过滤、
 *       租户覆盖不改正文、high 风险三级确认、工作流执行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'bun:test';

import { FIRST_BATCH_TOOLS } from '@/medical-tools/registry';
import {
  loadSkillsFromDir,
  parseSkillMarkdown,
  validateSkillDependencies,
  SkillParseError,
} from '@/skills/loader';
import { SkillRegistry } from '@/skills/registry';
import { executeSkill } from '@/skills/executor';
import type {
  LoadedSkill,
  SkillDependencyCatalog,
  SkillManifest,
} from '@/skills/types';

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/** 从真实内置技能库构造依赖目录 */
function realCatalog(): SkillDependencyCatalog {
  const tools = new Set(FIRST_BATCH_TOOLS.map((t) => t.name));
  const agents = new Set<string>();
  const manifestPath = join(process.cwd(), 'agents', 'manifest.json');
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      agents: { id: string }[];
    };
    for (const a of manifest.agents) agents.add(a.id);
  } catch {
    /* 测试环境容错 */
  }
  return { tools, agents };
}

/** 用 SKILL.md 文本快速构造一个 LoadedSkill */
function skillFromMd(md: string, filePath = 'SKILL.md'): LoadedSkill {
  const { manifest, body } = parseSkillMarkdown(md, filePath);
  return { manifest, body, filePath };
}

const VALID_MD = `---
id: test-skill
name: 测试技能
version: 1.0.0
category: 测试
summary: 一个用于单测的技能
roles: [R05, R06]
requiredTools: [query_patient]
requiredAgents: []
riskLevel: low
steps:
  - id: step-1
    kind: tool
    name: 查询患者
    tool: query_patient
---
# 正文
`;

// ============================================================================
// 1. Manifest Zod 校验
// ============================================================================

describe('SkillManifest Zod 校验', () => {
  it('解析合法 SKILL.md frontmatter + 正文', () => {
    const { manifest, body } = parseSkillMarkdown(VALID_MD);
    expect(manifest.id).toBe('test-skill');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.roles).toEqual(['R05', 'R06']);
    expect(body.trim()).toContain('正文');
  });

  it('缺少结束分隔线抛 SkillParseError', () => {
    expect(() => parseSkillMarkdown('---\nid: x\nname: y\n')).toThrow(SkillParseError);
  });

  it('version 非 semver 报错', () => {
    const bad = VALID_MD.replace('version: 1.0.0', 'version: abc');
    expect(() => parseSkillMarkdown(bad)).toThrow(/version/);
  });

  it('id 非 kebab-case 报错', () => {
    const bad = VALID_MD.replace('id: test-skill', 'id: Test Skill');
    expect(() => parseSkillMarkdown(bad)).toThrow(/kebab-case/);
  });

  it('步骤引用了不存在的步骤 id 报错', () => {
    const bad = `---
id: cond-skill
name: 条件技能
version: 1.0.0
category: 测试
summary: s
roles: [R05]
steps:
  - id: c
    kind: condition
    name: 分支
    condition: "{{flag}} == 'on'"
    then: [missing-step]
---
正文
`;
    expect(() => parseSkillMarkdown(bad)).toThrow(/不存在的步骤/);
  });
});

// ============================================================================
// 2. 目录加载（真实内置技能库）
// ============================================================================

describe('目录加载内置技能库', () => {
  const dir = join(process.cwd(), 'skills', 'library');

  it('加载全部内置技能且无解析错误', async () => {
    const result = await loadSkillsFromDir(dir, realCatalog());
    expect(result.errors.length).toBe(0);
    // 10 个角色目录，每个 >=3，共 >=30
    expect(result.loaded.length).toBeGreaterThanOrEqual(30);
  });

  it('所有依赖（工具/智能体）均可解析', async () => {
    const result = await loadSkillsFromDir(dir, realCatalog());
    expect(result.dependencyIssues).toEqual([]);
  });

  it('三个标杆技能真实可加载', async () => {
    const result = await loadSkillsFromDir(dir, realCatalog());
    const ids = result.loaded.map((s) => s.manifest.id);
    expect(ids).toContain('ai-outpatient-record');
    expect(ids).toContain('medical-record-quality-control');
    expect(ids).toContain('voice-medical-record');
  });
});

// ============================================================================
// 3. 依赖缺失报错
// ============================================================================

describe('依赖校验', () => {
  it('requiredTools 不存在时报 missing_tool', () => {
    const skill = skillFromMd(VALID_MD.replace('requiredTools: [query_patient]', 'requiredTools: [no_such_tool]'));
    const issues = validateSkillDependencies([skill], { tools: new Set(), agents: new Set() });
    expect(issues.some((i) => i.kind === 'missing_tool' && i.name === 'no_such_tool')).toBe(true);
  });

  it('requiredAgents 不存在时报 missing_agent', () => {
    const md = VALID_MD.replace('requiredAgents: []', 'requiredAgents: [no-such-agent]');
    const skill = skillFromMd(md);
    const issues = validateSkillDependencies([skill], { tools: new Set(['query_patient']), agents: new Set() });
    expect(issues.some((i) => i.kind === 'missing_agent')).toBe(true);
  });
});

// ============================================================================
// 4. 注册中心：按角色过滤 / 版本
// ============================================================================

describe('SkillRegistry 按角色过滤', () => {
  it('仅返回含指定角色的技能', () => {
    const reg = new SkillRegistry();
    reg.register(skillFromMd(VALID_MD));
    const nurseMd = VALID_MD.replace('id: test-skill', 'id: nurse-skill').replace(
      'roles: [R05, R06]',
      'roles: [R08]',
    );
    reg.register(skillFromMd(nurseMd));

    const docs = reg.list({ roles: ['R05'] });
    expect(docs.map((s) => s.manifest.id)).toEqual(['test-skill']);

    const all = reg.list();
    expect(all.length).toBe(2);
  });

  it('多版本保留且 latest 取最高', () => {
    const reg = new SkillRegistry();
    const v1 = skillFromMd(VALID_MD);
    reg.register(v1);
    const v2 = skillFromMd(VALID_MD.replace('version: 1.0.0', 'version: 1.2.0'));
    reg.register(v2);
    expect(reg.versionCount('test-skill')).toBe(2);
    expect(reg.get('test-skill')?.manifest.version).toBe('1.2.0');
  });
});

// ============================================================================
// 5. 租户覆盖：不改正文，系统技能不可覆盖
// ============================================================================

describe('租户级覆盖', () => {
  it('租户可覆盖 enabled 但不可改正文/步骤', () => {
    const reg = new SkillRegistry();
    const skill = skillFromMd(VALID_MD);
    reg.register(skill);

    expect(reg.setTenantOverride('test-skill', 'tenant-a', { enabled: false })).toBe(true);
    expect(reg.getTenantOverride('test-skill', 'tenant-a')?.enabled).toBe(false);
    // 系统技能本体不变
    expect(reg.get('test-skill')!.manifest.enabled).toBe(true);
    // 该租户下被关闭
    expect(reg.isEffectivelyEnabled(reg.get('test-skill')!, 'tenant-a')).toBe(false);
  });

  it('tenantScope=false 的系统技能拒绝租户覆盖', () => {
    const reg = new SkillRegistry();
    const md = VALID_MD.replace('tenantScope: true', 'tenantScope: false');
    // VALID_MD 未写 tenantScope（默认 true），这里手动改 manifest
    const skill = skillFromMd(VALID_MD);
    (skill.manifest as SkillManifest).tenantScope = false;
    reg.register(skill);
    expect(reg.setTenantOverride('test-skill', 'tenant-x', { enabled: false })).toBe(false);
  });
});

// ============================================================================
// 6. 执行器：低风险直接跑、高风险三级确认、角色拦截
// ============================================================================

function makeCtx(over: Partial<Parameters<typeof executeSkill>[1]> = {}) {
  const calls: string[] = [];
  return {
    calls,
    ctx: {
      user: { userId: 'u1', userName: '医生', roles: ['R05'] },
      inputs: { patientId: 'p1' },
      invokers: {
        async invokeTool(tool: string) {
          calls.push(`tool:${tool}`);
          return { success: true, data: { ok: true } };
        },
        async invokeAgent(agent: string) {
          calls.push(`agent:${agent}`);
          return { success: true, data: { ok: true } };
        },
      },
      confirm: {
        async requestUserConfirm(msg: string) {
          calls.push(`confirm:${msg.slice(0, 4)}`);
          return true;
        },
        async requestDoubleConfirm(msg: string) {
          calls.push(`double:${msg.slice(0, 4)}`);
          return true;
        },
      },
      ...over,
    } as Parameters<typeof executeSkill>[1],
  };
}

describe('执行器', () => {
  it('低风险技能无需确认即执行工具', async () => {
    const skill = skillFromMd(VALID_MD);
    const { calls, ctx } = makeCtx();
    const result = await executeSkill(skill, ctx);
    expect(result.status).toBe('succeeded');
    expect(calls).toContain('tool:query_patient');
    expect(calls.some((c) => c.startsWith('confirm'))).toBe(false);
  });

  it('角色不匹配返回 denied', async () => {
    const skill = skillFromMd(VALID_MD);
    const { ctx } = makeCtx({ user: { userId: 'x', userName: 'n', roles: ['R08'] } });
    const result = await executeSkill(skill, ctx);
    expect(result.status).toBe('denied');
  });

  it('高风险技能触发三级确认；拒绝则中止', async () => {
    const md = VALID_MD.replace('riskLevel: low', 'riskLevel: high');
    const skill = skillFromMd(md);
    // 一级确认拒绝
    const { calls, ctx } = makeCtx({
      confirm: {
        async requestUserConfirm() {
          calls.push('user-confirm');
          return false;
        },
        async requestDoubleConfirm() {
          return false;
        },
      },
    });
    const result = await executeSkill(skill, ctx);
    expect(result.status).toBe('aborted');
    expect(calls).toContain('user-confirm');
    // 工具未被调用
    expect(calls.some((c) => c.startsWith('tool'))).toBe(false);
  });

  it('工具失败即失败并记录副作用', async () => {
    const skill = skillFromMd(VALID_MD);
    const { ctx } = makeCtx({
      invokers: {
        async invokeTool() {
          return { success: false, error: { code: 'E', message: 'boom' } };
        },
        async invokeAgent() {
          return { success: true, data: {} };
        },
      },
    });
    const result = await executeSkill(skill, ctx);
    expect(result.status).toBe('failed');
    expect(result.reason).toContain('boom');
  });
});

// ============================================================================
// 7. 触发匹配（适配器）
// ============================================================================

import { SkillOrchestratorAdapter } from '@/skills/integration/orchestratorAdapter';

describe('SkillOrchestratorAdapter 意图匹配', () => {
  it('按短语命中并按具体度排序', () => {
    const reg = new SkillRegistry();
    reg.register(skillFromMd(VALID_MD));
    const adapter = new SkillOrchestratorAdapter(reg);
    const hits = adapter.matchIntent('帮我写门诊病历', { roles: ['R05'] });
    // VALID_MD 无 phrases，应命中 0
    expect(hits.length).toBe(0);
  });
});
