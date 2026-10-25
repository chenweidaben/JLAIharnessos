/**
 * 工具注册表（契约 §6）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 规范驼峰名 + 下划线别名双轨解析；参数归一化（下划线键转驼峰、剔未知键）；
 * 五个内置工具返回确定性 DEMO 结果，不联网。工具审计只留脱敏摘要字段。
 */

import { SAMPLE_DRUG_FACTS, SAMPLE_KNOWLEDGE } from '../demo/demoSeed';
import type { ConsultProfileMemory, EvidenceItem } from '../types';
import { extractEvidence, type RawEvidenceEntry } from './evidenceExtractor';

/** 工具执行上下文：traceId 透传审计，memory 供画像类工具读取 */
export interface ToolContext {
  traceId: string;
  memory: ConsultProfileMemory;
}

/** 工具执行结果（不携带原始入参） */
export interface ToolResult {
  success: boolean;
  evidence: EvidenceItem[];
  summary: string;
  errorClass: string | null;
}

/** 工具描述符：name 为规范驼峰名，aliases 兼容旧下划线别名 */
export interface ToolDescriptor {
  name: string;
  aliases: string[];
  description: string;
  /** 允许的参数键（驼峰）；未登记键在归一化时剔除；缺省表示不做键白名单过滤 */
  knownArgs?: string[];
  run(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}

/** 工具清单条目（快照 / 展示用，不含执行函数） */
export interface ToolListing {
  name: string;
  description: string;
  aliases: string[];
}

/** 下划线键名转驼峰键名 */
function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

/** 取字符串参数（归一化后读取，缺省返回空串） */
function readStringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** 取字符串数组参数（兼容单字符串入参） */
function readStringArrayArg(args: Record<string, unknown>, key: string): string[] {
  const value = args[key];
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,，、\s]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

/** 知识库检索内置工具（DEMO 确定性科普条目） */
async function searchKnowledgeBase(args: Record<string, unknown>): Promise<ToolResult> {
  const query = readStringArg(args, 'query');
  const entries: RawEvidenceEntry[] = [];
  for (const sample of SAMPLE_KNOWLEDGE) {
    if (!query || sample.keywords.some((keyword) => query.includes(keyword))) {
      entries.push({ label: sample.label, snippet: sample.snippet, source: '知识库 DEMO 条目' });
    }
  }
  const evidence = extractEvidence('searchKnowledgeBase', entries);
  return {
    success: true,
    evidence,
    summary: `知识库检索完成（DEMO）：命中 ${evidence.length} 条健康科普条目，仅供就诊参考。`,
    errorClass: null,
  };
}

/** 药品说明书检索内置工具（DEMO 确定性摘要） */
async function lookupDrug(args: Record<string, unknown>): Promise<ToolResult> {
  const drugName = readStringArg(args, 'drugName');
  const entries: RawEvidenceEntry[] = [];
  for (const sample of SAMPLE_DRUG_FACTS) {
    if (!drugName || sample.keywords.some((keyword) => drugName.includes(keyword))) {
      entries.push({
        label: sample.label,
        snippet: sample.snippet,
        source: '药品说明书 DEMO 摘要',
      });
    }
  }
  const evidence = extractEvidence('lookupDrug', entries);
  const drugScope = drugName ? `关于“${drugName}”` : '';
  return {
    success: true,
    evidence,
    summary: evidence.length
      ? `药品说明书检索完成（DEMO）：${drugScope}命中 ${evidence.length} 条药品摘要，须经执业药师 / 医师复核。`
      : '药品说明书未命中相关条目（DEMO），请提供具体药品通用名。',
    errorClass: null,
  };
}

/** 过敏史核对内置工具（读取画像事实，DEMO） */
async function checkAllergy(_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const allergyFacts = ctx.memory.facts.filter(
    (fact) => fact.key === 'allergy' || fact.key === 'drug_intolerance',
  );
  const entries: RawEvidenceEntry[] = allergyFacts.map((fact) => ({
    label: fact.key === 'allergy' ? '画像过敏史' : '画像药物不耐受',
    snippet: fact.value,
    source: `画像事实（来源：${fact.source}）`,
  }));
  const evidence = extractEvidence('checkAllergy', entries);
  return {
    success: true,
    evidence,
    summary: evidence.length
      ? `已核对画像过敏 / 不耐受史（DEMO）：记录 ${evidence.length} 条，处方前须再次人工核实。`
      : '画像中未记录过敏史与药物不耐受（DEMO），用药前仍须当面核实。',
    errorClass: null,
  };
}

/** 药物相互作用核对内置工具（DEMO 规则提示，不做自动处方） */
async function checkInteraction(args: Record<string, unknown>): Promise<ToolResult> {
  const drugNames = readStringArrayArg(args, 'drugNames');
  const entries: RawEvidenceEntry[] = [];
  if (drugNames.length >= 2) {
    entries.push({
      label: '多药联用相互作用提示（DEMO）',
      snippet: `已登记联用候选：${drugNames.join('、')}；多药联用存在相互作用风险，须由执业药师 / 医师逐项复核，AI 不自动给出联用方案。`,
      source: '相互作用规则快照 DEMO',
    });
  } else if (drugNames.length === 1) {
    entries.push({
      label: '单药使用提示（DEMO）',
      snippet: `候选药品：${drugNames[0]}；未检测到联用组合，仍须结合患者过敏史与基础疾病由医师 / 药师复核。`,
      source: '相互作用规则快照 DEMO',
    });
  }
  const evidence = extractEvidence('checkInteraction', entries);
  return {
    success: true,
    evidence,
    summary: '相互作用规则核对完成（DEMO）：结果仅作风险提示，不构成联用或处方结论。',
    errorClass: null,
  };
}

/** 既往病史读取内置工具（读取画像慢性病事实，DEMO） */
async function retrievePatientHistory(
  _args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const historyFacts = ctx.memory.facts.filter((fact) => fact.key === 'chronic_condition');
  const entries: RawEvidenceEntry[] = historyFacts.map((fact) => ({
    label: '既往慢性病史（画像）',
    snippet: fact.value,
    source: `画像事实（来源：${fact.source}）`,
  }));
  const evidence = extractEvidence('retrievePatientHistory', entries);
  return {
    success: true,
    evidence,
    summary: evidence.length
      ? `既往病史读取完成（DEMO）：画像记录 ${evidence.length} 项慢性病事实，须结合线下病历核实。`
      : '画像中未记录慢性病史（DEMO）。',
    errorClass: null,
  };
}

/** 工具注册表：管理描述符注册、别名解析、参数归一化与调用 */
export class ToolRegistry {
  private readonly descriptors = new Map<string, ToolDescriptor>();

