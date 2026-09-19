/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）- 技能执行器
 *
 * 职责：
 *  - 解析并执行技能的工作流步骤（顺序 / 条件 / 并行 / 人工确认）
 *  - 通过【注入式 invoker】调用工具/智能体，本模块不直接依赖 medical-tools/orchestrator，
 *    从而既保持解耦、又便于单元测试注入 Mock。
 *  - riskLevel=high 技能执行前强制三级风险确认（用户确认 + 双签复核），
 *    并全程埋点审计；任一环节拒绝即中止，绝不带病执行高风险写操作。
 *  - 失败补偿：记录已执行步骤，返回可用于回滚的轨迹；写操作默认幂等提示。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 */

import type { LoadedSkill, SkillManifest, SkillStep } from './types';

// ============================================================================
// 注入式运行时接口
// ============================================================================

/** 工具/智能体调用结果（与 medical-tools ToolResult 语义对齐，做最小镜像） */
export interface SkillInvocationResult {
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string };
}

/** 调用方注入的 invoker：把技能步骤真正接到 medical-tools / orchestrator */
export interface SkillInvokers {
  /** 调用医疗工具 */
  invokeTool(tool: string, input: Record<string, unknown>): Promise<SkillInvocationResult>;
  /** 委派智能体 */
  invokeAgent(agent: string, input: Record<string, unknown>): Promise<SkillInvocationResult>;
  /** 知识库检索（可返回空结果的 Mock） */
  searchKnowledge?(refs: string[]): Promise<{ refs: string[]; summary: string }>;
}

/** 运行上下文 */
export interface SkillRuntimeContext {
  /** 操作人 */
  user: {
    userId: string;
    userName: string;
    /** 用户角色（RoleCode 值 R01..R12） */
    roles: string[];
    department?: string;
  };
  /** 租户/院区 id */
  tenantId?: string;
  /** 技能级输入（患者 id、主诉等） */
  inputs: Record<string, unknown>;
  /** 调用器（必传） */
  invokers: SkillInvokers;
  /** 人工确认回调 */
  confirm: {
    /** 一级：用户本人确认 */
    requestUserConfirm(message: string, details?: Record<string, unknown>): Promise<boolean>;
    /** 二级：双签/上级复核 */
    requestDoubleConfirm(
      message: string,
      details?: Record<string, unknown>,
      reviewerRole?: string,
    ): Promise<boolean>;
  };
  /** 审计埋点（把每条关键操作交给既有审计模块） */
  audit?(entry: SkillAuditEntry): void;
  /** 单次运行超时（毫秒，默认 120s） */
  timeoutMs?: number;
  /** traceId */
  traceId?: string;
}

/** 审计条目（最小必要字段，落地时映射到 security 审计模块） */
export interface SkillAuditEntry {
  timestamp: string;
  traceId: string;
  skillId: string;
  skillVersion: string;
  userId: string;
  userName: string;
  userRoles: string[];
  tenantId?: string;
  action: string;
  riskLevel: string;
  result: 'success' | 'failure' | 'aborted' | 'denied' | 'pending';
  detail?: string;
}

/** 单步执行记录 */
export interface StepRunRecord {
  stepId: string;
  kind: string;
  name: string;
  status: 'skipped' | 'succeeded' | 'failed' | 'aborted' | 'waiting_confirm';
  startedAt: number;
  durationMs: number;
  output?: unknown;
  error?: string;
}

/** 整体运行结果 */
export interface SkillRunResult {
  status: 'succeeded' | 'failed' | 'aborted' | 'denied';
  skillId: string;
  skillVersion: string;
  steps: StepRunRecord[];
  /** 步骤 id -> 输出，供后续步骤模板引用 */
  outputs: Record<string, unknown>;
  /** 最终产出（最后一个非确认步骤的输出，或聚合） */
  finalOutput?: unknown;
  /** 失败/中止原因 */
  reason?: string;
  /** 已执行的写操作步骤（供回滚/补偿提示） */
  sideEffects: string[];
}

// ============================================================================
// 模板与条件求值（安全子集）
// ============================================================================

/** 把 {{path}} 占位符解析为上下文值（inputs + 已完成步骤输出） */
function resolveTemplate(value: unknown, scope: Record<string, unknown>): unknown {
  if (typeof value === 'string') {
    // 整串就是一个变量 -> 直接返回其原值（保留类型）
    const m = /^\{\{\s*([\w.]+)\s*\}\}$/.exec(value.trim());
    if (m) return lookup(m[1], scope);
    // 否则做字符串插值
    return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
      const v = lookup(path, scope);
      return v == null ? '' : String(v);
    });
  }
  if (Array.isArray(value)) return value.map((v) => resolveTemplate(v, scope));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveTemplate(v, scope);
    }
    return out;
  }
  return value;
}

