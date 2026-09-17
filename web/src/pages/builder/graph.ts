/**
 * 健澜科技杠OS - 画布模型与 AgentPackage DSL 双向转换
 *
 * 画布内部使用 React Flow 的 nodes/edges（扁平 config 便于表单编辑）；
 * 导出时严格映射为后端编排层期望的 DSL（字段名 mode/branches 等），
 * 生成的 agent.yaml 可直接放入 agents/ 目录被引擎加载。
 *
 * Copyright (c) 2026 健澜科技.
 */

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type {
  AgentMeta,
  BuilderEdge,
  BuilderNode,
  NodeConfig,
  NodeType,
} from '@/types/builder';

/** 画布节点 config → 后端 DSL 节点 config（按类型映射字段名） */
function toDslConfig(type: NodeType, c: NodeConfig): Record<string, unknown> {
  switch (type) {
    case 'start':
      return {};
    case 'end':
      return { outputMapping: c.outputMapping ?? {} };
    case 'llm':
      return {
        model: c.model,
        temperature: c.temperature,
        maxTokens: c.maxTokens,
        stream: c.stream,
        systemPrompt: c.systemPrompt || '',
        userTemplate: c.userTemplate || '',
        jsonMode: c.jsonMode,
        knowledgeBase: c.knowledgeBase,
      };
    case 'tool':
      return {
        toolName: c.toolName,
        inputMapping: c.inputMapping ?? {},
        requireConfirmation: c.requireConfirmation,
        requireDoubleConfirm: c.requireDoubleConfirm,
        readOnly: c.readOnly,
      };
    case 'rag':
      return {
        knowledgeBases: c.knowledgeBases ?? [],
        query: c.query ?? '',
        topK: c.topK ?? 5,
        scoreThreshold: c.scoreThreshold ?? 0.35,
        strategy: c.strategy ?? 'hybrid',
        authoritativeOnly: c.authoritativeOnly,
        outputVariable: c.outputVariable ?? 'retrieval',
      };
    case 'condition':
      return {
        mode: c.mode ?? 'if-else',
        switchOn: c.switchOn,
        branches: c.branches ?? [],
        cases: c.cases,
        defaultPort: c.defaultPort ?? 'false',
      };
    case 'loop':
      return {
        mode: c.loopMode ?? 'foreach',
        whileCondition: c.whileCondition,
        collection: c.collection,
        itemVariable: c.itemVariable,
        indexVariable: c.indexVariable,
        bodyEntry: c.bodyEntry,
        maxIterations: c.maxIterations ?? 1000,
      };
    case 'parallel':
      return {
        mode: c.parallelMode ?? 'all',
        concurrency: c.concurrency ?? 4,
        branches: c.parallelBranches ?? [],
        requiredSuccessCount: c.requiredSuccessCount,
        timeoutMs: c.timeoutMs,
      };
    case 'human':
      return {
        title: c.title ?? '人工审核',
        instructions: c.instructions ?? '',
        assigneeRoles: c.assigneeRoles ?? ['doctor'],
        formSchema: c.formSchema ?? {},
        timeoutMs: c.timeoutMs,
        escalateToRoles: c.escalateToRoles,
      };
    case 'subagent':
      return {
        agentId: c.agentId,
        inputMapping: c.inputMapping ?? {},
        mode: c.collaborationMode ?? 'delegate',
        consultationAgents: c.consultationAgents,
        timeoutMs: c.timeoutMs,
      };
    case 'code':
      return { assignments: c.assignments ?? {} };
    case 'delay':
      return { durationMs: c.durationMs ?? 1000 };
    default:
      return {};
  }
}

/** 后端 DSL config → 画布扁平 config */
function fromDslConfig(type: NodeType, dsl: Record<string, unknown>): NodeConfig {
  const c: NodeConfig = { ...(dsl as NodeConfig) };
  if (type === 'loop') {
    c.loopMode = (dsl.mode as NodeConfig['loopMode']) ?? 'foreach';
    c.parallelBranches = undefined;
  }
  if (type === 'parallel') {
    c.parallelMode = (dsl.mode as NodeConfig['parallelMode']) ?? 'all';
    c.parallelBranches = (dsl.branches as NodeConfig['parallelBranches']) ?? [];
  }
  if (type === 'subagent') {
    c.collaborationMode = (dsl.mode as NodeConfig['collaborationMode']) ?? 'delegate';
  }
  return c;
}

export interface AgentPackageJson {
  packageFormatVersion?: string;
  agent: Record<string, unknown>;
  prompts?: Record<string, string>;
  checksum?: string;
}