  /** 注册工具描述符；规范名重复注册时覆盖旧条目 */
  register(descriptor: ToolDescriptor): void {
    this.descriptors.set(descriptor.name, descriptor);
  }

  /** 按规范驼峰名或下划线别名解析描述符；未命中返回 null */
  resolve(name: string): ToolDescriptor | null {
    const normalized = name.trim();
    for (const descriptor of this.descriptors.values()) {
      if (descriptor.name === normalized) {
        return descriptor;
      }
      if (descriptor.aliases.includes(normalized)) {
        return descriptor;
      }
    }
    return null;
  }

  /** 参数归一化：下划线键转驼峰；未知键在 invoke 阶段按描述符 knownArgs 剔除 */
  normalizeArgs(raw: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      normalized[snakeToCamel(key)] = value;
    }
    return normalized;
  }

  /** 按描述符 knownArgs 白名单过滤参数；未声明 knownArgs 时保留全部归一化参数 */
  private filterKnownArgs(
    descriptor: ToolDescriptor,
    normalized: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!descriptor.knownArgs) {
      return normalized;
    }
    const filtered: Record<string, unknown> = {};
    for (const key of descriptor.knownArgs) {
      if (key in normalized) {
        filtered[key] = normalized[key];
      }
    }
    return filtered;
  }

  /**
   * 调用工具：解析别名 -> 归一化参数 -> 执行 -> 捕获异常为 errorClass；
   * 不回显原始入参，审计由调用方基于 ToolResult 摘要构造。
   */
  async invoke(
    name: string,
    rawArgs: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const descriptor = this.resolve(name);
    if (!descriptor) {
      return {
        success: false,
        evidence: [],
        summary: `未知工具: ${name}`,
        errorClass: 'ToolNotFound',
      };
    }
    const normalized = this.filterKnownArgs(descriptor, this.normalizeArgs(rawArgs));
    try {
      return await descriptor.run(normalized, ctx);
    } catch (error) {
      return {
        success: false,
        evidence: [],
        summary: `工具 ${descriptor.name} 执行异常，已按安全降级处理。`,
        errorClass: error instanceof Error ? error.constructor.name : 'UnknownError',
      };
    }
  }

  /** 返回全部已注册工具清单（不含执行函数） */
  list(): ToolListing[] {
    return [...this.descriptors.values()].map((descriptor) => ({
      name: descriptor.name,
      description: descriptor.description,
      aliases: descriptor.aliases,
    }));
  }
}

/** 创建含五个内置 DEMO 工具的默认注册表 */
export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register({
    name: 'searchKnowledgeBase',
    aliases: ['search_knowledge_base'],
    description: '知识库检索（健康科普条目 DEMO）',
    knownArgs: ['query'],
    run: (args) => searchKnowledgeBase(args),
  });
  registry.register({
    name: 'lookupDrug',
    aliases: ['lookup_drug'],
    description: '药品说明书 / 适应证 / 禁忌 DEMO 摘要',
    knownArgs: ['drugName'],
    run: (args) => lookupDrug(args),
  });
  registry.register({
    name: 'checkAllergy',
    aliases: ['check_allergy'],
    description: '过敏史核对（读取画像事实）',
    knownArgs: [],
    run: (args, ctx) => checkAllergy(args, ctx),
  });
  registry.register({
    name: 'checkInteraction',
    aliases: ['check_interaction'],
    description: '药物相互作用提示 DEMO 规则',
    knownArgs: ['drugNames'],
    run: (args) => checkInteraction(args),
  });
  registry.register({
    name: 'retrievePatientHistory',
    aliases: ['retrieve_patient_history'],
    description: '既往病史 DEMO 读取（画像事实）',
    knownArgs: [],
    run: (args, ctx) => retrievePatientHistory(args, ctx),
  });
  return registry;
}
