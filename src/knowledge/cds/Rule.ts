/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * CDS 规则模型定义
 * ---------------------------------------------------------------------------
 * 定义临床决策支持（CDS）规则的核心数据结构：规则类型、状态、优先级、
 * 触发条件（AND/OR/NOT 逻辑树 + 比较操作）、执行动作与证据来源。
 * 规则采用 TypeScript 对象定义，不依赖外部规则引擎。
 */

// ============================================================================
// 规则分类与状态
// ============================================================================

/** 六大类临床规则（与《数据模型与知识库设计》7.2 节对应） */
export type CdsRuleType =
  | 'drug_interaction' // 药物相互作用（DDI-）
  | 'drug_allergy' // 药物过敏（ALL-）
  | 'dose_anomaly' // 剂量异常（DOSE-）
  | 'contraindication' // 禁忌症（CONTRA-）
  | 'critical_value' // 检验危急值（CRIT-）
  | 'diagnostic_compliance'; // 诊疗规范符合度（COMP-）

/** 规则生命周期状态 */
export type RuleStatus =
  | 'enabled' // 启用（在线生效）
  | 'disabled' // 禁用（不参与评估）
  | 'test'; // 测试（仅记录不阻断，用于灰度/验证）

// ============================================================================
// 条件模型：逻辑树 + 比较操作
// ============================================================================

/** 比较操作符 */
export type ComparisonOperator =
  | 'equals' // 等于
  | 'not_equals' // 不等于
  | 'gt' // 大于
  | 'gte' // 大于等于
  | 'lt' // 小于
  | 'lte' // 小于等于
  | 'contains' // 包含（标量子串 / 列表任意项子串匹配）
  | 'not_contains' // 不包含
  | 'in' // 值在枚举集合内
  | 'between'; // 介于 [min, max] 闭区间

/**
 * 叶子条件：对患者事实上下文中的某个字段执行一次比较。
 *
 * field 取值约定（与 {@link CdsFacts} 对应）：
 * - 标量字段：`age` / `gender` / `pregnant` / `weightKg` / `renalBand` / `liverBand` / `encounterType`
 * - 列表字段：`allergies` / `currentDrugs` / `newDrugs` / `diagnoses` / `symptoms` / `signs`
 *   （对列表字段使用 contains / not_contains 表示“任一项子串命中”）
 * - 检验项：`lab.<项目名>`，如 `lab.血钾`，比较时取该项目数值。
 */
export interface ConditionLeaf {
  readonly kind: 'leaf';
  readonly field: string;
  readonly operator: ComparisonOperator;
  /** 比较值；between 时为 [min, max] 数值数组，in 时为枚举数组 */
  readonly value: unknown;
}

/** 逻辑组合节点（AND / OR / NOT） */
export interface ConditionGroup {
  readonly kind: 'group';
  readonly combinator: 'AND' | 'OR' | 'NOT';
  /** NOT 仅取首个子条件；AND/OR 取全部子条件 */
  readonly children: readonly ConditionNode[];
}

/** 条件树节点（叶子或逻辑组合） */
export type ConditionNode = ConditionLeaf | ConditionGroup;

// ============================================================================
// 动作与提醒级别
// ============================================================================

/** CDS 动作类型 */
export type CdsActionType =
  | 'alert' // 提醒（info）
  | 'warning' // 警告（warning）
  | 'block' // 拦截（critical，需医生 override）
  | 'suggest' // 建议（被动提示）
  | 'log'; // 记录（仅留痕，不打扰医生）

/** 提醒级别 */
export type AlertLevel = 'info' | 'warning' | 'critical';

/** 证据来源条目 */
export interface EvidenceSource {
  readonly source: string;
  readonly version?: string;
  readonly page?: string;
}

/** 规则执行动作定义 */
export interface RuleAction {
  readonly actionType: CdsActionType;
  readonly level: AlertLevel;
  readonly title: string;
  /** 支持 {{field}} 模板变量，执行时用事实数据填充 */
  readonly message: string;
  readonly suggestions: readonly string[];
  /** 是否要求医生强制确认 override（block 默认 true） */
  readonly requireOverride: boolean;
  readonly overrideReasons?: readonly string[];
  readonly evidence: readonly EvidenceSource[];
}

// ============================================================================
// 规则定义
// ============================================================================

/** 规则触发事件（触发时机） */
export type TriggerEvent =
  | 'order_create' // 开医嘱
  | 'prescription_create' // 开处方
  | 'lab_result_report' // 检验结果报告
  | 'record_write' // 病历书写
  | 'check_request' // 检查/检验申请
  | 'manual'; // 手动触发

/**
 * CDS 规则定义
 *
 * 用 TypeScript 对象描述一条临床规则，供 {@link CDSEngine} 逐条评估。
 */
