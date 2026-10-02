/**
 * 健澜科技 jlmedaios - 低代码智能体搭建 API 类型（M4-B）
 * 与后端 agentBuilderAggregator / agentBuilderRepo 视图模型对齐。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { ValidationResult } from './builder';

/** 智能体列表项 */
export interface AgentBuilderSummary {
  agentId: string;
  name: string;
  nameEn: string | null;
  category: string;
  riskLevel: string;
  description: string;
  status: string;
  currentVersion: string | null;
  versionCount: number;
  hasDraft: boolean;
  ownerId: string | null;
  builtin: boolean;
  updatedAt: string;
}

/** 智能体版本记录 */
export interface AgentVersionView {
  id: string;
  agentId: string;
  version: string;
  definition: Record<string, unknown>;
  prompts: Record<string, string>;
  checksum: string | null;
  changelog: string | null;
  published: boolean;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
}

/** 智能体详情（含版本列表与草稿） */
export interface AgentBuilderDetail {
  agent: {
    id: string;
    agentId: string;
    name: string;
    nameEn: string | null;
    category: string;
    riskLevel: string;
    description: string;
    tags: string[];
    allowedRoles: string[];
    tools: string[];
    knowledgeBases: string[];
    builtin: boolean;
    status: string;
    currentVersion: string | null;
    ownerId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  versions: AgentVersionView[];
  draft: AgentVersionView | null;
}

/** 版本递增类型 */
export type BumpKind = 'major' | 'minor' | 'patch';

/** 保存草稿结果 */
export interface SaveDraftResult {
  agentId: string;
  created: boolean;
  validation: ValidationResult;
}

/** 发布结果 */
export interface PublishResult {
  agentId: string;
  version: string;
  checksum: string;
}

/** 校验结果 */
export interface ValidateResult {
  agentId: string;
  validation: ValidationResult;
}
