/**
 * 健澜AI原生医院操作系统OS - 独立格式校验 / 通知 / 写回节点执行器
 *
 * 三类节点独立于 LLM 节点 jsonSchema 与通用 tool 节点承担：
 *   - format-validate：白名单结构校验，不执行任意代码；
 *   - notify：离线组装通知载荷，未注入 sink 时不真正投递；
 *   - writeback：经确认后向目标写回，未注入适配器时返回离线桩位。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { WorkflowNodeType, type NodeDefinition } from '../dsl/types.js';
import type { NodeExecutor, NodeExecutorContext, NodeOutcome } from './types.js';
import { assertNotCancelled, WorkflowCancelledError } from './types.js';
import type { NotifyMessage } from '../engine/runtime.js';

// ============================================================================
// 格式校验节点
// ============================================================================

type WhitelistType = 'string' | 'number' | 'boolean' | 'array' | 'object';

interface WhitelistFieldSchema {
  type?: WhitelistType;
  required?: boolean;
  min?: number;
  max?: number;
  enum?: unknown[];
  items?: WhitelistFieldSchema;
  properties?: Record<string, WhitelistFieldSchema>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveExpression(ctx: NodeExecutorContext['ctx'], expression: string | undefined): unknown {
  if (!expression) return undefined;
  if (expression.includes('${')) return ctx.render(expression);
  return ctx.evaluate(expression);
}

function latestNodeOutput(ctx: NodeExecutorContext['ctx']): unknown {
  const records = ctx.getAllRecords();
  if (records.length === 0) return ctx.input;
  return records[records.length - 1].output;
}

function typeMatches(value: unknown, type: WhitelistType | undefined): boolean {
  if (!type) return true;
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return isPlainObject(value);
    default:
      return false;
  }
}

function validateField(
  value: unknown,
  schema: WhitelistFieldSchema,
  path: string,
  strict: boolean,
  errors: string[],
): void {
  if (value === undefined || value === null) {
    if (schema.required) errors.push(`${path} 为必填项`);
    return;
  }
  if (!typeMatches(value, schema.type)) {
    errors.push(`${path} 类型应为 ${schema.type}，实际为 ${typeof value}`);
    return;
  }
  if (schema.enum && !schema.enum.some((option) => option === value)) {
    errors.push(`${path} 取值不在允许枚举内`);
  }
  if (typeof schema.min === 'number') {
    const size = typeof value === 'number' ? value : Array.isArray(value) || typeof value === 'string' ? value.length : undefined;
    if (size === undefined || size < schema.min) errors.push(`${path} 低于最小约束 ${schema.min}`);
  }
  if (typeof schema.max === 'number') {
    const size = typeof value === 'number' ? value : Array.isArray(value) || typeof value === 'string' ? value.length : undefined;
    if (size === undefined || size > schema.max) errors.push(`${path} 超过最大约束 ${schema.max}`);
  }
  if (schema.type === 'array' && Array.isArray(value)) {
    value.forEach((item, index) => validateField(item, schema.items ?? {}, `${path}[${index}]`, strict, errors));
  }
  if (schema.type === 'object' && isPlainObject(value)) {
    validateObject(value, schema.properties ?? {}, path, strict, errors);
  }
}

function validateObject(
  data: Record<string, unknown>,
  properties: Record<string, WhitelistFieldSchema>,
  basePath: string,
  strict: boolean,
  errors: string[],
): void {
  for (const [field, schema] of Object.entries(properties)) {
    validateField(data[field], schema, `${basePath}.${field}`, strict, errors);
  }
  if (strict) {
    for (const field of Object.keys(data)) {
      if (!(field in properties)) errors.push(`${basePath}.${field} 为未知字段`);
    }
  }
}

export class FormatValidateNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.FORMAT_VALIDATE;

  async execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    const cfg = node.config as {
      schema: Record<string, unknown>;
      source?: string;
      strict?: boolean;
      validPort?: string;
      invalidPort?: string;
    };
    const schema = cfg.schema as WhitelistFieldSchema;
    const data = resolveExpression(nc.ctx, cfg.source) ?? latestNodeOutput(nc.ctx);
    const errors: string[] = [];

    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      return { status: 'failed', error: 'FORMAT_SCHEMA_MISSING: schema 必须为白名单结构对象' };
    }
    if (schema.type === 'object' || schema.properties) {
      if (!isPlainObject(data)) {
        errors.push('根对象必须为 object');
      } else {
        validateObject(data, schema.properties ?? {}, '$', cfg.strict === true, errors);
      }
    } else {
      validateField(data, schema, '$', cfg.strict === true, errors);
    }

    const valid = errors.length === 0;
    const validPort = cfg.validPort ?? 'out';
    const invalidPort = cfg.invalidPort ?? 'invalid';
    return {
      status: 'completed',
      selectedPort: valid ? validPort : invalidPort,
      output: { valid, errors, data },
    };
  }
}

// ============================================================================
// 通知节点
// ============================================================================

export class NotifyNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.NOTIFY;

  async execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    const cfg = node.config as {
      channel: NotifyMessage['channel'];
      recipientExpression: string;
      template: string;
      variables?: Record<string, string>;
      requireConfirmation?: boolean;
    };
    const variables = nc.ctx.applyMapping(cfg.variables ?? {});
    const recipient = cfg.recipientExpression.includes('${')
      ? nc.ctx.render(cfg.recipientExpression)
      : String(nc.ctx.evaluate(cfg.recipientExpression) ?? '');
    const preview = nc.ctx.render(cfg.template);
    const message: NotifyMessage = {
      channel: cfg.channel,
      recipient,
      template: cfg.template,
      variables,
      preview,
      requireConfirmation: cfg.requireConfirmation === true,
      pendingConfirmation: cfg.requireConfirmation === true,
    };

    let delivered = false;
    if (nc.runtime.notifySink) {
      await nc.runtime.notifySink(message);
      delivered = true;
    }

    return {
      status: 'completed',
      selectedPort: 'out',
      output: {
        delivered,
        pending: !delivered,
        channel: cfg.channel,
        recipient,
        preview,
        pendingConfirmation: message.pendingConfirmation,
        message,
      },
    };
  }
}

// ============================================================================
// 写回节点
// ============================================================================

function extractIdentifier(ctx: NodeExecutorContext['ctx'], field: 'patientId' | 'visitId'): string | undefined {
  const patient = ctx.patient as Record<string, unknown>;
  const user = ctx.user as Record<string, unknown>;
  const variables = ctx.getVariables() as Record<string, unknown>;
  const value =
    patient[field] ??
    user[field] ??
    variables[field] ??
    ctx.input[field] ??
    (variables.patient as Record<string, unknown> | undefined)?.[field];
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

export class WritebackNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.WRITEBACK;

  async execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    const cfg = node.config as {
      target: 'emr-draft' | 'audit-log' | 'workflow-state' | 'patient-record';
      mapping: Record<string, string>;
      riskLevel: 'low' | 'medium' | 'high';
      requireConfirmation?: boolean;
      readOnly?: boolean;
    };

    const patientId = extractIdentifier(nc.ctx, 'patientId');
    if (!patientId) {
      return { status: 'failed', error: 'MISSING_PATIENT_ID: 写回必须携带 patientId' };
    }
    const visitId = extractIdentifier(nc.ctx, 'visitId');
    if (!visitId) {
      return { status: 'failed', error: 'MISSING_VISIT_ID: 写回必须携带 visitId' };
    }

    const payload = nc.ctx.applyMapping(cfg.mapping ?? {});
    const riskNeedsConfirmation = cfg.riskLevel === 'medium' || cfg.riskLevel === 'high';
    const explicitConfirmation = cfg.requireConfirmation !== false;
    const confirmed = Boolean(
      nc.ctx.getVariables().writebackConfirmed ?? payload.confirmed ?? false,
    );
    const needsConfirmation = riskNeedsConfirmation && explicitConfirmation && !confirmed;

    if (needsConfirmation && !confirmed) {
      return {
        status: 'waiting_human',
        selectedPort: 'out',
        output: {
          status: 'waiting_human',
          pending: true,
          target: cfg.target,
          riskLevel: cfg.riskLevel,
          patientId,
          visitId,
          payload,
          readOnly: false,
        },
      };
    }

    if (nc.runtime.writebackAdapter) {
      const result = await nc.runtime.writebackAdapter({
        target: cfg.target,
        patientId,
        visitId,
        data: payload,
      });
      return {
        status: 'completed',
        selectedPort: 'out',
        output: {
          persisted: result.persisted,
          pending: !result.persisted,
          target: cfg.target,
          recordId: result.recordId,
          patientId,
          visitId,
          payload,
          readOnly: false,
          error: result.error,
        },
      };
    }

    return {
      status: 'completed',
      selectedPort: 'out',
      output: {
        persisted: false,
        pending: true,
        target: cfg.target,
        riskLevel: cfg.riskLevel,
        patientId,
        visitId,
        payload,
        readOnly: false,
      },
    };
  }
}
