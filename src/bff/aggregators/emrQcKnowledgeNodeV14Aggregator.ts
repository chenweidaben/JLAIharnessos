/**
 * 健澜科技 jlmedaios - 质控知识节点管理 V14 聚合器（M489-A）
 *
 * 纯函数：知识节点构建 + 节点聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 知识节点 */
export interface KnowledgeNodeV14 {
  id: string;
  name: string;
  type: string;
}

/**
 * 构建知识节点。
 *
 * @param id 节点ID
 * @param name 节点名称
 * @param type 节点类型
 * @returns 知识节点
 */
export function buildKnowledgeNode(id: string, name: string, type: string): KnowledgeNodeV14 {
  return { id, name, type };
}

/**
 * 聚合知识节点（总数+类型列表）。
 *
 * @param nodes 节点列表
 * @returns 聚合结果
 */
export function aggregateKnowledgeNodes(nodes: { id: string; name: string; type: string }[]): { count: number; types: string[] } {
  const count = nodes.length;
  // 手算：types = 去重后的类型集合
  const types = Array.from(new Set(nodes.map((n) => n.type)));
  return { count, types };
}
