/**
 * 健澜科技数智医院智能体 - security/auth/PermissionChecker.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 权限检查器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件实现权限检查器，支持RBAC角色权限检查、ABAC属性检查、
 * 数据范围控制、权限缓存和权限拒绝审计。
 * 采用RBAC为主体、ABAC为补充的混合授权模型。
 *
 * @module security/auth/PermissionChecker
 */

import {
  type AbacPolicyRule,
  ConfirmationType,
  DataScope,
  type EnvironmentContext,
  type PermissionAction,
  type PermissionCheckResult,
  PermissionDecision,
  type PermissionKey,
  type PermissionModule,
  type ResourceContext,
  type UserContext,
} from '../types';
import { DATA_SCOPE_LEVEL, getMatrixEntry } from './PermissionMatrix';
import { getUserPermissions } from './RoleDefinitions';

/**
 * 权限检查器配置
 */
export interface PermissionCheckerConfig {
  /** 是否启用权限缓存 */
  enableCache?: boolean;
  /** 缓存过期时间（毫秒） */
  cacheTtl?: number;
  /** ABAC策略规则 */
  abacPolicies?: AbacPolicyRule[];
  /** 是否启用权限拒绝审计 */
  enableDenyAudit?: boolean;
}

/**
 * 缓存条目
 */
interface CacheEntry {
  permissions: Set<PermissionKey>;
  timestamp: number;
}

/**
 * 权限检查器
 *
 * 负责RBAC+ABAC混合授权决策，支持数据范围控制和权限缓存。
 *
 * @example
 * const checker = new PermissionChecker();
 * const result = checker.check(userCtx, resourceCtx, envCtx);
 * if (result.decision === PermissionDecision.ALLOW) { ... }
 */
export class PermissionChecker {
  private readonly enableCache: boolean;
  private readonly cacheTtl: number;
  private readonly abacPolicies: AbacPolicyRule[];
  private readonly enableDenyAudit: boolean;
  private permissionCache = new Map<string, CacheEntry>();
  /** 权限拒绝记录（用于审计） */
  private denyRecords: {
    timestamp: string;
    userId: string;
    module: PermissionModule;
    action: PermissionAction;
    reason: string;
  }[] = [];

  /**
   * 构造权限检查器
   *
   * @param config - 配置
   */
  constructor(config?: PermissionCheckerConfig) {
    this.enableCache = config?.enableCache ?? true;
    this.cacheTtl = config?.cacheTtl ?? 5 * 60 * 1000; // 默认5分钟
    this.abacPolicies = config?.abacPolicies ?? [];
    this.enableDenyAudit = config?.enableDenyAudit ?? true;
  }

  /**
   * 检查用户是否有权限执行操作
   *
   * @param user - 用户上下文
   * @param resource - 资源上下文
   * @param environment - 环境上下文（可选）
   * @returns 权限检查结果
   */
  public check(
    user: UserContext,
    resource: ResourceContext,
    environment?: EnvironmentContext,
  ): PermissionCheckResult {
    // 1. RBAC检查
    const rbacResult = this.checkRbac(user, resource);
    if (rbacResult.decision === PermissionDecision.DENY) {
      this.recordDeny(user, resource, rbacResult.denyReason ?? 'RBAC权限不足');
      return rbacResult;
    }

    // 2. 数据范围检查
    const scopeResult = this.checkDataScope(user, resource);
    if (scopeResult.decision === PermissionDecision.DENY) {
      this.recordDeny(user, resource, scopeResult.denyReason ?? '数据范围不足');
      return scopeResult;
    }

    // 3. ABAC检查
    if (this.abacPolicies.length > 0 && environment) {
      const abacResult = this.checkAbac(user, resource, environment);
      if (abacResult.decision === PermissionDecision.DENY) {
        this.recordDeny(user, resource, abacResult.denyReason ?? 'ABAC策略拒绝');
        return abacResult;
      }
      if (abacResult.decision === PermissionDecision.ASK) {
        return abacResult;
      }
    }

    // 4. 检查是否需要二次确认
    const matrixEntry = getMatrixEntry(resource.module, resource.action);
    if (matrixEntry?.requireMfa) {
      return {
        decision: PermissionDecision.ALLOW,
        matchedRule: 'RBAC+MFA',
        requireConfirmation: true,
        confirmationType: ConfirmationType.CA_SIGNATURE,
      };
    }

    return {
      decision: PermissionDecision.ALLOW,
      matchedRule: 'RBAC',
    };
  }

