/**
 * 健澜科技杠OS - 前端 DAG 校验与 DSL 转换
 *
 * 在浏览器内实时镜像后端工作流校验（图论 + 引用），让信息科在画布上
 * 立即看到无环、可达、端口完整、工具/知识库引用等问题，而不必等到发布。
 *
 * Copyright (c) 2026 健澜科技.
 */

import type {
  AgentMeta,
  BuilderEdge,
  BuilderNode,
  ValidationIssue,
  ValidationResult,
} from '@/types/builder';
import { ALL_TOOL_NAMES, KNOWLEDGE_BASES } from './constants';

const KB_NAMES = new Set(KNOWLEDGE_BASES.map((k) => k.name));
const TOOL_NAMES = new Set([...ALL_TOOL_NAMES, 'transcribe_voice']);

function issue(
  severity: ValidationIssue['severity'],
  code: string,
  message: string,
  extra: Partial<ValidationIssue> = {},
): ValidationIssue {
  return { severity, code, message, ...extra };
}

/** 主图环检测（Kahn 拓扑）；结构化子路径（loop/parallel body）不画回边，故主图恒为 DAG */
export function detectCycle(nodes: BuilderNode[], edges: BuilderEdge[]): string[] {
  const ids = new Set(nodes.map((n) => n.id));
  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => {
    indegree.set(n.id, 0);
    adj.set(n.id, []);
  });
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
  }
  const queue = nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  let visited = 0;
  while (queue.length) {
    const cur = queue.shift()!;
    visited++;
    for (const next of adj.get(cur) ?? []) {
      indegree.set(next, (indegree.get(next) ?? 0) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  if (visited === nodes.length) return [];
  // 返回环上节点（入度仍 >0）
  return nodes.filter((n) => (indegree.get(n.id) ?? 0) > 0).map((n) => n.id);
}

/**
 * 可达性：从 start 沿边 BFS，并把 loop.bodyEntry、parallel branches.entryNode、
 * fallback/compensation 作为结构化入口纳入（与后端 validator 一致）。
 */
export function reachableNodes(nodes: BuilderNode[], edges: BuilderEdge[]): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  }
  const start = nodes.find((n) => n.data.nodeType === 'start');
  const reachable = new Set<string>();
  if (!start) return reachable;
  const queue = [start.id];
  while (queue.length) {
    const id = queue.shift()!;
    if (reachable.has(id) || !byId.has(id)) continue;
    reachable.add(id);
    const node = byId.get(id)!;
    for (const next of adj.get(id) ?? []) queue.push(next);
    // 结构化入口
    const cfg = node.data.config;
    if (node.data.nodeType === 'loop' && cfg.bodyEntry) queue.push(cfg.bodyEntry as string);
    if (node.data.nodeType === 'parallel' && Array.isArray(cfg.parallelBranches)) {
      cfg.parallelBranches.forEach((b) => b.entryNode && queue.push(b.entryNode));
    }
    if (cfg.fallbackNode) queue.push(cfg.fallbackNode as string);
    if (cfg.compensationNode) queue.push(cfg.compensationNode as string);
  }
  return reachable;
}

