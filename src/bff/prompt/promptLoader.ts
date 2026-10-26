/**
 * 健澜AI原生医院操作系统OS - bff/prompt/promptLoader.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * 提示词加载链（技术文档 3.4.3 强制顺序）：① system 全局红线 → ② scenario 场景 →
 * ③ department 科室 → ④ task 任务 → ⑤ 工具说明；system 层必须存在且 active，
 * 缺失 / 失效拒绝拼装并记录安全事件；变量替换、Few-shot 引用校验在拼装前完成；
 * 无资产库配置时回退既有 SystemPromptBuilder 默认文本，既有行为不回归。
 *
 * 本切片不迁移既有硬编码 ETHICS_LAYER；智能体包 systemPrompt 只能引用 ②③ 层资产，
 * 加载器不提供传入 system 文本覆盖的入口。
 *
 * @module bff/prompt/promptLoader
 */

import type { BuiltMedicalTool, MedicalUser } from '@/types';
import { SystemPromptBuilder, type MedicalTaskType } from '@/core/agent/SystemPromptBuilder.js';

import type { PromptAsset, PromptAssetRegistry, PromptScope } from './assetRegistry.js';
import { SYSTEM_ETHICS_ASSET_ID, isReservedSystemAssetId } from './assetRegistry.js';
import type { SchemaGuard } from './schemaGuard.js';
import type { PromptMetricsAggregator } from './metricsAggregator.js';

// ============================================================================
// 类型契约
// ============================================================================

/** 加载链上下文（字段口径对齐既有 SystemPromptInput，补充 scenario / agentId / variables） */
export interface SystemPromptContext {
  user: MedicalUser;
  department?: string;
  taskType?: MedicalTaskType;
  tools?: readonly BuiltMedicalTool[];
  extraInstructions?: string;
  variables?: Record<string, string>;
  scenario?: string;
  agentId?: string;
  /**
   * 智能体包携带的 system 文本（A07 保护口径：system 层由平台统一维护，
   * 智能体包传入即拒绝，加载器不提供覆盖入口；缺省不传 = 无覆盖意图）。
   */
  packageSystemPrompt?: string;
}

/** 加载依赖注入；schemaGuard / metrics 预留接入，本切片不在加载阶段调用 */
export interface PromptLoaderDeps {
  registry: PromptAssetRegistry;
  schemaGuard?: SchemaGuard;
  metrics?: PromptMetricsAggregator;
  fallbackBuilder?: SystemPromptBuilder;
}

/** 加载结果：拼装文本、本次用到的资产 id、版本引用清单 */
export interface LoadedPrompt {
  prompt: string;
  assetIds: string[];
  versionRef: string[];
}

/** 加载链安全事件（内存留痕，供 S-08 审计链接入，不落 DB） */
export interface PromptSecurityEvent {
  seq: number;
  at: string;
  type: string;
  agentId?: string;
  scenario?: string;
  message: string;
  evidence?: string;
}

// ============================================================================
// 安全事件台账
// ============================================================================

let _events: PromptSecurityEvent[] = [];
let _eventSeq = 0;

function pushSecurityEvent(type: string, message: string, context: SystemPromptContext, evidence?: string): void {
  _eventSeq += 1;
  _events.push({
    seq: _eventSeq,
    at: new Date().toISOString(),
    type,
    agentId: context.agentId,
    scenario: context.scenario,
    message,
    evidence,
  });
}

/** 返回安全事件深拷贝（按发生先后） */
export function listSecurityEvents(): PromptSecurityEvent[] {
  return _events.map((event) => structuredClone(event));
}

/** 测试专用：清空安全事件台账并复位序号 */
export function _resetPromptSecurityEvents(): void {
  _events = [];
  _eventSeq = 0;
}

// ============================================================================
// 系统种子资产查询（A07：system 红线版本留痕只读引用，不自动登记）
// ============================================================================

