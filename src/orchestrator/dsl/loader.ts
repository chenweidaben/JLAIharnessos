/**
 * 健澜科技杠OS - DSL 加载器
 *
 * 负责将 YAML/JSON 形式的工作流、智能体、智能体包解析为强类型对象，
 * 并依次执行 Zod 结构校验与（可选的）语义校验。低代码画布保存、
 * Agent 市场导入、文件系统加载均统一走本加载器。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import {
  agentPackageSchema,
  agentSchema,
  workflowSchema,
} from './schema.js';
import {
  validateWorkflow,
  type ReferenceResolver,
  NULL_REFERENCE_RESOLVER,
} from '../engine/validator.js';
import type {
  AgentDefinition,
  AgentPackage,
  ValidationResult,
  WorkflowDefinition,
} from './types.js';

/** DSL 加载错误 */
export class DslLoadError extends Error {
  constructor(
    message: string,
    public readonly zodIssues?: z.ZodError['issues'],
  ) {
    super(message);
    this.name = 'DslLoadError';
  }
}

/** 支持的文本格式 */
export type DslFormat = 'yaml' | 'json';

/** 探测格式 */
function detectFormat(text: string, hint?: DslFormat): DslFormat {
  if (hint) return hint;
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  return 'yaml';
}

/** 解析文本为对象 */
export function parseDslText(text: string, format?: DslFormat): unknown {
  const fmt = detectFormat(text, format);
  try {
    return fmt === 'json' ? JSON.parse(text) : parseYaml(text);
  } catch (e) {
    throw new DslLoadError(`DSL ${fmt.toUpperCase()} 解析失败: ${(e as Error).message}`);
  }
}

/** 加载并校验工作流 */
export function loadWorkflow(
  source: string | unknown,
  options: { format?: DslFormat; resolver?: ReferenceResolver } = {},
): { workflow: WorkflowDefinition; validation: ValidationResult } {
  const data = typeof source === 'string' ? parseDslText(source, options.format) : source;
  const parsed = workflowSchema.safeParse(data);
  if (!parsed.success) {
    throw new DslLoadError(
      `工作流结构校验失败: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      parsed.error.issues,
    );
  }
  const workflow = parsed.data as unknown as WorkflowDefinition;
  const validation = validateWorkflow(workflow, options.resolver ?? NULL_REFERENCE_RESOLVER);
  return { workflow, validation };
}

/** 加载并校验智能体（同时校验其全部工作流） */
export function loadAgent(
  source: string | unknown,
  options: { format?: DslFormat; resolver?: ReferenceResolver } = {},
): { agent: AgentDefinition; validations: ValidationResult[] } {
  const data = typeof source === 'string' ? parseDslText(source, options.format) : source;
  const parsed = agentSchema.safeParse(data);
  if (!parsed.success) {
    throw new DslLoadError(
      `智能体结构校验失败: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      parsed.error.issues,
    );
  }
  const agent = parsed.data as unknown as AgentDefinition;

  // 入口工作流必须存在
  const validations: ValidationResult[] = [];
  for (const wf of agent.workflows) {
    validations.push(validateWorkflow(wf, options.resolver ?? NULL_REFERENCE_RESOLVER));
  }
  if (!agent.workflows.some((w) => w.meta.id === agent.entryWorkflow)) {
    validations.push({
      valid: false,
      issues: [
        {
          severity: 'error',
          code: 'WORKFLOW_NOT_FOUND',
          message: `入口工作流不存在: ${agent.entryWorkflow}`,
        },
      ],
    });
  }
  return { agent, validations };
}

/** 加载并校验智能体包 */
export function loadAgentPackage(
  source: string | unknown,
  options: { format?: DslFormat; resolver?: ReferenceResolver } = {},
): { pkg: AgentPackage; validations: ValidationResult[] } {
  const data = typeof source === 'string' ? parseDslText(source, options.format) : source;
  const parsed = agentPackageSchema.safeParse(data);
  if (!parsed.success) {
    throw new DslLoadError(
      `智能体包结构校验失败: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      parsed.error.issues,
    );
  }
  const pkg = parsed.data as unknown as AgentPackage;
  const { validations } = loadAgent(pkg.agent, options);

  // 提示词引用必须能在包内 prompts 中找到
  for (const wf of pkg.agent.workflows) {
    for (const node of wf.nodes) {
      if (node.type === 'llm') {
        const ref = (node.config as { systemPrompt?: string }).systemPrompt;
        if (ref && ref.startsWith('prompts/') && !(ref in pkg.prompts)) {
          validations.push({
            valid: false,
            issues: [
              {
                severity: 'error',
                code: 'PROMPT_REF_MISSING',
                message: `工作流 ${wf.meta.id} 节点 ${node.id} 引用的提示词资源缺失: ${ref}`,
                nodeId: node.id,
              },
            ],
          });
        }
      }
    }
  }
  return { pkg, validations };
}

/** 从文件系统加载（Bun/Node 环境） */
export async function loadWorkflowFile(
  path: string,
  options: { resolver?: ReferenceResolver } = {},
): Promise<{ workflow: WorkflowDefinition; validation: ValidationResult }> {
  const fs = await import('node:fs/promises');
  const text = await fs.readFile(path, 'utf-8');
  const format: DslFormat = path.endsWith('.json') ? 'json' : 'yaml';
  return loadWorkflow(text, { format, ...options });
}

/** 序列化为 YAML/JSON 文本（画布导出/市场分发） */
export function serializeDsl(obj: unknown, format: DslFormat = 'yaml'): string {
  if (format === 'json') return JSON.stringify(obj, null, 2);
  return stringifyYaml(obj, { lineWidth: 120 });
}
