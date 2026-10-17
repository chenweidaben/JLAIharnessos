/**
 * 健澜科技 jlmedaios - 扩散网络图谱 V13 纯函数（M304-C）
 *
 * buildDiffusionGraphV13 / computeDeptInfluenceV13 / identifyIsolatedDeptsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室节点 */
export interface DeptNodeV13 {
  deptId: string;
  deptName: string;
}

/** 扩散边 */
export interface DiffusionEdgeV13 {
  source: string;
  target: string;
  count: number;
}

/** 扩散图 */
export interface DiffusionGraphV13 {
  nodes: DeptNodeV13[];
  edges: DiffusionEdgeV13[];
}

/**
 * 构建扩散图（纯函数）：直接透传。
 *
 * @param nodes 节点
 * @param edges 边
 * @returns 扩散图
 */
export function buildDiffusionGraphV13(nodes: DeptNodeV13[], edges: DiffusionEdgeV13[]): DiffusionGraphV13 {
  return { nodes, edges };
}

/**
 * 科室影响力（纯函数）：作为 source 出现的次数。
 *
 * @param node 节点
 * @param edges 边列表
 * @returns 影响力
 */
export function computeDeptInfluenceV13(node: DeptNodeV13, edges: DiffusionEdgeV13[]): number {
  return edges.filter((e) => e.source === node.deptId).length;
}

/**
 * 孤岛科室识别（纯函数）：既不输出（source）也不接收（target）的。
 *
 * @param nodes 节点
 * @param edges 边列表
 * @returns 孤岛列表
 */
export function identifyIsolatedDeptsV13(nodes: DeptNodeV13[], edges: DiffusionEdgeV13[]): DeptNodeV13[] {
  const connected = new Set<string>();
  for (const e of edges) {
    connected.add(e.source);
    connected.add(e.target);
  }
  return nodes.filter((n) => !connected.has(n.deptId));
}