  /**
   * 简化的权限检查：检查用户是否有指定权限键
   *
   * @param user - 用户上下文
   * @param permissionKey - 权限键（模块:操作:数据范围）
   * @returns 是否有权限
   */
  public hasPermission(user: UserContext, permissionKey: PermissionKey): boolean {
    const permissions = this.getUserPermissions(user);
    return permissions.has(permissionKey);
  }

  /**
   * 检查用户是否有模块操作权限（不考虑数据范围）
   *
   * @param user - 用户上下文
   * @param module - 模块
   * @param action - 操作
   * @returns 是否有权限
   */
  public hasModuleAction(
    user: UserContext,
    module: PermissionModule,
    action: PermissionAction,
  ): boolean {
    const permissions = this.getUserPermissions(user);
    for (const scope of Object.values(DataScope)) {
      const key = `${module}:${action}:${scope}`;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Object.values 迭代宽化为 string，需收敛到 PermissionKey 字面量联合
      if (permissions.has(key as PermissionKey)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 获取用户的所有权限（含缓存）
   *
   * @param user - 用户上下文
   * @returns 权限集合
   */
  public getUserPermissions(user: UserContext): Set<PermissionKey> {
    const cacheKey = user.roles.join(',');

    if (this.enableCache) {
      const cached = this.permissionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
        return cached.permissions;
      }
    }

    const permissions = getUserPermissions(user.roles);

    if (this.enableCache) {
      this.permissionCache.set(cacheKey, {
        permissions,
        timestamp: Date.now(),
      });
    }

    return permissions;
  }

  /**
   * 清除权限缓存
   */
  public clearCache(): void {
    this.permissionCache.clear();
  }

  /**
   * 清除指定用户的权限缓存
   *
   * @param user - 用户上下文
   */
  public invalidateUserCache(user: UserContext): void {
    const cacheKey = user.roles.join(',');
    this.permissionCache.delete(cacheKey);
  }

  /**
   * 添加ABAC策略规则
   *
   * @param rule - 策略规则
   */
  public addAbacPolicy(rule: AbacPolicyRule): void {
    this.abacPolicies.push(rule);
    // 按优先级排序
    this.abacPolicies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 获取权限拒绝记录（用于审计）
   *
   * @param userId - 用户ID（可选，不传则返回所有）
   * @returns 拒绝记录列表
   */
  public getDenyRecords(userId?: string) {
    if (userId) {
      return this.denyRecords.filter((r) => r.userId === userId);
    }
    return [...this.denyRecords];
  }

  /**
   * RBAC权限检查
   */
  private checkRbac(user: UserContext, resource: ResourceContext): PermissionCheckResult {
    const permissions = this.getUserPermissions(user);

    // 检查是否有任何数据范围的该模块操作权限
    let hasAnyScope = false;
    let bestScope: DataScope | null = null;

    for (const scope of Object.values(DataScope)) {
      const key = `${resource.module}:${resource.action}:${scope}`;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      if (permissions.has(key as PermissionKey)) {
        hasAnyScope = true;
        if (!bestScope || DATA_SCOPE_LEVEL[scope] > DATA_SCOPE_LEVEL[bestScope]) {
          bestScope = scope;
        }
      }
    }

    if (!hasAnyScope) {
      return {
        decision: PermissionDecision.DENY,
        denyReason: `用户角色 [${user.roles.join(',')}] 无 ${resource.module}:${resource.action} 操作权限`,
      };
    }

    return {
      decision: PermissionDecision.ALLOW,
      matchedRule: `RBAC:${bestScope}`,
    };
  }

  /**
   * 数据范围检查
   */
  private checkDataScope(user: UserContext, resource: ResourceContext): PermissionCheckResult {
    const permissions = this.getUserPermissions(user);

    // 获取用户拥有的最大数据范围
    let maxScopeLevel = -1;
    let maxScope: DataScope | null = null;
    for (const scope of Object.values(DataScope)) {
      const key = `${resource.module}:${resource.action}:${scope}`;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      if (permissions.has(key as PermissionKey) && DATA_SCOPE_LEVEL[scope] > maxScopeLevel) {
        maxScopeLevel = DATA_SCOPE_LEVEL[scope];
        maxScope = scope;
      }
    }

    if (!maxScope) {
      return {
        decision: PermissionDecision.DENY,
        denyReason: '无数据范围权限',
      };
    }

    // 全院范围直接通过
    if (maxScope === DataScope.HOSPITAL) {
      return { decision: PermissionDecision.ALLOW, matchedRule: `Scope:${maxScope}` };
    }

    // 本人范围：检查资源所有者
    if (maxScope === DataScope.SELF) {
      if (resource.ownerId && resource.ownerId === user.userId) {
        return { decision: PermissionDecision.ALLOW, matchedRule: `Scope:${maxScope}` };
      }
      return {
        decision: PermissionDecision.DENY,
        denyReason: '数据范围限制：仅可访问本人数据',
      };
    }

    // 科室范围：检查资源科室
    if (maxScope === DataScope.DEPARTMENT) {
      if (resource.department && resource.department === user.department) {
        return { decision: PermissionDecision.ALLOW, matchedRule: `Scope:${maxScope}` };
      }
      // 跨科室访问需要确认
      return {
        decision: PermissionDecision.ASK,
        matchedRule: `Scope:${maxScope}+cross_dept`,
        requireConfirmation: true,
        confirmationType: ConfirmationType.USER_CONFIRM,
        denyReason: '跨科室访问需确认',
      };
    }

    // 组范围：检查资源组
    if (maxScope === DataScope.GROUP) {
      if (resource.groupId && user.groupId && resource.groupId === user.groupId) {
        return { decision: PermissionDecision.ALLOW, matchedRule: `Scope:${maxScope}` };
      }
      if (resource.department && resource.department === user.department) {
        return {
          decision: PermissionDecision.ASK,
          matchedRule: `Scope:${maxScope}+dept`,
          requireConfirmation: true,
          confirmationType: ConfirmationType.USER_CONFIRM,
        };
      }
      return {
        decision: PermissionDecision.DENY,
        denyReason: '数据范围限制：仅可访问本组数据',
      };
    }

    // 已分配/授权范围：简化处理，允许访问
    return { decision: PermissionDecision.ALLOW, matchedRule: `Scope:${maxScope}` };
  }

  /**
   * ABAC属性检查
   */
  private checkAbac(
    user: UserContext,
    resource: ResourceContext,
    environment: EnvironmentContext,
  ): PermissionCheckResult {
    for (const policy of this.abacPolicies) {
      if (!policy.enabled) continue;

      // 检查用户属性条件
      if (policy.userAttributes) {
        for (const [key, value] of Object.entries(policy.userAttributes)) {
          const userValue =
            user.attributes?.[key] ?? (user as unknown as Record<string, unknown>)[key];
          if (userValue !== value) {
            // 不匹配，跳过此策略
            return { decision: PermissionDecision.ALLOW, matchedRule: 'ABAC:skip' };
          }
        }
      }

      // 检查资源属性条件
      if (policy.resourceAttributes) {
        for (const [key, value] of Object.entries(policy.resourceAttributes)) {
          const resourceValue =
            resource.attributes?.[key] ?? (resource as unknown as Record<string, unknown>)[key];
          if (resourceValue !== value) {
            return { decision: PermissionDecision.ALLOW, matchedRule: 'ABAC:skip' };
          }
        }
      }

      // 检查环境属性条件
      if (policy.environmentAttributes) {
        for (const [key, value] of Object.entries(policy.environmentAttributes)) {
          const envValue = (environment as Record<string, unknown>)[key];
          if (envValue !== value) {
            return { decision: PermissionDecision.ALLOW, matchedRule: 'ABAC:skip' };
          }
        }
      }

      // 所有条件匹配，应用策略效果
      if (policy.effect === 'deny') {
        return {
          decision: PermissionDecision.DENY,
          matchedRule: `ABAC:${policy.id}`,
          denyReason: `ABAC策略拒绝: ${policy.name}`,
        };
      }
    }

    return { decision: PermissionDecision.ALLOW, matchedRule: 'ABAC:pass' };
  }

  /**
   * 记录权限拒绝
   */
  private recordDeny(user: UserContext, resource: ResourceContext, reason: string): void {
    if (!this.enableDenyAudit) return;
    this.denyRecords.push({
      timestamp: new Date().toISOString(),
      userId: user.userId,
      module: resource.module,
      action: resource.action,
      reason,
    });
    // 限制记录数量
    if (this.denyRecords.length > 10000) {
      this.denyRecords = this.denyRecords.slice(-5000);
    }
  }
}
