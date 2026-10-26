/**
 * 健澜AI原生医院操作系统OS - bff/prompt/schemaGuard.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * 输出 Schema 校验与重试降级（技术文档 3.4.4）：轻量 JSON Schema 子集校验
 * （type / required / properties / enum；不依赖 ajv）、失败计数、指数退避重试决策、
 * 按风险等级降级（low 模板兜底 / medium 人工队列 / high 阻断提交）；判定事件内存留痕，
 * 供 PromptMetrics.schemaFailureRate 聚合与 S-08 审计链接入。
 *
 * @module bff/prompt/schemaGuard
 */

// ============================================================================
// 类型契约
// ============================================================================

/** Schema 校验结果 */
export interface SchemaCheckResult {
  valid: boolean;
  errors: string[];
  output: unknown;
}

/** 降级动作枚举 */
export type SchemaAction = 'retry' | 'template-fallback' | 'manual-queue' | 'block-submit';

/** 重试决策 */
export interface SchemaRetryDecision {
  shouldRetry: boolean;
  attempt: number;
  backoffMs: number;
  action: SchemaAction;
}

/** Schema 守卫事件（供指标聚合与审计链预留字段，不落 DB） */
export interface SchemaGuardEvent {
  seq: number;
  at: string;
  assetId?: string;
  version?: string;
  attempt: number;
  valid: boolean;
  errors: string[];
  action: SchemaAction;
  agentId?: string;
  scenario?: string;
}

/** 校验上下文 */
export interface SchemaCheckContext {
  assetId?: string;
  version?: string;
  agentId?: string;
  scenario?: string;
  riskLevel?: 'low' | 'medium' | 'high';
}

const SUPPORTED_TYPES = ['object', 'array', 'string', 'number', 'boolean', 'null'] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkType(value: unknown, type: string, path: string, errors: string[]): void {
  switch (type) {
    case 'object':
      if (!isPlainObject(value)) errors.push(`${path} 应为 object 类型`);
      break;
    case 'array':
      if (!Array.isArray(value)) errors.push(`${path} 应为 array 类型`);
      break;
    case 'string':
      if (typeof value !== 'string') errors.push(`${path} 应为 string 类型`);
      break;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) errors.push(`${path} 应为 number 类型`);
      break;
    case 'boolean':
      if (typeof value !== 'boolean') errors.push(`${path} 应为 boolean 类型`);
      break;
    case 'null':
      if (value !== null) errors.push(`${path} 应为 null`);
      break;
    default:
      // 结构无法判定时记错误但不抛异常，由调用方按失败路径处理
      errors.push(`${path} 未知 schema type「${type}」，跳过类型判定`);
  }
}

/**
 * 递归校验单个节点：`type`、`required`、`properties`、`enum`、`pattern`、
 * `minimum / maximum`、`minLength / maxLength`、`items`、`oneOf`；
 * `additionalProperties` 不阻断；结构无法判定时收集错误但不抛异常。
 *
 * 路径口径：根节点 = `根节点`；对象属性 = `字段「x」`；数组元素 = `字段「x」[i]`；
 * 既有 type / required / enum 错误文案保持不变，新增关键字走同一路径前缀。
 */
function validateNode(value: unknown, schema: Record<string, unknown>, path: string, errors: string[]): void {
  const root = path === '根节点';
  const rootType = schema.type;

  if (typeof rootType === 'string' && rootType.trim().length > 0) {
    checkType(value, rootType, path, errors);
  } else if (root) {
    errors.push('schema 缺少 type 声明，结构无法判定');
  }

  // 枚举校验（根节点与子节点共用；既有根节点文案保持不变）
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const allowed = schema.enum as unknown[];
    if (!allowed.includes(value)) {
      errors.push(root ? '根节点取值不在枚举范围内' : `${path} 取值不在枚举范围内`);
    }
  }

  // 字符串关键字：正则格式与长度边界
  if (typeof value === 'string') {
    if (typeof schema.pattern === 'string' && schema.pattern.trim().length > 0) {
      try {
        if (!new RegExp(schema.pattern).test(value)) {
          errors.push(`${path} 不符合格式要求`);
        }
      } catch {
        errors.push(`${path} 的 pattern 表达式非法，跳过格式校验`);
      }
    }
    if (typeof schema.minLength === 'number' && Number.isFinite(schema.minLength) && value.length < schema.minLength) {
      errors.push(`${path} 长度不得少于 ${schema.minLength} 个字符`);
    }
    if (typeof schema.maxLength === 'number' && Number.isFinite(schema.maxLength) && value.length > schema.maxLength) {
      errors.push(`${path} 长度不得超过 ${schema.maxLength} 个字符`);
    }
  }

  // 数值关键字：取值上下界
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (typeof schema.minimum === 'number' && Number.isFinite(schema.minimum) && value < schema.minimum) {
      errors.push(`${path} 不得小于 ${schema.minimum}`);
    }
    if (typeof schema.maximum === 'number' && Number.isFinite(schema.maximum) && value > schema.maximum) {
      errors.push(`${path} 不得大于 ${schema.maximum}`);
    }
  }

  // 对象节点：必填字段与属性递归
  if (isPlainObject(value)) {
    const required = Array.isArray(schema.required) ? (schema.required as unknown[]) : [];
    for (const field of required) {
      if (typeof field === 'string' && !(field in value)) {
        errors.push(root ? `缺少必填字段「${field}」` : `${path} 缺少必填字段「${field}」`);
      }
    }
    const properties = schema.properties;
    if (isPlainObject(properties)) {
      for (const [field, subSchema] of Object.entries(properties)) {
        if (!(field in value)) continue;
        if (!isPlainObject(subSchema)) {
          errors.push(`字段「${field}」schema 结构非法，跳过校验`);
          continue;
        }
        const propertyPath = root ? `字段「${field}」` : `${path}.字段「${field}」`;
        validateNode(value[field], subSchema, propertyPath, errors);
      }
    }
  }

  // 数组节点：items 子 Schema 逐元素递归复用同一校验口径
  if (Array.isArray(value) && isPlainObject(schema.items)) {
    value.forEach((item, index) => {
      validateNode(item, schema.items as Record<string, unknown>, `${path}[${index}]`, errors);
    });
  }

  // oneOf：候选 Schema 恰好命中一条；命中 0 条或多于 1 条均报错
  if (Array.isArray(schema.oneOf)) {
    let matches = 0;
    for (const candidate of schema.oneOf) {
      if (!isPlainObject(candidate)) continue;
      const candidateErrors: string[] = [];
      validateNode(value, candidate, path, candidateErrors);
      if (candidateErrors.length === 0) matches += 1;
    }
    if (matches === 0) {
      errors.push(`${path} 未命中 oneOf 中任何候选 Schema`);
    } else if (matches > 1) {
      errors.push(`${path} 同时命中 oneOf 中 ${matches} 个候选 Schema，应恰好命中一条`);
    }
  }
}

