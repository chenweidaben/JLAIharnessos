/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）- 技能包（Skill）类型定义
 *
 * 【三层边界】
 *  - Tool（手）：src/medical-tools 下约 37 个原子医疗能力。
 *  - Skill（SOP）：本模块。声明式、可复用、可版本化的"场景化能力包"，
 *    = 一份 SKILL.md（YAML frontmatter + Markdown 工作流正文）+ 可选资源。
 *    技能描述"什么场景、由什么角色、按什么步骤、调用哪些工具/知识、风险等级与所需权限"。
 *  - Agent（员工）：src/orchestrator 下面向角色的自主执行单元，会按 SOP 调用工具。
 *
 * 本文件仅定义类型与 Zod 校验 schema，不包含运行时副作用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 */

import { z } from 'zod';

// ============================================================================
// 枚举
// ============================================================================

/**
 * 技能风险等级（与 medical-tools / security 的风险语义对齐）。
 *  - low    只读/建议类，无需人工确认
 *  - medium 写操作但可逆，需用户确认
 *  - high   高风险写操作（处方/医嘱/危急值上报/归档），强制三级风险确认 + 审计
 */
export const SkillRiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;
export type SkillRiskLevel = (typeof SkillRiskLevel)[keyof typeof SkillRiskLevel];

/**
 * 技能可用角色编码。
 * 严格对齐 src/security/types.ts 的 RoleCode 枚举值（R01..R12），
 * 不另起一套权限体系。
 */
export const SkillRole = {
  SYSTEM_ADMIN: 'R01',
  DEPARTMENT_HEAD: 'R02',
  CHIEF_PHYSICIAN: 'R03',
  ASSOCIATE_CHIEF_PHYSICIAN: 'R04',
  ATTENDING_PHYSICIAN: 'R05',
  RESIDENT_PHYSICIAN: 'R06',
  VISITING_PHYSICIAN: 'R07',
  NURSE: 'R08',
  PHARMACIST: 'R09',
  TECHNICIAN: 'R10',
  PATIENT: 'R11',
  GUEST: 'R12',
} as const;
export type SkillRole = (typeof SkillRole)[keyof typeof SkillRole];

/** 工作流步骤类型 */
export const SkillStepKind = {
  /** 调用一个医疗工具（src/medical-tools） */
  TOOL: 'tool',
  /** 委派一个智能体（src/orchestrator） */
  AGENT: 'agent',
  /** 检索/引用知识库 */
  KNOWLEDGE: 'knowledge',
  /** 人工确认节点（医生/药师/护士长复核） */
  HUMAN_CONFIRM: 'human_confirm',
  /** 条件分支 */
  CONDITION: 'condition',
  /** 并行子步骤 */
  PARALLEL: 'parallel',
} as const;
export type SkillStepKind = (typeof SkillStepKind)[keyof typeof SkillStepKind];

/** 触发方式 */
export const SkillTriggerKind = {
  /** 自然语言短语命中（意图） */
  PHRASE: 'phrase',
  /** 定时调度（cron 表达式） */
  SCHEDULE: 'schedule',
  /** 事件驱动（如危急值推送、检验报告回传） */
  EVENT: 'event',
} as const;
export type SkillTriggerKind = (typeof SkillTriggerKind)[keyof typeof SkillTriggerKind];

// ============================================================================
// Zod Schema
// ============================================================================

/** 工作流步骤 */
export const SkillStepSchema = z
  .object({
    /** 步骤唯一 id（技能内唯一，kebab-case） */
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9][a-z0-9-]*$/, '步骤 id 须为 kebab-case'),
    /** 步骤类型 */
    kind: z.enum(['tool', 'agent', 'knowledge', 'human_confirm', 'condition', 'parallel']),
    /** 步骤名称（面向操作者） */
    name: z.string().min(1),
    /** 步骤说明 */
    description: z.string().optional(),
    /** kind=tool 时：调用的医疗工具名（须真实存在于 medical-tools 注册表） */
    tool: z.string().optional(),
    /** kind=agent 时：委派的智能体 id（须真实存在于 orchestrator） */
    agent: z.string().optional(),
    /** 工具/智能体入参（支持 {{变量}} 模板，运行时由上下文填充） */
    input: z.record(z.string(), z.unknown()).optional(),
    /** kind=knowledge 时：引用的知识库条目 id */
    knowledgeRefs: z.array(z.string()).optional(),
    /** kind=human_confirm 时：人工确认提示语 */
    confirmMessage: z.string().optional(),
    /** kind=human_confirm 时：要求的复核角色（缺省同技能角色） */
    confirmRoles: z.array(z.string()).optional(),
    /** kind=condition 时：条件表达式（安全子集：`{{expr}} == 'value'`） */
    condition: z.string().optional(),
    /** 条件成立时执行的步骤 id 列表 */
    then: z.array(z.string()).optional(),
    /** 条件不成立时执行的步骤 id 列表 */
    otherwise: z.array(z.string()).optional(),
    /** kind=parallel 时：并行执行的步骤 id 列表 */
    parallel: z.array(z.string()).optional(),
    /** 本步骤要求的额外角色（缺省继承技能角色） */
    requiredRoles: z.array(z.string()).optional(),
    /** 单步超时（毫秒） */
    timeoutMs: z.number().int().positive().optional(),
  })
  .passthrough()
  .superRefine((step, ctx) => {
    if (step.kind === 'tool' && !step.tool) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tool'],
        message: "kind=tool 的步骤必须声明 tool 字段",
      });
    }
    if (step.kind === 'agent' && !step.agent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agent'],
        message: "kind=agent 的步骤必须声明 agent 字段",
      });
    }
    if (step.kind === 'knowledge' && (!step.knowledgeRefs || step.knowledgeRefs.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['knowledgeRefs'],
        message: "kind=knowledge 的步骤必须声明非空 knowledgeRefs",
      });
    }
    if (step.kind === 'human_confirm' && !step.confirmMessage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmMessage'],
        message: "kind=human_confirm 的步骤必须声明 confirmMessage",
      });
    }
    if (step.kind === 'condition' && !step.condition) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['condition'],
        message: "kind=condition 的步骤必须声明 condition 表达式",
      });
    }
    if (step.kind === 'parallel' && (!step.parallel || step.parallel.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['parallel'],
        message: "kind=parallel 的步骤必须声明非空 parallel 步骤 id 列表",
      });
    }
  });

