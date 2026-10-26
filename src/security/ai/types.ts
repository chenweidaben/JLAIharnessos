/**
 * 健澜AI原生医院操作系统OS - security/ai/types.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * AI 输出侧防护（五道防线之第四道）类型契约。
 * 本模块为纯类型定义，不依赖数据库、网络与前端资源。
 *
 * @module security/ai/types
 */

/** 智能体风险等级（与既有 RiskLevel 解耦，仅覆盖 AI 输出场景三档） */
export type AgentRiskLevel = 'low' | 'medium' | 'high';

/** 智能体角色（决定红线规则适用范围） */
export type AgentRole =
  | 'writer'
  | 'qc'
  | 'interpreter'
  | 'consult'
  | 'nurse'
  | 'surgery';

/** 证据级别（与 RAG 引用溯源协议对齐） */
export type EvidenceLevel = 'supported' | 'partial' | 'none';

/** 校验处置级别 */
export type OutboundLevel = 'PASS' | 'CAUTION' | 'BLOCK';

/** 单条发现的严重度 */
export type FindingSeverity = 'info' | 'caution' | 'block';

/** 规则编号（与技术文档 3.6.4 节规则集一一对应） */
export type GuardRuleId =
  | 'fictional-identity'
  | 'contradiction'
  | 'certainty-redline'
  | 'sensitive-redline'
  | 'schema-shape'
  | 'unsupported-claim'
  | 'format-completeness';

/** 原始事实快照：来自 HIS/EMR 实时取数，作为输出一致性比对基准 */
export interface FactSnapshot {
  /** 患者姓名（与快照一致方可出现在输出中） */
  patientName?: string;
  /** 年龄（岁） */
  age?: number;
  /** 性别 */
  gender?: string;
  /** 患者标识 */
  patientId?: string;
  /** 就诊标识 */
  visitId?: string;
  /** 已知诊断列表 */
  diagnoses?: string[];
  /** 已知在用药物列表 */
  medications?: string[];
  /** 关键体征/检验结果键值对（键为项目名，值为原始文本） */
  keyVitals?: Record<string, string>;
}

/** 引用条目（与 RAG 引用溯源协议对齐） */
export interface CitationRef {
  refId: string;
  chunkId: string;
  title?: string;
  sectionPath?: string;
}

/** 待校验的 AI 输出上下文 */
export interface OutboundContext {
  /** 全链路追踪标识，贯穿取数/检索/模型/审计 */
  traceId: string;
  /** 智能体标识 */
  agentId: string;
  /** 智能体版本 */
  agentVersion: string;
  /** 患者/就诊引用（可为空，问答类场景） */
  patient?: { patientId?: string; visitId?: string };
  /** 原始事实快照 */
  facts: FactSnapshot;
  /** 本次生成引用清单 */
  citations: CitationRef[];
  /** 待校验正文 */
  output: string;
  /** 结构化输出载荷（Schema 校验对象，可空） */
  structuredPayload?: Record<string, unknown>;
  /** 结构化输出必填字段名清单（schema-shape 规则使用） */
  requiredFields?: string[];
  /** 文书必备章节关键词清单（format-completeness 规则使用） */
  expectedSections?: string[];
  /** 证据级别；缺省按无引用处理 */
  evidenceLevel?: EvidenceLevel;
  /** 智能体风险等级 */
  riskLevel: AgentRiskLevel;
  /** 智能体角色 */
  role: AgentRole;
  /** 本轮 Schema 校验已失败次数（由调用方重试循环维护） */
  schemaFailures?: number;
}

/** 单条防护发现 */
export interface GuardFinding {
  /** 规则编号 */
  rule: GuardRuleId;
  /** 严重度 */
  severity: FindingSeverity;
  /** 命中片段（证据摘录） */
  excerpt: string;
  /** 问题说明 */
  message: string;
  /** 修改建议（可空） */
  suggestion?: string;
  /** 引用/证据定位（可空） */
  evidenceRef?: string;
}

/** 校验结论 */
export interface OutboundVerdict {
  /** 处置级别 */
  level: OutboundLevel;
  /** 全部发现 */
  findings: GuardFinding[];
  /** 附加标记后的正文（CAUTION 可用；BLOCK 为空字符串） */
  sanitizedOutput: string;
  /** 阻断原因（BLOCK 时必填） */
  blockedReason?: string;
  /** 是否可重试（Schema 失败可重试；红线类不可重试） */
  retryable: boolean;
}
