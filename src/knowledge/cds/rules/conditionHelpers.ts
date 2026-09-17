/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * CDS 规则条件构造辅助函数
 * ---------------------------------------------------------------------------
 * 以声明式方式构造 RuleEvaluator 可执行的条件树，避免手写嵌套对象。
 */

import type { ComparisonOperator, ConditionLeaf, ConditionNode } from '../Rule.js';

/** 列表型字段名 */
export type ListField =
  'allergies' | 'currentDrugs' | 'newDrugs' | 'diagnoses' | 'symptoms' | 'signs';

/** 叶子条件 */
export function leaf(field: string, operator: ComparisonOperator, value: unknown): ConditionLeaf {
  return { kind: 'leaf', field, operator, value };
}

/** AND 组合 */
export function and(...children: ConditionNode[]): ConditionNode {
  return { kind: 'group', combinator: 'AND', children };
}

/** OR 组合 */
export function or(...children: ConditionNode[]): ConditionNode {
  return { kind: 'group', combinator: 'OR', children };
}

/** NOT 取反 */
export function not(child: ConditionNode): ConditionNode {
  return { kind: 'group', combinator: 'NOT', children: [child] };
}

/** 列表字段“任一项子串命中” */
export function listAny(field: ListField, value: string): ConditionNode {
  return { kind: 'leaf', field, operator: 'contains', value };
}

/** 检验项大于阈值：lab.<项目名> > value */
export function labGt(itemName: string, value: number): ConditionNode {
  return leaf(`lab.${itemName}`, 'gt', value);
}

/** 检验项小于阈值：lab.<项目名> < value */
export function labLt(itemName: string, value: number): ConditionNode {
  return leaf(`lab.${itemName}`, 'lt', value);
}
