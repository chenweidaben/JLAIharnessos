/**
 * 健澜科技 jlmedaios - 质控知识推理路径 V14 聚合器（M489-C）
 *
 * 纯函数：推理路径构建 + 路径查找。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 推理路径 */
export interface ReasoningPathV14 {
  id: string;
  nodes: string[];
  edges: string[];
}

/**
 * 构建推理路径。
 *
 * @param id 路径ID
 * @param nodes 节点列表
 * @param edges 边列表
 * @returns 推理路径
 */
export function buildReasoningPath(id: string, nodes: string[], edges: string[]): ReasoningPathV14 {
  return { id, nodes, edges };
}

/**
 * 查找推理路径（简单 DFS，返回所有 start→end 的路径）。
 *
 * @param startNode 起点节点
 * @param endNode 终点节点
 * @param relations 关系列表
 * @returns 路径列表 + 路径数
 */
export function findReasoningPaths(startNode: string, endNode: string, relations: { source: string; target: string }[]): { paths: string[][]; pathCount: number } {
  const adjacency = new Map<string, string[]>();
  for (const r of relations) {
    if (!adjacency.has(r.source)) {
      adjacency.set(r.source, []);
    }
    adjacency.get(r.source)!.push(r.target);
  }

  const paths: string[][] = [];
  const visited = new Set<string>();

  const dfs = (current: string, path: string[]): void => {
    if (current === endNode) {
      paths.push([...path]);
      return;
    }
    if (visited.has(current)) {
      return;
    }
    visited.add(current);
    const neighbors = adjacency.get(current) ?? [];
    for (const next of neighbors) {
      path.push(next);
      dfs(next, path);
      path.pop();
    }
    visited.delete(current);
  };

  dfs(startNode, [startNode]);

  // 手算：pathCount = paths.length
  return { paths, pathCount: paths.length };
}