/**
 * 回读台账中已登记的系统伦理红线种子资产（active 状态）；未登记返回 undefined。
 * 纯只读引用：不触发登记、不回退 `SystemPromptBuilder.build()`，供审计链与加载链
 * 核对 system 层版本号留痕使用。
 */
export function findSystemEthicsSeed(registry: PromptAssetRegistry): PromptAsset | undefined {
  const seed = registry.getAsset(SYSTEM_ETHICS_ASSET_ID);
  return seed && seed.status === 'active' && seed.level === 'system' ? structuredClone(seed) : undefined;
}

/** 判定资产 ID 是否为 system 层保留种子 ID（透传自资产台账口径） */
export function isSystemReservedAsset(id: string): boolean {
  return isReservedSystemAssetId(id);
}

// ============================================================================
// 变量替换与 Few-shot 校验
// ============================================================================

const PLACEHOLDER_PATTERN = /\$\{([^}]+)\}/g;

/** 替换资产内容中的 `${var}` 占位符；缺失变量与残留占位符均抛中文错误 */
function substituteVariables(asset: PromptAsset, variables: Record<string, string>): string {
  const missing = asset.variables.filter((name) => !(name in variables));
  if (missing.length > 0) {
    throw new Error(`[PL-002] 资产「${asset.id}」缺少变量取值：${missing.join('、')}`);
  }
  let text = asset.content;
  for (const name of asset.variables) {
    text = text.replaceAll(`\${${name}}`, variables[name]);
  }
  const unresolved = [...text.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]);
  if (unresolved.length > 0) {
    throw new Error(`[PL-003] 资产「${asset.id}」存在未解析占位符：${[...new Set(unresolved)].join('、')}`);
  }
  return text;
}

/** 校验并解析 Few-shot 引用；返回示例文本段与新增资产 id / 版本引用 */
function resolveFewShot(
  registry: PromptAssetRegistry,
  asset: PromptAsset,
): { sections: string[]; ids: string[]; refs: string[] } {
  const targets = registry.resolveFewShot(asset.id, registry);
  const sections: string[] = [];
  const ids: string[] = [];
  const refs: string[] = [];
  for (const target of targets) {
    sections.push(`【示例】\n${target.content}`);
    ids.push(target.id);
    refs.push(`prompt:${target.version}`);
  }
  return { sections, ids, refs };
}

/** 工具说明层（⑤）：口径对齐既有 SystemPromptBuilder 工具段，按风险等级标注 */
function buildToolSection(tools: readonly BuiltMedicalTool[]): string {
  const lines = tools.map((tool) => {
    const risk =
      tool.riskLevel === 'high'
        ? '【高风险，需人工确认】'
        : tool.riskLevel === 'medium'
          ? '【中风险】'
          : '';
    return `- ${tool.name}${risk}：${tool.description}`;
  });
  return [
    '【可用工具】',
    '你可在需要时调用以下工具获取或操作医疗数据。调用工具前先判断是否确有必要；高风险工具调用后必须等待人工确认。',
    ...lines,
  ].join('\n');
}

// ============================================================================
// 加载链主入口
// ============================================================================

/**
 * 按强制顺序拼装系统提示词。
 *
 * 1. 资产库无 system 层配置时，回退既有 SystemPromptBuilder 默认文本；
 * 2. system 层资产缺失 / 未 active → 写 `prompt-system-missing` 安全事件并抛错；
 * 3. scenario / department / task 层按 scope 拉取 active 资产，缺层跳过；
 * 4. 变量替换与 Few-shot 引用校验在拼装前完成；
 * 5. 工具说明层追加在任务层之后；补充说明置于末尾。
 */