export interface CdsRule {
  /** 规则唯一编号（如 DDI-001 / CRIT-001） */
  readonly id: string;
  /** 规则名称 */
  readonly name: string;
  /** 规则描述 */
  readonly description: string;
  /** 规则类型 */
  readonly ruleType: CdsRuleType;
  /** 语义化版本（如 1.0.0） */
  readonly version: string;
  /** 规则状态 */
  readonly status: RuleStatus;
  /**
   * 优先级（数值越大越先执行 / 冲突时胜出）。
   * 危急值、绝对禁忌建议使用 90~100。
   */
  readonly priority: number;
  /** 触发事件集合 */
  readonly triggerEvents: readonly TriggerEvent[];
  /** 标签（便于检索与分组） */
  readonly tags: readonly string[];
  /**
   * 互斥组：同一互斥组内多条规则同时命中时，
   * 仅保留优先级最高的一条，避免重复告警。
   */
  readonly mutualExclusionGroup?: string;
  /** WHEN：触发条件树 */
  readonly condition: ConditionNode;
  /** UNLESS：满足时不触发（例外条件） */
  readonly exclusions?: ConditionNode;
  /** THEN：命中后执行的动作 */
  readonly action: RuleAction;
  /** 规则作者 */
  readonly author?: string;
  /** 创建日期 ISO */
  readonly createdAt?: string;
}

// ============================================================================
// 患者事实上下文（供规则评估）
// ============================================================================

/**
 * 患者事实上下文：规则评估所需的全部结构化数据。
 * 由调用方（开医嘱/检验报告到达等）从 EMR/HIS/LIS 汇聚后注入。
 */
export interface CdsFacts {
  /** 患者ID */
  readonly patientId: string;
  /** 年龄（岁） */
  readonly age?: number;
  /** 性别 male/female */
  readonly gender?: 'male' | 'female' | 'unknown';
  /** 体重（kg） */
  readonly weightKg?: number;
  /** 是否妊娠 */
  readonly pregnant?: boolean;
  /** 肾功能分级：normal / mild / moderate / severe */
  readonly renalBand?: 'normal' | 'mild' | 'moderate' | 'severe';
  /** 肝功能分级：normal / mild / moderate / severe */
  readonly liverBand?: 'normal' | 'mild' | 'moderate' | 'severe';
  /** 过敏史（过敏原关键词数组） */
  readonly allergies: readonly string[];
  /** 当前在用药物（通用名数组） */
  readonly currentDrugs: readonly string[];
  /** 本次新开药物（通用名数组） */
  readonly newDrugs: readonly string[];
  /** 诊断（诊断名数组） */
  readonly diagnoses: readonly string[];
  /** 症状关键词数组 */
  readonly symptoms: readonly string[];
  /** 体征关键词数组 */
  readonly signs: readonly string[];
  /** 就诊类型 */
  readonly encounterType?: 'outpatient' | 'inpatient' | 'emergency' | 'icu' | 'followup';
  /** 检验结果列表 */
  readonly labResults: readonly CdsLabValue[];
}

/** 检验项数值（供 lab.<名称> 字段解析） */
export interface CdsLabValue {
  readonly itemName: string;
  readonly value: number;
  readonly unit?: string;
  readonly refLow?: number;
  readonly refHigh?: number;
}

// ============================================================================
// 规则命中与执行结果
// ============================================================================

/** 单条规则命中结果 */
export interface RuleHit {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly ruleType: CdsRuleType;
  readonly priority: number;
  readonly actionType: CdsActionType;
  readonly level: AlertLevel;
  readonly title: string;
  /** 模板填充后的完整提示语 */
  readonly message: string;
  readonly suggestions: readonly string[];
  readonly requireOverride: boolean;
  readonly overrideReasons: readonly string[];
  readonly evidence: readonly EvidenceSource[];
  readonly triggeredAt: string;
}

/**
 * 规则集执行聚合结果
 *
 * 仅供临床参考，最终决策须由具备资质的执业医师确认。
 */
export interface CdsExecutionResult {
  /** 是否允许当前操作通过（存在 block 且未 override 时为 false） */
  readonly passed: boolean;
  /** 最高提醒级别（无命中时为 null） */
  readonly maxLevel: AlertLevel | null;
  /** 命中并去重后的规则列表（按优先级降序） */
  readonly hits: readonly RuleHit[];
  /** 命中但因互斥被抑制的规则数 */
  readonly suppressedCount: number;
  /** 评估的规则总数 */
  readonly evaluatedRules: number;
  /** 评估时间 ISO */
  readonly evaluatedAt: string;
  /** 固定免责声明 */
  readonly disclaimer: '本CDS结果仅供参考，不替代临床判断，需医生确认';
}