/**
 * 轻量 Schema 子集校验：`type`、`required`、`properties`、`enum`、`pattern`、
 * `minimum / maximum`、`minLength / maxLength`、`items`、`oneOf`；
 * `additionalProperties` 不阻断；结构无法判定时收集错误但不抛异常。
 */
export function validateSchema(output: unknown, schema: Record<string, unknown>): SchemaCheckResult {
  const errors: string[] = [];
  if (!isPlainObject(schema)) {
    errors.push('schema 结构非法，跳过校验');
    return { valid: false, errors, output };
  }
  validateNode(output, schema, '根节点', errors);
  return { valid: errors.length === 0, errors, output };
}

/**
 * 重试决策纯函数：默认最多 2 次重试，指数退避 1000ms × 2^(attempt-1)
 * （attempt 1 → 1000ms，attempt 2 → 2000ms）；重试耗尽按风险等级降级。
 */
export function planSchemaRetry(
  attempt: number,
  maxRetries = 2,
  riskLevel: 'low' | 'medium' | 'high' = 'medium',
  lastError?: string,
): SchemaRetryDecision {
  void lastError;
  const shouldRetry = attempt >= 1 && attempt <= maxRetries;
  if (shouldRetry) {
    return {
      shouldRetry: true,
      attempt,
      backoffMs: 1000 * 2 ** (attempt - 1),
      action: 'retry',
    };
  }
  const action: SchemaAction =
    riskLevel === 'low' ? 'template-fallback' : riskLevel === 'medium' ? 'manual-queue' : 'block-submit';
  return { shouldRetry: false, attempt, backoffMs: 0, action };
}

// ============================================================================
// Schema 守卫（事件台账 + 失败计数）
// ============================================================================

export interface SchemaGuardOptions {
  maxRetries?: number;
  baseBackoffMs?: number;
}

/** Schema 守卫：校验、计数、决策、事件留痕；事件字段预留供指标聚合，不直接写资产 metrics */
export class SchemaGuard {
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;
  private events: SchemaGuardEvent[] = [];
  private seq = 0;
  private readonly attempts = new Map<string, number>();

  constructor(options?: SchemaGuardOptions) {
    this.maxRetries = options?.maxRetries ?? 2;
    this.baseBackoffMs = options?.baseBackoffMs ?? 1000;
  }

  /**
   * 校验输出并给出重试 / 降级决策；每次判定写入事件台账；校验成功后该键失败计数清零。
   */
  checkAndPlan(
    output: unknown,
    schema: Record<string, unknown>,
    context: SchemaCheckContext = {},
  ): SchemaRetryDecision {
    const result = validateSchema(output, schema);
    const key = context.assetId ?? context.agentId ?? context.scenario ?? 'default';
    let decision: SchemaRetryDecision;

    if (result.valid) {
      this.attempts.set(key, 0);
      decision = { shouldRetry: false, attempt: 0, backoffMs: 0, action: 'retry' };
    } else {
      const attempt = (this.attempts.get(key) ?? 0) + 1;
      this.attempts.set(key, attempt);
      decision = planSchemaRetry(attempt, this.maxRetries, context.riskLevel ?? 'medium');
      decision.backoffMs = this.baseBackoffMs * 2 ** (attempt - 1);
    }

    this.seq += 1;
    this.events.push({
      seq: this.seq,
      at: new Date().toISOString(),
      assetId: context.assetId,
      version: context.version,
      attempt: decision.attempt,
      valid: result.valid,
      errors: result.errors,
      action: decision.action,
      agentId: context.agentId,
      scenario: context.scenario,
    });
    return decision;
  }

  /** 返回事件深拷贝（按判定先后） */
  listSchemaEvents(): SchemaGuardEvent[] {
    return this.events.map((event) => structuredClone(event));
  }
}

// ============================================================================
// 模块级单例与测试重置
// ============================================================================

let _guard: SchemaGuard | null = null;

/** 获取进程级 Schema 守卫单例 */
export function getSchemaGuard(): SchemaGuard {
  if (!_guard) _guard = new SchemaGuard();
  return _guard;
}

/** 模块单例事件台账查询（供测试与 BFF 预留接入） */
export function listSchemaEvents(): SchemaGuardEvent[] {
  return getSchemaGuard().listSchemaEvents();
}

/** 测试专用：重置 Schema 守卫单例 */
export function _resetSchemaGuard(): void {
  _guard = null;
}
