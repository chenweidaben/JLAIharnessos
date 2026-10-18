/**
 * 健澜科技 jlmedaios - AI病历质控知识图谱推理 V14 聚合器（M522-D，M522 收官）
 *
 * 纯函数：构建知识图谱推理基础数据 + 知识图谱推理 + 构建推理报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 知识图谱推理基础数据 */
export interface AiKGraphReasoningV14 {
  domain: string;
  nodeCount: number;
}

/** 推理输入 */
export interface AiKGraphReasoningInputV14 {
  query: string;
  nodes: string[];
}

/** 推理结果 */
export interface AiKGraphReasoningResultV14 {
  matchedNodes: string[];
  edgeCount: number;
}

/** 推理报告 */
export interface AiKGraphReasoningReportV14 {
  matchedCount: number;
  edgeCount: number;
}

/**
 * 构建知识图谱推理基础数据。
 *
 * @param domain 领域
 * @param nodeCount 节点数
 * @returns 知识图谱推理基础数据
 */
export function buildAiKGraphReasoning(domain: string, nodeCount: number): AiKGraphReasoningV14 {
  return { domain, nodeCount };
}

/**
 * 知识图谱推理。
 * matchedNodes = nodes 中包含 query 子串的项；edgeCount = matchedNodes.length × 2。
 *
 * @param input 推理输入（查询词 + 节点列表）
 * @returns 推理结果（matchedNodes + edgeCount）
 */
export function reasonKGraph(input: AiKGraphReasoningInputV14): AiKGraphReasoningResultV14 {
  // 手算：nodes 中包含 query 子串的项即匹配
  // 测试2：query='病历', nodes=['病历书写规范','病历首页','手术记录','病历质控指标']
  // 手算：'病历书写规范'含'病历'✓, '病历首页'含'病历'✓, '手术记录'不含'病历'✗, '病历质控指标'含'病历'✓
  // 手算：matchedNodes = ['病历书写规范','病历首页','病历质控指标']（3 项）
  // 测试3：query='手术'
  // 手算：仅'手术记录'含'手术'✓ → matchedNodes = ['手术记录']（1 项）
  const matchedNodes: string[] = [];
  for (const node of input.nodes) {
    if (node.includes(input.query)) {
      matchedNodes.push(node);
    }
  }
  // 手算：edgeCount = matchedNodes.length × 2
  // 测试2：3 × 2 = 6
  // 测试3：1 × 2 = 2
  const edgeCount = matchedNodes.length * 2;
  return { matchedNodes, edgeCount };
}

/**
 * 构建推理报告。
 *
 * @param result 推理结果
 * @returns 推理报告（matchedCount + edgeCount）
 */
export function buildAiKGraphReasoningReport(result: AiKGraphReasoningResultV14): AiKGraphReasoningReportV14 {
  // 手算：matchedCount = matchedNodes.length
  // 测试4：matchedNodes=['病历书写规范','病历首页','病历质控指标'] → matchedCount=3
  const matchedCount = result.matchedNodes.length;
  return { matchedCount, edgeCount: result.edgeCount };
}
