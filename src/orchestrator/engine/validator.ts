/**
 * 健澜科技杠OS - 工作流 DAG 校验器
 *
 * 在工作流加载/发布前执行静态校验，确保结构合法、引用完整、无环、可达。
 * 校验分为两层：
 *   1. 结构校验（纯图论）：唯一入口、终点、悬挂边、环、不可达节点、条件端口；
 *   2. 引用校验（需外部注册表）：工具名、知识库名、子智能体 ID 是否存在。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import {
  DslIssueCode,
  type ValidationIssue,
  type ValidationResult,
  WorkflowNodeType,
  type WorkflowDefinition,
  type NodeDefinition,
  type EdgeDefinition,
} from '../dsl/types.js';

/** 引用解析器：由宿主（AgentRegistry / 工具注册表 / 知识库）提供 */
export interface ReferenceResolver {
  /** 医疗工具是否存在 */
  hasTool(name: string): boolean;
  /** 知识库是否存在 */
  hasKnowledgeBase(name: string): boolean;
  /** 子智能体是否存在 */
  hasAgent(agentId: string): boolean;
}

/** 不做引用校验时的空实现（全部视为存在） */
export const NULL_REFERENCE_RESOLVER: ReferenceResolver = {
  hasTool: () => true,
  hasKnowledgeBase: () => true,
  hasAgent: () => true,
};

function issue(
  severity: 'error' | 'warning',
  code: string,
  message: string,
  extra?: Partial<ValidationIssue>,
): ValidationIssue {
  return { severity, code, message, ...extra };
}

/**
 * 校验工作流定义
 * @param wf 工作流定义
 * @param resolver 引用解析器（可选，默认跳过引用校验）
 */
