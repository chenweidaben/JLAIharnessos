/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）- 技能注册中心
 *
 * 职责：
 *  - 注册 / 热注册技能（支持多版本）
 *  - 版本与 enabled 管理
 *  - 按角色（RBAC）/ 租户 / 院区过滤可用技能
 *  - 租户级覆盖：仅允许覆盖 enabled 与运行参数；
 *    【安全红线】系统技能本体（清单正文、步骤、工具依赖）不可被租户改写。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 */

import type { LoadedSkill, SkillManifest, SkillRole } from './types';

/** 技能查询条件 */
export interface SkillQuery {
  /** 仅返回含指定角色的技能（RoleCode 值） */
  roles?: string[];
  /** 仅返回启用的技能 */
  enabledOnly?: boolean;
  /** 业务分类 */
  category?: string;
  /** 标签 */
  tag?: string;
  /** 租户/院区 id（用于套用租户级覆盖） */
  tenantId?: string;
}

/** 租户级覆盖（仅可覆盖 enabled 与参数，不可改本体） */
export interface TenantOverride {
  enabled?: boolean;
  /** 技能运行参数覆盖（如阈值、超时） */
  params?: Record<string, unknown>;
}

interface RegistryEntry {
  /** version -> 已加载技能 */
  versions: Map<string, LoadedSkill>;
  /** 最新版本 */
  latest: string;
}

/** 尝试把版本号转成可比较的三元组（失败返回 null） */
function toTuple(v: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** 比较 semVer：a>b 返回 1，相等 0，a<b 返回 -1 */
export function compareSkillVersion(a: string, b: string): number {
  const pa = toTuple(a);
  const pb = toTuple(b);
  if (!pa || !pb) return a === b ? 0 : a < b ? -1 : 1;
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

/**
 * 技能注册中心。
 *
 * 线程/并发模型：单进程内同步操作；BFF 单事件循环下无需加锁。
 */
export class SkillRegistry {
  private readonly entries = new Map<string, RegistryEntry>();
  /** 租户 -> (skillId -> 覆盖) */
  private readonly tenantOverrides = new Map<string, Map<string, TenantOverride>>();

  /** 注册一个已加载技能（可多版本） */
  register(skill: LoadedSkill): void {
    const id = skill.manifest.id;
    let entry = this.entries.get(id);
    if (!entry) {
      entry = { versions: new Map(), latest: skill.manifest.version };
      this.entries.set(id, entry);
    }
    entry.versions.set(skill.manifest.version, skill);
    if (compareSkillVersion(skill.manifest.version, entry.latest) >= 0) {
      entry.latest = skill.manifest.version;
    }
  }

  /** 热注册（运行时由工作室/API 提交新清单） */
  hotRegister(manifest: SkillManifest, body: string, filePath = '<runtime>'): void {
    this.register({ manifest, body, filePath });
  }

  /** 注销某技能全部版本 */
  unregister(skillId: string): boolean {
    return this.entries.delete(skillId);
  }

  /** 是否存在 */
  has(skillId: string): boolean {
    return this.entries.has(skillId);
  }

  /** 获取指定版本（缺省最新） */
  get(skillId: string, version?: string): LoadedSkill | undefined {
    const entry = this.entries.get(skillId);
    if (!entry) return undefined;
    return entry.versions.get(version ?? entry.latest);
  }

  /** 版本数量 */
  versionCount(skillId: string): number {
    return this.entries.get(skillId)?.versions.size ?? 0;
  }

  /** 技能总数（按 id） */
  get size(): number {
    return this.entries.size;
  }

  /** 设置某技能在系统级的启用状态（系统管理员操作，不涉及租户覆盖） */
  setEnabled(skillId: string, enabled: boolean, version?: string): void {
    const skill = this.get(skillId, version);
    if (skill) skill.manifest.enabled = enabled;
  }

  /**
   * 设置租户级覆盖。
   * 【安全红线】仅当技能声明 tenantScope=true 时允许覆盖；
   *              系统技能（tenantScope=false）拒绝被租户改写。
   * @returns 是否成功应用
   */
  setTenantOverride(skillId: string, tenantId: string, override: TenantOverride): boolean {
    const skill = this.get(skillId);
    if (!skill) return false;
    if (skill.manifest.tenantScope === false) return false;
    let t = this.tenantOverrides.get(tenantId);
    if (!t) {
      t = new Map();
      this.tenantOverrides.set(tenantId, t);
    }
    t.set(skillId, { ...(t.get(skillId) ?? {}), ...override });
    return true;
  }

  /** 读取租户级覆盖 */
  getTenantOverride(skillId: string, tenantId: string): TenantOverride | undefined {
    return this.tenantOverrides.get(tenantId)?.get(skillId);
  }

  /** 计算某技能在指定租户下的"有效启用状态" */
  isEffectivelyEnabled(skill: LoadedSkill, tenantId?: string): boolean {
    if (!skill.manifest.enabled) return false;
    if (tenantId && skill.manifest.tenantScope !== false) {
      const ov = this.tenantOverrides.get(tenantId)?.get(skill.manifest.id);
      if (ov && ov.enabled === false) return false;
    }
    return true;
  }

  /**
   * 列出技能（缺省返回最新版本）。
   * 会按 query.roles 做 RBAC 过滤、按 tenantId 套用覆盖。
   */
  list(query: SkillQuery = {}): LoadedSkill[] {
    const result: LoadedSkill[] = [];
    for (const entry of this.entries.values()) {
      const skill = entry.versions.get(entry.latest)!;
      if (query.enabledOnly && !this.isEffectivelyEnabled(skill, query.tenantId)) continue;
      if (query.category && skill.manifest.category !== query.category) continue;
      if (query.tag && !skill.manifest.tags.includes(query.tag)) continue;
      if (query.roles && query.roles.length > 0) {
        const allowed = skill.manifest.roles.some((r) =>
          (query.roles as string[]).includes(r),
        );
        if (!allowed) continue;
      }
      result.push(skill);
    }
    result.sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));
    return result;
  }

  /** 聚合某技能声明的全部依赖（工具/智能体/知识/CDS），供权限与试运行使用 */
  collectDependencies(skillId: string): {
    tools: string[];
    agents: string[];
    knowledge: string[];
    cdsRules: string[];
  } {
    const m = this.get(skillId)?.manifest;
    if (!m) return { tools: [], agents: [], knowledge: [], cdsRules: [] };
    return {
      tools: [...m.requiredTools],
      agents: [...m.requiredAgents],
      knowledge: [...m.requiredKnowledge],
      cdsRules: [...m.requiredCdsRules],
    };
  }

  /** 清空（主要用于测试） */
  clear(): void {
    this.entries.clear();
    this.tenantOverrides.clear();
  }
}

/** 全部合法角色值（供 API 与前端下拉使用） */
export const ALL_SKILL_ROLES: Record<string, string> = {
  R01: '系统管理员',
  R02: '科室主任',
  R03: '主任医师',
  R04: '副主任医师',
  R05: '主治医师',
  R06: '住院医师',
  R07: '会诊医师',
  R08: '护士',
  R09: '药师',
  R10: '医技人员',
  R11: '患者',
  R12: '访客',
};

export type { SkillRole };