/** 触发器 */
export const SkillTriggerSchema = z
  .object({
    /** 自然语言短语（命中即触发） */
    phrases: z.array(z.string()).optional(),
    /** 定时调度（cron 表达式，5 段） */
    schedule: z.string().optional(),
    /** 事件名（如 medical.critical_value / lab.report.ready） */
    event: z.string().optional(),
  })
  .passthrough();

/**
 * 技能清单（SkillManifest）—— SKILL.md frontmatter 的强类型形态。
 */
export const SkillManifestSchema = z
  .object({
    /** 技能唯一 id（kebab-case，全局唯一） */
    id: z
      .string()
      .min(2)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, '技能 id 须为 kebab-case'),
    /** 技能名称（面向用户） */
    name: z.string().min(1),
    /** 语义化版本号 major.minor.patch */
    version: z
      .string()
      .regex(/^\d+\.\d+\.\d+$/, 'version 须为 semver（major.minor.patch）'),
    /** 业务分类（门诊/住院/护理/药学/医技/质控/管理/急诊/患者服务/系统管理） */
    category: z.string().min(1),
    /** 一句话摘要 */
    summary: z.string().min(1),
    /** 详细描述（适用场景、收益、注意事项） */
    description: z.string().optional().default(''),
    /** 图标（AntD icon 名或 emoji） */
    icon: z.string().optional().default('ToolOutlined'),
    /** 触发器 */
    triggers: SkillTriggerSchema.optional().default({}),
    /** 可使用该技能的角色（RoleCode 值 R01..R12） */
    roles: z.array(z.nativeEnum(SkillRole)).min(1, '至少需要一个可使用角色'),
    /** 依赖的医疗工具名（须真实存在） */
    requiredTools: z.array(z.string()).default([]),
    /** 依赖的智能体 id（须真实存在） */
    requiredAgents: z.array(z.string()).default([]),
    /** 引用的知识库条目 id */
    requiredKnowledge: z.array(z.string()).default([]),
    /** 引用的 CDS 规则名 */
    requiredCdsRules: z.array(z.string()).default([]),
    /** 风险等级 */
    riskLevel: z.enum(['low', 'medium', 'high']).default('low'),
    /** 所需权限点（与既有 RBAC PermissionKey 对齐，如 emr:create:self） */
    permissions: z.array(z.string()).default([]),
    /** 输入 schema 描述（JSON Schema 片段） */
    inputSchema: z
      .object({
        type: z.string().optional(),
        properties: z.record(z.string(), z.unknown()).optional(),
        required: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    /** 输出 schema 描述 */
    outputSchema: z
      .object({
        type: z.string().optional(),
        properties: z.record(z.string(), z.unknown()).optional(),
      })
      .passthrough()
      .optional(),
    /** 是否启用 */
    enabled: z.boolean().default(true),
    /** 是否允许租户/院区级覆盖（仅覆盖 enabled 与参数，不可改技能本体） */
    tenantScope: z.boolean().default(true),
    /** 作者 */
    author: z.string().default('健澜科技'),
    /** 标签 */
    tags: z.array(z.string()).default([]),
    /** 工作流步骤（正文之外的结构化编排；正文为可读说明） */
    steps: z.array(SkillStepSchema).default([]),
  })
  .passthrough()
  .superRefine((m, ctx) => {
    // 校验步骤 id 唯一
    const seen = new Set<string>();
    for (const s of m.steps ?? []) {
      if (seen.has(s.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps'],
          message: `步骤 id 重复：${s.id}`,
        });
      }
      seen.add(s.id);
    }
    // 引用的步骤 id 必须存在
    const refs = new Set<string>();
    for (const s of m.steps ?? []) {
      for (const list of [s.then, s.otherwise, s.parallel]) {
        for (const r of list ?? []) refs.add(r);
      }
    }
    for (const r of refs) {
      if (!seen.has(r)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps'],
          message: `步骤引用了不存在的步骤 id：${r}`,
        });
      }
    }
  });

// ============================================================================
// 推导类型
// ============================================================================

/** 技能清单（运行时类型） */
export type SkillManifest = z.infer<typeof SkillManifestSchema>;
/** 工作流步骤 */
export type SkillStep = z.infer<typeof SkillStepSchema>;
/** 触发器 */
export type SkillTrigger = z.infer<typeof SkillTriggerSchema>;

/** 一份已加载技能：清单 + 正文 Markdown + 来源路径 */
export interface LoadedSkill {
  manifest: SkillManifest;
  /** SKILL.md 正文（frontmatter 之后的 Markdown 工作流说明） */
  body: string;
  /** 来源绝对路径 */
  filePath: string;
}

/** 依赖目录：用于校验 requiredTools / requiredAgents 是否真实存在 */
export interface SkillDependencyCatalog {
  /** 全部可用医疗工具名 */
  tools: ReadonlySet<string>;
  /** 全部可用智能体 id */
  agents: ReadonlySet<string>;
}

/** 校验出的依赖问题 */
export interface SkillDependencyIssue {
  skillId: string;
  kind: 'missing_tool' | 'missing_agent';
  name: string;
}