export function validateWorkflow(
  wf: WorkflowDefinition,
  resolver: ReferenceResolver = NULL_REFERENCE_RESOLVER,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const nodes = wf.nodes ?? [];
  const edges = wf.edges ?? [];

  if (nodes.length === 0) {
    issues.push(issue('error', DslIssueCode.SCHEMA_INVALID, '工作流没有任何节点'));
    return { valid: false, issues };
  }

  const nodeMap = new Map<string, NodeDefinition>();

  // ---- 1. 节点 ID 唯一 ----
  for (const node of nodes) {
    if (nodeMap.has(node.id)) {
      issues.push(
        issue('error', DslIssueCode.DUPLICATE_NODE_ID, `节点 ID 重复: ${node.id}`, { nodeId: node.id }),
      );
    }
    nodeMap.set(node.id, node);
  }

  // ---- 2. 唯一 start / 至少一个 end ----
  const starts = nodes.filter((n) => n.type === WorkflowNodeType.START);
  const ends = nodes.filter((n) => n.type === WorkflowNodeType.END);
  if (starts.length === 0) {
    issues.push(issue('error', DslIssueCode.NO_ENTRY, '工作流缺少 start 开始节点'));
  } else if (starts.length > 1) {
    issues.push(issue('error', DslIssueCode.MULTIPLE_ENTRY, `工作流只能有 1 个 start 节点，当前 ${starts.length} 个`));
  }
  if (ends.length === 0) {
    issues.push(issue('error', DslIssueCode.NO_TERMINAL, '工作流缺少 end 结束节点'));
  }

  // ---- 3. 边的悬挂校验 ----
  for (const edge of edges) {
    if (!nodeMap.has(edge.source)) {
      issues.push(
        issue('error', DslIssueCode.DANGLING_EDGE, `边 ${edge.id} 的源节点不存在: ${edge.source}`, { edgeId: edge.id }),
      );
    }
    if (!nodeMap.has(edge.target)) {
      issues.push(
        issue('error', DslIssueCode.DANGLING_EDGE, `边 ${edge.id} 的目标节点不存在: ${edge.target}`, { edgeId: edge.id }),
      );
    }
  }

  // ---- 4. 构建邻接表 / 入度 ----
  const adjacency = new Map<string, EdgeDefinition[]>();
  const inDegree = new Map<string, number>();
  for (const n of nodes) {
    adjacency.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const edge of edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue;
    adjacency.get(edge.source)!.push(edge);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // ---- 5. 环检测（Kahn 拓扑排序） ----
  const cycle = detectCycle(nodes.map((n) => n.id), adjacency, edges);
  if (cycle) {
    issues.push(
      issue('error', DslIssueCode.CYCLE_DETECTED, `工作流存在环: ${cycle.join(' -> ')}（循环请使用 loop 节点表达）`),
    );
  }

  // ---- 6. 可达性（从 start BFS；loop 循环体与 parallel 分支入口也算可达） ----
  if (starts.length === 1) {
    const reachable = new Set<string>();
    const queue = [starts[0].id];
    reachable.add(starts[0].id);

    /** 将结构化节点（loop/parallel）引用的子路径入口纳入可达集合 */
    const addStructuredEntries = (n: NodeDefinition): void => {
      if (n.type === WorkflowNodeType.LOOP) {
        const body = (n.config as { bodyEntry?: string }).bodyEntry;
        if (body && nodeMap.has(body) && !reachable.has(body)) {
          reachable.add(body);
          queue.push(body);
        }
      } else if (n.type === WorkflowNodeType.PARALLEL) {
        const branches = (n.config as { branches?: { entryNode: string }[] }).branches ?? [];
        for (const b of branches) {
          if (nodeMap.has(b.entryNode) && !reachable.has(b.entryNode)) {
            reachable.add(b.entryNode);
            queue.push(b.entryNode);
          }
        }
      }
      // 降级/补偿节点通过配置引用，也算可达
      const fb = n.errorHandling?.fallbackNode;
      if (fb && nodeMap.has(fb) && !reachable.has(fb)) {
        reachable.add(fb);
        queue.push(fb);
      }
      const comp = n.errorHandling?.compensationNode;
      if (comp && nodeMap.has(comp) && !reachable.has(comp)) {
        reachable.add(comp);
        queue.push(comp);
      }
    };

    while (queue.length) {
      const cur = queue.shift()!;
      const curNode = nodeMap.get(cur);
      if (curNode) addStructuredEntries(curNode);
      for (const e of adjacency.get(cur) ?? []) {
        if (!reachable.has(e.target)) {
          reachable.add(e.target);
          queue.push(e.target);
        }
      }
    }
    for (const n of nodes) {
      if (!reachable.has(n.id) && n.type !== WorkflowNodeType.START) {
        issues.push(
          issue('error', DslIssueCode.UNREACHABLE_NODE, `节点不可达（无任何路径从 start 到达）: ${n.id}`, {
            nodeId: n.id,
          }),
        );
      }
    }
  }

  // ---- 7. 节点级配置与端口校验 ----
  for (const node of nodes) {
    validateNodePorts(node, adjacency.get(node.id) ?? [], issues);
    validateNodeReferences(node, resolver, issues);
  }

  const hasError = issues.some((i) => i.severity === 'error');
  return { valid: !hasError, issues };
}

/** 检测环，返回环上的节点序列；无环返回 null */
function detectCycle(
  ids: string[],
  adjacency: Map<string, EdgeDefinition[]>,
  _edges: EdgeDefinition[],
): string[] | null {
  // 注意：loop 节点的 bodyEntry 通过配置引用，不画在主图边里，故不会误判为环。
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>(ids.map((id) => [id, WHITE]));
  const stack: string[] = [];

  function dfs(u: string): string[] | null {
    color.set(u, GRAY);
    stack.push(u);
    for (const e of adjacency.get(u) ?? []) {
      const v = e.target;
      if (color.get(v) === GRAY) {
        const idx = stack.indexOf(v);
        return [...stack.slice(idx), v];
      }
      if (color.get(v) === WHITE) {
        const found = dfs(v);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(u, BLACK);
    return null;
  }

  for (const id of ids) {
    if (color.get(id) === WHITE) {
      const found = dfs(id);
      if (found) return found;
    }
  }
  return null;
}

/** 校验节点的出口端口与配置 */
function validateNodePorts(node: NodeDefinition, outgoing: EdgeDefinition[], issues: ValidationIssue[]): void {
  switch (node.type) {
    case WorkflowNodeType.CONDITION: {
      const cfg = node.config as {
        mode: 'if-else' | 'switch';
        branches?: { name: string }[];
        cases?: Record<string, string>;
        defaultPort: string;
      };
      const declaredPorts = new Set<string>();
      if (cfg.mode === 'if-else') {
        cfg.branches?.forEach((b) => declaredPorts.add(b.name));
      } else {
        Object.values(cfg.cases ?? {}).forEach((p) => declaredPorts.add(p));
      }
      declaredPorts.add(cfg.defaultPort);
      for (const e of outgoing) {
        const port = e.sourcePort ?? 'out';
        if (!declaredPorts.has(port)) {
          issues.push(
            issue('error', DslIssueCode.MISSING_PORT, `条件节点 ${node.id} 的出口端口未定义: ${port}`, {
              nodeId: node.id,
              edgeId: e.id,
            }),
          );
        }
      }
      break;
    }
    case WorkflowNodeType.LOOP: {
      const cfg = node.config as { bodyEntry: string; maxIterations: number };
      if (!cfg.bodyEntry) {
        issues.push(issue('error', DslIssueCode.LOOP_NO_BODY, `循环节点 ${node.id} 缺少 bodyEntry`, { nodeId: node.id }));
      }
      if (!cfg.maxIterations || cfg.maxIterations <= 0) {
        issues.push(issue('error', 'LOOP_MAX_ITERATIONS', `循环节点 ${node.id} 必须设置正的 maxIterations`, { nodeId: node.id }));
      }
      break;
    }
    case WorkflowNodeType.PARALLEL: {
      const cfg = node.config as { branches: { entryNode: string }[] };
      if (!cfg.branches || cfg.branches.length === 0) {
        issues.push(issue('error', DslIssueCode.PARALLEL_NO_BRANCH, `并行节点 ${node.id} 至少需要一个分支`, { nodeId: node.id }));
      }
      break;
    }
    case WorkflowNodeType.END: {
      if (outgoing.length > 0) {
        issues.push(issue('warning', 'END_HAS_OUTGOING', `end 节点 ${node.id} 不应有出边`, { nodeId: node.id }));
      }
      break;
    }
    default:
      break;
  }
}

/** 校验节点内的外部引用（工具/知识库/子智能体） */
function validateNodeReferences(
  node: NodeDefinition,
  resolver: ReferenceResolver,
  issues: ValidationIssue[],
): void {
  switch (node.type) {
    case WorkflowNodeType.TOOL: {
      const cfg = node.config as { toolName: string };
      if (!cfg.toolName) {
        issues.push(issue('error', DslIssueCode.TOOL_NOT_FOUND, `工具节点 ${node.id} 未配置 toolName`, { nodeId: node.id }));
      } else if (!resolver.hasTool(cfg.toolName)) {
        issues.push(
          issue('error', DslIssueCode.TOOL_NOT_FOUND, `工具节点 ${node.id} 引用了不存在的工具: ${cfg.toolName}`, {
            nodeId: node.id,
          }),
        );
      }
      break;
    }
    case WorkflowNodeType.RAG: {
      const cfg = node.config as { knowledgeBases: string[] };
      for (const kb of cfg.knowledgeBases ?? []) {
        if (!resolver.hasKnowledgeBase(kb)) {
          issues.push(
            issue('error', DslIssueCode.KNOWLEDGE_NOT_FOUND, `RAG 节点 ${node.id} 引用了不存在的知识库: ${kb}`, {
              nodeId: node.id,
            }),
          );
        }
      }
      break;
    }
    case WorkflowNodeType.LLM: {
      const cfg = node.config as { knowledgeBase?: string };
      if (cfg.knowledgeBase && !resolver.hasKnowledgeBase(cfg.knowledgeBase)) {
        issues.push(
          issue('error', DslIssueCode.KNOWLEDGE_NOT_FOUND, `LLM 节点 ${node.id} 引用了不存在的知识库: ${cfg.knowledgeBase}`,
            { nodeId: node.id }),
        );
      }
      break;
    }
    case WorkflowNodeType.SUBAGENT: {
      const cfg = node.config as { agentId: string };
      if (!resolver.hasAgent(cfg.agentId)) {
        issues.push(
          issue('error', DslIssueCode.SUBAGENT_NOT_FOUND, `子智能体节点 ${node.id} 引用了不存在的智能体: ${cfg.agentId}`,
            { nodeId: node.id }),
        );
      }
      break;
    }
    default:
      break;
  }
}

/** 拓扑排序（返回执行顺序建议），供引擎调度参考 */
export function topologicalSort(wf: WorkflowDefinition): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const n of wf.nodes) {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  }
  for (const e of wf.edges) {
    if (!inDegree.has(e.source) || !inDegree.has(e.target)) continue;
    adjacency.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }
  const queue = wf.nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adjacency.get(id) ?? []) {
      const d = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  return order;
}
