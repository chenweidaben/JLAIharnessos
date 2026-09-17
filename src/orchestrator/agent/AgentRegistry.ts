/**
 * 健澜科技杠OS - 智能体注册中心
 *
 * 管理已加载/已发布的智能体定义，支持多版本、启用禁用、按分类与角色检索，
 * 并聚合智能体声明的工具集与知识库引用，供权限校验、低代码市场与 BFF 使用。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { AgentDefinition, SemVer } from '../dsl/types.js';

/** 智能体查询条件 */
export interface AgentQuery {
  category?: string;
  role?: string;
  enabledOnly?: boolean;
  tag?: string;
}

/** 注册条目 */
interface RegistryEntry {
  /** 版本 -> 定义 */
  versions: Map<SemVer, AgentDefinition>;
  /** 最新版本号 */
  latest: SemVer;
}

/**
 * 智能体注册中心
 */
export class AgentRegistry {
  private readonly agents = new Map<string, RegistryEntry>();
  /** 提示词资源：agentId -> (路径 -> 文本) */
  private readonly promptAssets = new Map<string, Record<string, string>>();

  /** 注册智能体（可多版本） */
  register(agent: AgentDefinition, prompts?: Record<string, string>): void {
    let entry = this.agents.get(agent.id);
    if (!entry) {
      entry = { versions: new Map(), latest: agent.version };
      this.agents.set(agent.id, entry);
    }
    entry.versions.set(agent.version, agent);
    if (compareSemVer(agent.version, entry.latest) >= 0) {
      entry.latest = agent.version;
    }
    if (prompts) this.promptAssets.set(agent.id, { ...(this.promptAssets.get(agent.id) ?? {}), ...prompts });
  }

  /** 注销智能体（全部版本） */
  unregister(agentId: string): boolean {
    this.promptAssets.delete(agentId);
    return this.agents.delete(agentId);
  }

  /** 是否存在智能体（任一启用版本即视为存在） */
  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /** 获取指定版本（缺省最新） */
  get(agentId: string, version?: SemVer): AgentDefinition | undefined {
    const entry = this.agents.get(agentId);
    if (!entry) return undefined;
    const v = version ?? entry.latest;
    return entry.versions.get(v);
  }

  /** 获取提示词资源 */
  getPrompts(agentId: string): Record<string, string> {
    return this.promptAssets.get(agentId) ?? {};
  }

  /** 启用/禁用某版本（缺省最新） */
  setEnabled(agentId: string, enabled: boolean, version?: SemVer): void {
    const agent = this.get(agentId, version);
    if (agent) agent.enabled = enabled;
  }

  /** 列出智能体（缺省返回最新版本的定义） */
  list(query: AgentQuery = {}): AgentDefinition[] {
    const result: AgentDefinition[] = [];
    for (const entry of this.agents.values()) {
      const agent = entry.versions.get(entry.latest)!;
      if (query.enabledOnly && agent.enabled === false) continue;
      if (query.category && agent.category !== query.category) continue;
      if (query.tag && !agent.tags.includes(query.tag)) continue;
      if (query.role && !agent.allowedRoles.includes(query.role)) continue;
      result.push(agent);
    }
    return result;
  }

  /** 智能体总数（按 ID） */
  get size(): number {
    return this.agents.size;
  }

  /** 版本数量 */
  versionCount(agentId: string): number {
    return this.agents.get(agentId)?.versions.size ?? 0;
  }

  /** 聚合智能体声明的全部工具名（去重） */
  collectTools(agentId: string): string[] {
    const agent = this.get(agentId);
    return agent ? [...new Set(agent.tools)] : [];
  }
}

/** 比较 SemVer：a>b 返回 1，相等 0，a<b 返回 -1 */
export function compareSemVer(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}
