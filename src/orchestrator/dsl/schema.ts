/**
 * 健澜科技杠OS - DSL Zod 结构校验
 *
 * 在语义校验（validator.ts 的图论/引用校验）之前，先用 Zod 做结构层校验，
 * 拦截缺字段、类型错误等低级问题。各节点 config 差异较大，采用判别联合 +
 * 宽松附加字段，深度语义由 validator 与节点执行器保证。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

/** 节点类型枚举值 */
export const nodeTypeEnum = z.enum([
  'start',
  'end',
  'llm',
  'tool',
  'condition',
  'loop',
  'parallel',
  'human',
  'subagent',
  'rag',
  'code',
  'delay',
]);

/** 风险等级 */
const riskLevelEnum = z.enum(['low', 'medium', 'high']);

/** 重试策略 */
const retryPolicySchema = z.object({
  maxAttempts: z.number().int().min(0).max(10).default(1),
  initialDelayMs: z.number().min(0).default(100),
  backoffMultiplier: z.number().min(1).max(10).default(2),
  maxDelayMs: z.number().min(0).default(10_000),
  retryableErrorCodes: z.array(z.string()).optional(),
  retryableErrorPattern: z.string().optional(),
});

/** 错误处理 */
const errorHandlingSchema = z.object({
  retry: retryPolicySchema.optional(),
  fallbackNode: z.string().optional(),
  compensationNode: z.string().optional(),
  continueOnError: z.boolean().optional(),
});

/** 节点（config 按判别联合，未列出的键允许保留；name 缺失时以 id 兜底） */
const nodeSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, '节点 ID 须以字母开头，仅含字母数字下划线'),
    type: nodeTypeEnum,
    name: z.string().min(1).optional(),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
    config: z.record(z.string(), z.unknown()).default({}),
    errorHandling: errorHandlingSchema.optional(),
    timeoutMs: z.number().min(0).optional(),
    enabled: z.boolean().optional(),
    description: z.string().optional(),
  })
  .passthrough()
  .transform((node) => (node.name ? node : { ...node, name: node.id }));

/** 边 */
const edgeSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    sourcePort: z.string().optional(),
    target: z.string().min(1),
    dataMapping: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

/** 工作流元信息 */
const workflowMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, '版本号须为 SemVer（如 1.0.0）'),
  author: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/** 工作流定义 */
export const workflowSchema = z
  .object({
    meta: workflowMetaSchema,
    nodes: z.array(nodeSchema).min(1),
    edges: z.array(edgeSchema).default([]),
    inputSchema: z.record(z.string(), z.unknown()).optional(),
    outputSchema: z.record(z.string(), z.unknown()).optional(),
    variables: z.record(z.string(), z.unknown()).optional(),
    timeoutMs: z.number().min(0).optional(),
  })
  .passthrough();

/** 模型配置 */
const modelConfigSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().optional(),
  responseFormat: z.enum(['text', 'json']).optional(),
});

/** 触发器 */
const triggerSchema = z
  .object({
    type: z.enum(['manual', 'api', 'event', 'schedule']),
    expression: z.string().optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
  })
  .passthrough();

/** 智能体定义 */
export const agentSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-z][a-z0-9-]*$/, '智能体 ID 须为小写中划线形式（如 medical-record-writer）'),
    name: z.string().min(1),
    nameEn: z.string().optional(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, '版本号须为 SemVer'),
    category: z.string().min(1),
    tags: z.array(z.string()).default([]),
    description: z.string().min(1),
    detailedDescription: z.string().optional(),
    allowedRoles: z.array(z.string()).min(1),
    riskLevel: riskLevelEnum,
    author: z.string().optional(),
    builtin: z.boolean().optional(),
    tools: z.array(z.string()).default([]),
    knowledgeBases: z.array(z.string()).optional(),
    model: modelConfigSchema,
    systemPrompt: z.string().min(1),
    promptRefs: z.array(z.string()).optional(),
    entryWorkflow: z.string().min(1),
    workflows: z.array(workflowSchema).min(1),
    inputSchema: z.record(z.string(), z.unknown()).optional(),
    outputSchema: z.record(z.string(), z.unknown()).optional(),
    triggers: z.array(triggerSchema).optional(),
    icon: z.string().optional(),
    disclaimer: z.string().min(1),
    enabled: z.boolean().optional(),
  })
  .passthrough();

/** 智能体包 */
export const agentPackageSchema = z
  .object({
    packageFormatVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    agent: agentSchema,
    prompts: z.record(z.string(), z.string()).default({}),
    knowledgeRefs: z
      .array(
        z
          .object({
            name: z.string(),
            version: z.string().optional(),
            source: z.string(),
            license: z.string(),
          })
          .passthrough(),
      )
      .optional(),
    packagedAt: z.string().optional(),
    checksum: z.string().optional(),
  })
  .passthrough();

/** 解析并校验工作流 */
export function parseWorkflow(data: unknown): import('../dsl/types.js').WorkflowDefinition {
  return workflowSchema.parse(data) as unknown as import('../dsl/types.js').WorkflowDefinition;
}

/** 解析并校验智能体 */
export function parseAgent(data: unknown): import('../dsl/types.js').AgentDefinition {
  return agentSchema.parse(data) as unknown as import('../dsl/types.js').AgentDefinition;
}

/** 解析并校验智能体包 */
export function parseAgentPackage(data: unknown): import('../dsl/types.js').AgentPackage {
  return agentPackageSchema.parse(data) as unknown as import('../dsl/types.js').AgentPackage;
}
