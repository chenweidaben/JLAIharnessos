/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * CDS 规则评估器
 * ---------------------------------------------------------------------------
 * 负责把患者事实上下文中的字段值解析出来，并对条件树（AND/OR/NOT）
 * 与比较操作（等于/大小/包含/区间/枚举）求值，判断规则是否触发。
 */

import type {
  CdsFacts,
  ComparisonOperator,
  ConditionGroup,
  ConditionLeaf,
  ConditionNode,
} from './Rule.js';

/** 字段解析出的原始值类型 */
type ResolvedValue = number | string | boolean | readonly unknown[] | undefined;

/** 列表型字段集合（contains 表示“任一项子串命中”） */
const LIST_FIELDS = new Set([
  'allergies',
  'currentDrugs',
  'newDrugs',
  'diagnoses',
  'symptoms',
  'signs',
]);

/**
 * 规则评估器：纯函数式，无状态，可单条或批量复用。
 */
export class RuleEvaluator {
  /**
   * 评估整条条件树。
   *
   * @param node 条件树节点
   * @param facts 患者事实上下文
   * @returns 条件是否成立
   */
  evaluate(node: ConditionNode, facts: CdsFacts): boolean {
    if (node.kind === 'leaf') {
      return this.evalLeaf(node, facts);
    }
    return this.evalGroup(node, facts);
  }

  /** 评估逻辑组合节点（AND/OR/NOT） */
  private evalGroup(group: ConditionGroup, facts: CdsFacts): boolean {
    if (group.children.length === 0) return false;

    switch (group.combinator) {
      case 'AND':
        return group.children.every((c) => this.evaluate(c, facts));
      case 'OR':
        return group.children.some((c) => this.evaluate(c, facts));
      case 'NOT':
        return !this.evaluate(group.children[0], facts);
      default:
        return false;
    }
  }

  /** 评估叶子条件：解析字段值后执行比较操作 */
  private evalLeaf(leaf: ConditionLeaf, facts: CdsFacts): boolean {
    // 检验项字段 lab.<项目名>
    if (leaf.field.startsWith('lab.')) {
      const itemName = leaf.field.slice('lab.'.length);
      const lab = facts.labResults.find(
        (l) => l.itemName.includes(itemName) || itemName.includes(l.itemName),
      );
      if (!lab) return false;
      return compare(lab.value, leaf.operator, leaf.value);
    }

    const raw = this.resolveScalar(leaf.field, facts);
    if (raw === undefined) return false;

    // 列表型字段：contains/not_contains 表示任一项子串命中
    if (Array.isArray(raw)) {
      return this.evalList(leaf, raw);
    }

    return compare(raw, leaf.operator, leaf.value);
  }

  /** 列表字段评估 */
  private evalList(leaf: ConditionLeaf, list: readonly unknown[]): boolean {
    const target = String(leaf.value).toLowerCase();
    const items = list.map((x) => String(x).toLowerCase());
    const hit = items.some((item) => item.includes(target));
    if (leaf.operator === 'not_contains') return !hit;
    if (leaf.operator === 'contains') return hit;
    // 其它操作符退化为精确匹配任一元素
    return compare(list, leaf.operator, leaf.value);
  }

  /**
   * 从事实上下文解析标量字段值。
   * 检验项走 lab.* 前缀，其余按 CdsFacts 字段名直取。
   */
  private resolveScalar(field: string, facts: CdsFacts): ResolvedValue {
    switch (field) {
      case 'age':
        return facts.age;
      case 'gender':
        return facts.gender;
      case 'pregnant':
        return facts.pregnant;
      case 'weightKg':
        return facts.weightKg;
      case 'renalBand':
        return facts.renalBand;
      case 'liverBand':
        return facts.liverBand;
      case 'encounterType':
        return facts.encounterType;
      case 'allergies':
        return facts.allergies;
      case 'currentDrugs':
        return facts.currentDrugs;
      case 'newDrugs':
        return facts.newDrugs;
      case 'diagnoses':
        return facts.diagnoses;
      case 'symptoms':
        return facts.symptoms;
      case 'signs':
        return facts.signs;
      default:
        return undefined;
    }
  }
}

/**
 * 通用比较函数：支持数值与字符串，处理数值型 value。
 *
 * @param actual 实际值（标量）
 * @param op 比较操作符
 * @param expected 期望比较值
 */
function compare(
  actual: number | string | boolean | readonly unknown[],
  op: ComparisonOperator,
  expected: unknown,
): boolean {
  // 区间比较
  if (op === 'between' && Array.isArray(expected) && expected.length === 2) {
    const num = toNumber(actual);
    if (num === undefined) return false;
    const min = Number(expected[0]);
    const max = Number(expected[1]);
    return num >= min && num <= max;
  }

  // 枚举比较
  if (op === 'in' && Array.isArray(expected)) {
    return expected.some((e) => looseEquals(actual, e));
  }

  // 尝试数值比较
  const actualNum = toNumber(actual);
  const expectedNum = toNumber(expected);
  if (actualNum !== undefined && expectedNum !== undefined) {
    switch (op) {
      case 'gt':
        return actualNum > expectedNum;
      case 'gte':
        return actualNum >= expectedNum;
      case 'lt':
        return actualNum < expectedNum;
      case 'lte':
        return actualNum <= expectedNum;
      default:
        break;
    }
  }

  // 字符串/布尔比较
  switch (op) {
    case 'equals':
      return looseEquals(actual, expected);
    case 'not_equals':
      return !looseEquals(actual, expected);
    case 'contains':
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    case 'not_contains':
      return !String(actual).toLowerCase().includes(String(expected).toLowerCase());
    default:
      return false;
  }
}

/** 宽松相等（忽略类型与大小写） */
function looseEquals(actual: unknown, expected: unknown): boolean {
  if (typeof actual === 'boolean' || typeof expected === 'boolean') {
    return String(actual) === String(expected);
  }
  return String(actual).toLowerCase() === String(expected).toLowerCase();
}

/** 转数值；不可转返回 undefined */
function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