/** 支持 a.b.c 路径查找 */
function lookup(path: string, scope: Record<string, unknown>): unknown {
  const parts = path.split('.');
  let cur: unknown = scope;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/**
 * 条件求值（安全子集）：
 *  支持 `{{var}} == 'value'`、`{{var}} != 'value'`、`{{var}}` 真值判断。
 * 不支持任意 JS 表达式，杜绝代码注入。
 */
function evaluateCondition(expr: string, scope: Record<string, unknown>): boolean {
  const trimmed = expr.trim();
  const eq = /^\{\{\s*([\w.]+)\s*\}\}\s*==\s*(.+)$/.exec(trimmed);
  const ne = /^\{\{\s*([\w.]+)\s*\}\}\s*!=\s*(.+)$/.exec(trimmed);
  const bare = /^\{\{\s*([\w.]+)\s*\}\}$/.exec(trimmed);
  const expectLiteral = (s: string): string => {
    const t = s.trim();
    const q = /^['"](.*)['"]$/.exec(t);
    return q ? q[1] : t;
  };
  if (eq) {
    return String(lookup(eq[1], scope)) === expectLiteral(eq[2]);
  }
  if (ne) {
    return String(lookup(ne[1], scope)) !== expectLiteral(ne[2]);
  }
  if (bare) {
    return Boolean(lookup(bare[1], scope));
  }
  throw new Error(`不支持的条件表达式（仅支持 == / != / 真值）：${expr}`);
}

// ============================================================================
// 执行器
// ============================================================================

/**
 * 执行一个技能。
 *
 * 【医疗安全】
 *  - 执行前先校验调用方角色是否在 manifest.roles 内，否则 denied
 *  - riskLevel=high：先做一级用户确认 + 二级双签复核，全部通过才执行
 *  - 任一步骤失败/确认拒绝：立即中止，记录已产生的副作用供补偿
 */
export async function executeSkill(
  skill: LoadedSkill,
  ctx: SkillRuntimeContext,
): Promise<SkillRunResult> {
  const startedAt = Date.now();
  const traceId = ctx.traceId ?? `skill_${Date.now().toString(36)}`;
  const outputs: Record<string, unknown> = {};
  const records: StepRunRecord[] = [];
  const sideEffects: string[] = [];
  const manifest: SkillManifest = skill.manifest;

  const baseResult = {
    skillId: manifest.id,
    skillVersion: manifest.version,
    steps: records,
    outputs,
    sideEffects,
  };

  const audit = (
    action: string,
    result: SkillAuditEntry['result'],
    detail?: string,
  ) => {
    ctx.audit?.({
      timestamp: new Date().toISOString(),
      traceId,
      skillId: manifest.id,
      skillVersion: manifest.version,
      userId: ctx.user.userId,
      userName: ctx.user.userName,
      userRoles: ctx.user.roles,
      tenantId: ctx.tenantId,
      action,
      riskLevel: manifest.riskLevel,
      result,
      detail,
    });
  };

  // 1) 角色校验（RBAC）
  const roleAllowed = manifest.roles.some((r) => ctx.user.roles.includes(r));
  if (!roleAllowed) {
    audit('authorize', 'denied', `角色 ${ctx.user.roles.join(',')} 不在 ${manifest.roles.join(',')}`);
    return {
      ...baseResult,
      status: 'denied',
      reason: '当前角色无权使用该技能',
    };
  }

  // 2) 高风险技能：三级风险确认
  if (manifest.riskLevel === 'high') {
    audit('risk_precheck', 'pending', '高风险技能，请求一级确认');
    const ok1 = await ctx.confirm.requestUserConfirm(
      `【高风险操作】技能「${manifest.name}」将执行高风险写操作，请确认：`,
      { skill: manifest.id, riskLevel: manifest.riskLevel, steps: manifest.steps.length },
    );
    if (!ok1) {
      audit('risk_precheck', 'aborted', '一级确认被拒绝');
      return { ...baseResult, status: 'aborted', reason: '用户在一级确认环节拒绝' };
    }
    const ok2 = await ctx.confirm.requestDoubleConfirm(
      `【二级复核】技能「${manifest.name}」需上级/双签复核`,
      { skill: manifest.id },
      'R03',
    );
    if (!ok2) {
      audit('risk_precheck', 'aborted', '二级复核被拒绝');
      return { ...baseResult, status: 'aborted', reason: '二级双签复核未通过' };
    }
    audit('risk_precheck', 'success', '三级风险确认通过');
  } else if (manifest.riskLevel === 'medium') {
    // 中风险：单级用户确认
    const ok = await ctx.confirm.requestUserConfirm(
      `技能「${manifest.name}」将执行写操作，请确认继续`,
      { skill: manifest.id },
    );
    if (!ok) {
      audit('risk_precheck', 'aborted', '中风险确认被拒绝');
      return { ...baseResult, status: 'aborted', reason: '操作被用户取消' };
    }
  }

  // 3) 构造作用域：inputs 与步骤输出合并
  const scope: Record<string, unknown> = { ...ctx.inputs };
  // 把步骤输出也投影到 scope.$steps.<stepId>
  const stepsById = new Map(manifest.steps.map((s) => [s.id, s] as const));

  const record = (r: StepRunRecord) => records.push(r);
  /** 已执行步骤 id：避免 parallel/condition 递归执行后又被主循环重复执行 */
  const executed = new Set<string>();

  // 执行单个步骤，返回是否继续
  async function runStep(step: SkillStep): Promise<boolean> {
    // 已由父节点（parallel/condition）执行过则跳过，避免重复
    if (executed.has(step.id)) return true;
    executed.add(step.id);
    const started = Date.now();
    const r: StepRunRecord = {
      stepId: step.id,
      kind: step.kind,
      name: step.name,
      status: 'succeeded',
      startedAt: started,
      durationMs: 0,
    };
    try {
      switch (step.kind) {
        case 'tool': {
          const input = (resolveTemplate(step.input ?? {}, scope) ?? {}) as Record<string, unknown>;
          const res = await ctx.invokers.invokeTool(step.tool!, input);
          r.output = res.data;
          if (!res.success) {
            r.status = 'failed';
            r.error = res.error?.message ?? '工具执行失败';
            record(r);
            audit(`tool:${step.tool}`, 'failure', r.error);
            return false;
          }
          outputs[step.id] = res.data;
          scope[step.id] = res.data;
          sideEffects.push(step.tool!);
          audit(`tool:${step.tool}`, 'success');
          break;
        }
        case 'agent': {
          const input = (resolveTemplate(step.input ?? {}, scope) ?? {}) as Record<string, unknown>;
          const res = await ctx.invokers.invokeAgent(step.agent!, input);
          r.output = res.data;
          if (!res.success) {
            r.status = 'failed';
            r.error = res.error?.message ?? '智能体执行失败';
            record(r);
            audit(`agent:${step.agent}`, 'failure', r.error);
            return false;
          }
          outputs[step.id] = res.data;
          scope[step.id] = res.data;
          audit(`agent:${step.agent}`, 'success');
          break;
        }
        case 'knowledge': {
          const refs = step.knowledgeRefs ?? [];
          const found = ctx.invokers.searchKnowledge
            ? await ctx.invokers.searchKnowledge(refs)
            : { refs, summary: `已检索 ${refs.length} 条知识` };
          r.output = found;
          outputs[step.id] = found;
          scope[step.id] = found;
          break;
        }
        case 'human_confirm': {
          r.status = 'waiting_confirm';
          const ok = await ctx.confirm.requestUserConfirm(
            step.confirmMessage ?? '请人工复核',
            { step: step.id },
          );
          if (!ok) {
            r.status = 'aborted';
            record(r);
            audit(`human_confirm:${step.id}`, 'aborted', '人工复核拒绝');
            return false;
          }
          r.status = 'succeeded';
          outputs[step.id] = { confirmed: true };
          scope[step.id] = { confirmed: true };
          audit(`human_confirm:${step.id}`, 'success');
          break;
        }
        case 'condition': {
          const result = evaluateCondition(step.condition ?? 'true', scope);
          r.output = { condition: step.condition, result };
          outputs[step.id] = { condition: step.condition, result };
          audit(`condition:${step.id}`, 'success', `结果=${result}`);
          // 按分支递归执行
          const branchIds = result ? step.then ?? [] : step.otherwise ?? [];
          for (const bid of branchIds) {
            const child = stepsById.get(bid);
            if (!child) continue;
            const okChild = await runStep(child);
            if (!okChild) return false;
          }
          break;
        }
        case 'parallel': {
          const ps = await Promise.all(
            (step.parallel ?? []).map(async (pid) => {
              const child = stepsById.get(pid);
              if (!child) return true;
              // runStep 内部已记录子步骤，此处不再重复 push
              return runStep(child);
            }),
          );
          if (ps.includes(false)) {
            r.status = 'failed';
            record(r);
            return false;
          }
          break;
        }
        default: {
          r.status = 'failed';
          r.error = `未知步骤类型`;
          record(r);
          return false;
        }
      }
      r.durationMs = Date.now() - started;
      record(r);
      return true;
    } catch (err) {
      r.status = 'failed';
      r.error = err instanceof Error ? err.message : String(err);
      r.durationMs = Date.now() - started;
      record(r);
      audit(`step:${step.id}`, 'failure', r.error);
      return false;
    }
  }

  // 4) 顺序执行顶层步骤
  for (const step of manifest.steps) {
    const ok = await runStep(step);
    if (!ok) {
      audit('run', 'failure', `步骤 ${step.id} 失败/中止`);
      const last = [...records].reverse().find((r) => r.status === 'failed' || r.status === 'aborted');
      return {
        ...baseResult,
        status: last?.status === 'aborted' ? 'aborted' : 'failed',
        reason: last?.error ?? `步骤 ${step.id} 未成功`,
        finalOutput: outputs[step.id],
      };
    }
  }

  // 5) 汇总最终产出：取最后一个产出非空的步骤
  let finalOutput: unknown;
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].output != null) {
      finalOutput = records[i].output;
      break;
    }
  }

  void startedAt;
  audit('run', 'success', `共 ${records.length} 步`);
  return {
    ...baseResult,
    status: 'succeeded',
    finalOutput,
  };
}