export function loadSystemPrompt(context: SystemPromptContext, deps: PromptLoaderDeps): LoadedPrompt {
  const { registry } = deps;
  const fallback = deps.fallbackBuilder ?? new SystemPromptBuilder();
  const scope: PromptScope = {
    scenario: context.scenario,
    department: context.department,
    agentId: context.agentId,
  };

  // A07 保护口径：智能体包携带 system 文本即拒绝，system 层不可被覆盖；
  // 与空台账回退路径无关，传入覆盖意图一律留安全事件并抛错。
  if (typeof context.packageSystemPrompt === 'string' && context.packageSystemPrompt.trim().length > 0) {
    pushSecurityEvent(
      'prompt-system-override-rejected',
      '智能体包尝试覆盖 system 层红线文本，已拒绝拼装',
      context,
    );
    throw new Error('[PL-004] system 层由平台统一维护，智能体包禁止传入 systemPrompt 覆盖');
  }

  // 无资产库配置：回退既有默认文本，保证既有岗位提示词行为不回归
  if (registry.listAssets({ level: 'system' }).length === 0) {
    const prompt = fallback.build({
      user: context.user,
      department: context.department,
      taskType: context.taskType,
      tools: context.tools,
      extraInstructions: context.extraInstructions,
    });
    return { prompt, assetIds: [], versionRef: [] };
  }

  const systemAsset = registry.getActiveAsset('system', scope);
  if (!systemAsset) {
    pushSecurityEvent(
      'prompt-system-missing',
      'system 层资产缺失或未处于 active 状态，拒绝发起调用',
      context,
    );
    throw new Error('[PL-001] system 层资产缺失或未激活，已拒绝拼装并记录安全事件');
  }

  const assetIds: string[] = [];
  const versionRef: string[] = [];
  const sections: string[] = [];
  const variables = context.variables ?? {};

  // ① system 层（全局安全红线，平台统一维护、不可绕过）
  let systemText: string;
  try {
    systemText = substituteVariables(systemAsset, variables);
    const fewShot = resolveFewShot(registry, systemAsset);
    assetIds.push(systemAsset.id, ...fewShot.ids);
    versionRef.push(`prompt:${systemAsset.version}`, ...fewShot.refs);
    sections.push(`【系统红线】\n${systemText}`, ...fewShot.sections);
  } catch (error) {
    pushSecurityEvent(
      'prompt-system-invalid',
      `system 层资产校验失败：${error instanceof Error ? error.message : String(error)}`,
      context,
    );
    throw error;
  }

  // ② scenario 层
  const scenarioAsset = registry.getActiveAsset('scenario', scope);
  if (scenarioAsset) {
    const text = substituteVariables(scenarioAsset, variables);
    const fewShot = resolveFewShot(registry, scenarioAsset);
    assetIds.push(scenarioAsset.id, ...fewShot.ids);
    versionRef.push(`prompt:${scenarioAsset.version}`, ...fewShot.refs);
    sections.push(`【场景要求】\n${text}`, ...fewShot.sections);
  }

  // ③ department 层
  const departmentAsset = registry.getActiveAsset('department', scope);
  if (departmentAsset) {
    const text = substituteVariables(departmentAsset, variables);
    const fewShot = resolveFewShot(registry, departmentAsset);
    assetIds.push(departmentAsset.id, ...fewShot.ids);
    versionRef.push(`prompt:${departmentAsset.version}`, ...fewShot.refs);
    sections.push(`【科室规范】\n${text}`, ...fewShot.sections);
  }

  // ④ task 层
  const taskAsset = registry.getActiveAsset('task', scope);
  if (taskAsset) {
    const text = substituteVariables(taskAsset, variables);
    const fewShot = resolveFewShot(registry, taskAsset);
    assetIds.push(taskAsset.id, ...fewShot.ids);
    versionRef.push(`prompt:${taskAsset.version}`, ...fewShot.refs);
    sections.push(`【任务上下文】\n${text}`, ...fewShot.sections);
  }

  // ⑤ 工具说明层
  if (context.tools && context.tools.length > 0) {
    sections.push(buildToolSection(context.tools));
  }

  // 补充说明置于末尾，不得覆盖 system 层文本
  if (context.extraInstructions) {
    sections.push(`【补充说明】\n${context.extraInstructions}`);
  }

  return { prompt: sections.join('\n\n'), assetIds, versionRef };
}