/** 画布 → AgentPackage JSON */
export function builderToPackage(
  nodes: BuilderNode[],
  edges: BuilderEdge[],
  meta: AgentMeta,
): AgentPackageJson {
  const dslNodes = nodes.map((n) => ({
    id: n.id,
    type: n.data.nodeType,
    name: n.data.name,
    position: n.position,
    config: toDslConfig(n.data.nodeType, n.data.config),
    ...(n.data.description ? { description: n.data.description } : {}),
  }));
  const dslEdges = edges.map((e) => ({
    id: e.id,
    source: e.source,
    ...(e.sourceHandle && e.sourceHandle !== 'out' ? { sourcePort: e.sourceHandle } : {}),
    target: e.target,
    ...(e.dataMapping && Object.keys(e.dataMapping).length ? { dataMapping: e.dataMapping } : {}),
  }));

  const agent = {
    id: meta.id,
    name: meta.name,
    ...(meta.nameEn ? { nameEn: meta.nameEn } : {}),
    version: meta.version,
    category: meta.category,
    tags: meta.tags,
    description: meta.description,
    allowedRoles: meta.allowedRoles,
    riskLevel: meta.riskLevel,
    builtin: meta.builtin,
    tools: meta.tools,
    knowledgeBases: meta.knowledgeBases,
    model: {
      provider: 'jianlan',
      model: meta.model,
      temperature: meta.temperature,
    },
    systemPrompt: meta.systemPrompt || 'prompts/system.md',
    entryWorkflow: 'main',
    workflows: [
      {
        meta: { id: 'main', name: meta.name, version: meta.version },
        nodes: dslNodes,
        edges: dslEdges,
      },
    ],
    triggers: [{ type: 'manual', enabled: true }, { type: 'api', enabled: true }],
    disclaimer: meta.disclaimer,
    enabled: true,
  };

  return {
    packageFormatVersion: '1.0.0',
    agent,
    prompts: meta.systemPrompt ? { 'prompts/system.md': meta.systemPrompt } : {},
  };
}

/** AgentPackage JSON → 画布 nodes/edges/meta */
export function packageToBuilder(pkg: AgentPackageJson): {
  nodes: BuilderNode[];
  edges: BuilderEdge[];
  meta: AgentMeta;
} {
  const a = pkg.agent as Record<string, any>;
  const wf = (a.workflows as Array<Record<string, any>>)?.find(
    (w) => w.meta?.id === a.entryWorkflow,
  ) ?? (a.workflows as Array<Record<string, any>>)?.[0];

  const nodes: BuilderNode[] = (wf?.nodes ?? []).map((n: Record<string, any>) => ({
    id: n.id,
    type: 'medicalNode' as const,
    position: n.position ?? { x: 0, y: 0 },
    data: {
      nodeType: n.type as NodeType,
      name: n.name ?? n.id,
      description: n.description,
      config: fromDslConfig(n.type as NodeType, (n.config ?? {}) as Record<string, unknown>),
    },
  }));

  const edges: BuilderEdge[] = (wf?.edges ?? []).map((e: Record<string, any>) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourcePort ?? 'out',
    dataMapping: e.dataMapping,
  }));

  const model = (a.model as Record<string, any>) ?? {};
  const meta: AgentMeta = {
    id: a.id,
    name: a.name,
    nameEn: a.nameEn,
    version: a.version ?? '1.0.0',
    category: a.category ?? '电子病历',
    description: a.description ?? '',
    riskLevel: a.riskLevel ?? 'low',
    allowedRoles: a.allowedRoles ?? ['doctor'],
    tools: a.tools ?? [],
    knowledgeBases: a.knowledgeBases ?? [],
    systemPrompt: pkg.prompts?.['prompts/system.md'] ?? (typeof a.systemPrompt === 'string' ? a.systemPrompt : ''),
    model: model.model ?? 'sonnet',
    temperature: model.temperature ?? 0.2,
    tags: a.tags ?? [],
    builtin: a.builtin ?? false,
    disclaimer:
      a.disclaimer ??
      '本智能体输出为临床辅助建议，不能替代医生面诊与诊断，最终诊疗决策由经治医师负责。',
  };

  return { nodes, edges, meta };
}

export function toYaml(pkg: AgentPackageJson): string {
  return stringifyYaml(pkg, { lineWidth: 120 });
}

export function parsePackageText(text: string): AgentPackageJson {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed) as AgentPackageJson;
  return parseYaml(trimmed) as AgentPackageJson;
}

/** 新建节点的默认 id 与坐标 */
export function newNodeId(type: NodeType, existing: BuilderNode[]): string {
  const base = type === 'start' ? 'start' : type === 'end' ? 'end' : type;
  let id = base;
  let i = 1;
  const ids = new Set(existing.map((n) => n.id));
  while (ids.has(id)) {
    id = `${base}_${i++}`;
  }
  return id;
}