export function validateWorkflow(
  nodes: BuilderNode[],
  edges: BuilderEdge[],
  meta?: AgentMeta,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const add = (
    severity: ValidationIssue['severity'],
    code: string,
    message: string,
    extra: Partial<ValidationIssue> = {},
  ) => issues.push(issue(severity, code, message, extra));

  if (nodes.length === 0) {
    add('error', 'EMPTY_WORKFLOW', '工作流为空，请从节点面板拖入“开始”节点');
    return { valid: false, issues };
  }

  const ids = new Set<string>();
  for (const n of nodes) {
    if (ids.has(n.id)) add('error', 'DUPLICATE_NODE_ID', `节点 ID 重复：${n.id}`, { nodeId: n.id });
    ids.add(n.id);
  }

  // 入口 / 终点
  const starts = nodes.filter((n) => n.data.nodeType === 'start');
  const ends = nodes.filter((n) => n.data.nodeType === 'end');
  if (starts.length === 0) add('error', 'NO_ENTRY', '缺少“开始”节点');
  if (starts.length > 1) add('error', 'MULTIPLE_ENTRY', `只能有一个开始节点，当前 ${starts.length} 个`);
  if (ends.length === 0) add('error', 'NO_TERMINAL', '缺少“结束”节点');

  // 悬挂边
  for (const e of edges) {
    if (!ids.has(e.source)) add('error', 'DANGLING_EDGE', `边的源节点不存在：${e.source}`, { edgeId: e.id });
    if (!ids.has(e.target)) add('error', 'DANGLING_EDGE', `边的目标节点不存在：${e.target}`, { edgeId: e.id });
  }

  // 环
  const cyclic = detectCycle(nodes, edges);
  if (cyclic.length > 0) {
    add('error', 'CYCLE_DETECTED', `主图存在环：${cyclic.join('、')}（循环请用“循环”节点，不要在主图连线回退）`, {
      nodeId: cyclic[0],
    });
  }

  // 不可达
  const reachable = reachableNodes(nodes, edges);
  for (const n of nodes) {
    if (!reachable.has(n.id)) {
      add('error', 'UNREACHABLE_NODE', `节点“${n.data.name}”（${n.id}）从开始节点不可达`, { nodeId: n.id });
    }
  }

  const outEdges = new Map<string, BuilderEdge[]>();
  const inEdges = new Map<string, BuilderEdge[]>();
  for (const e of edges) {
    if (!outEdges.has(e.source)) outEdges.set(e.source, []);
    outEdges.get(e.source)!.push(e);
    if (!inEdges.has(e.target)) inEdges.set(e.target, []);
    inEdges.get(e.target)!.push(e);
  }

  for (const n of nodes) {
    const cfg = n.data.config;
    const outs = outEdges.get(n.id) ?? [];
    const ins = inEdges.get(n.id) ?? [];
    const t = n.data.nodeType;

    if (t === 'start' && ins.length > 0) {
      add('warning', 'START_HAS_INPUT', '开始节点不应有入边', { nodeId: n.id });
    }
    if (t === 'end' && outs.length > 0) {
      add('error', 'END_HAS_OUTPUT', '结束节点不应有出边', { nodeId: n.id });
    }
    if (t !== 'start' && ins.length === 0 && reachable.has(n.id) && !(t === 'loop' || t === 'parallel')) {
      // 结构化子路径的首节点无主图入边是正常的，其余无入边节点提示
      const isStructuredEntry = nodes.some((p) => {
        const c = p.data.config;
        return (
          c.bodyEntry === n.id ||
          (Array.isArray(c.parallelBranches) && c.parallelBranches.some((b) => b.entryNode === n.id))
        );
      });
      if (!isStructuredEntry) add('warning', 'NO_INPUT', `节点“${n.data.name}”没有入边`, { nodeId: n.id });
    }

    if (t === 'llm' && !cfg.userTemplate) {
      add('error', 'LLM_NO_TEMPLATE', '大模型节点缺少用户消息模板', { nodeId: n.id });
    }
    if (t === 'tool') {
      if (!cfg.toolName) add('error', 'TOOL_EMPTY', '工具节点未选择工具', { nodeId: n.id });
      else if (!TOOL_NAMES.has(cfg.toolName as string))
        add('warning', 'TOOL_NOT_FOUND', `工具 ${cfg.toolName} 不在内置清单（自定义工具需先注册）`, { nodeId: n.id });
    }
    if (t === 'rag') {
      if (!cfg.knowledgeBases || (cfg.knowledgeBases as string[]).length === 0)
        add('error', 'KB_EMPTY', '知识检索节点未选择知识库', { nodeId: n.id });
      else
        (cfg.knowledgeBases as string[]).forEach((kb) => {
          if (!KB_NAMES.has(kb)) add('warning', 'KNOWLEDGE_NOT_FOUND', `知识库 ${kb} 不存在`, { nodeId: n.id });
        });
      if (!cfg.query) add('error', 'RAG_NO_QUERY', '知识检索节点缺少查询表达式', { nodeId: n.id });
    }
    if (t === 'condition') {
      const ports = new Set<string>([
        ...((cfg.branches as Array<{ name: string }>) ?? []).map((b) => b.name),
        ...(cfg.defaultPort ? [cfg.defaultPort as string] : []),
      ]);
      for (const port of ports) {
        if (!outs.some((e) => (e.sourceHandle ?? 'out') === port))
          add('error', 'MISSING_PORT', `条件分支“${port}”缺少出线`, { nodeId: n.id });
      }
      for (const e of outs) {
        const handle = e.sourceHandle ?? 'out';
        if (!ports.has(handle))
          add('warning', 'MISSING_PORT', `出线端口“${handle}”未在分支中定义`, { edgeId: e.id });
      }
    }
    if (t === 'loop') {
      if (!cfg.bodyEntry) add('error', 'LOOP_NO_BODY', '循环节点缺少循环体入口（bodyEntry）', { nodeId: n.id });
      else if (!ids.has(cfg.bodyEntry as string))
        add('error', 'LOOP_NO_BODY', `循环体入口节点不存在：${cfg.bodyEntry}`, { nodeId: n.id });
    }
    if (t === 'parallel') {
      const branches = (cfg.parallelBranches as Array<{ name: string; entryNode: string }>) ?? [];
      if (branches.length === 0) add('error', 'PARALLEL_NO_BRANCH', '并行节点至少需要一个分支', { nodeId: n.id });
      branches.forEach((b) => {
        if (!b.entryNode) add('error', 'PARALLEL_NO_BRANCH', `并行分支“${b.name}”缺少入口节点`, { nodeId: n.id });
        else if (!ids.has(b.entryNode))
          add('error', 'PARALLEL_NO_BRANCH', `分支“${b.name}”入口节点不存在：${b.entryNode}`, { nodeId: n.id });
      });
    }
    if (t === 'human' && (!cfg.assigneeRoles || (cfg.assigneeRoles as string[]).length === 0)) {
      add('error', 'HUMAN_NO_ROLE', '人工节点至少需要一个处理角色', { nodeId: n.id });
    }
    if (t === 'subagent' && !cfg.agentId) {
      add('error', 'SUBAGENT_EMPTY', '子智能体节点未指定目标智能体', { nodeId: n.id });
    }
    if (t === 'delay' && (!cfg.durationMs || cfg.durationMs <= 0)) {
      add('error', 'DELAY_INVALID', '延时时长需大于 0', { nodeId: n.id });
    }
  }

  // 智能体级引用
  if (meta) {
    if (!meta.id || !/^[a-z][a-z0-9-]*$/.test(meta.id))
      add('error', 'AGENT_ID_INVALID', '智能体 ID 需为小写字母开头、中划线分隔（如 medical-record-writer）');
    if (!meta.name) add('error', 'AGENT_NAME_EMPTY', '智能体名称不能为空');
    if (!meta.disclaimer) add('warning', 'DISCLAIMER_EMPTY', '建议填写医疗 AI 辅助免责声明');
    meta.tools.forEach((t) => {
      if (!TOOL_NAMES.has(t)) add('warning', 'TOOL_NOT_FOUND', `授权工具 ${t} 不在内置清单`);
    });
    meta.knowledgeBases.forEach((kb) => {
      if (!KB_NAMES.has(kb)) add('warning', 'KNOWLEDGE_NOT_FOUND', `授权知识库 ${kb} 不存在`);
    });
  }

  const hasError = issues.some((i) => i.severity === 'error');
  return { valid: !hasError, issues };
}

/** 生成默认 AgentMeta */
export function defaultAgentMeta(): AgentMeta {
  return {
    id: 'my-agent',
    name: '我的智能体',
    version: '1.0.0',
    category: '电子病历',
    description: '',
    riskLevel: 'low',
    allowedRoles: ['doctor'],
    tools: [],
    knowledgeBases: [],
    systemPrompt: '',
    model: 'sonnet',
    temperature: 0.2,
    tags: [],
    builtin: false,
    disclaimer: '本智能体输出为临床辅助建议，不能替代医生面诊与诊断，最终诊疗决策由经治医师负责。',
  };
}
