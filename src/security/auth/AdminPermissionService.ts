/**
 * 健澜科技数智医院智能体（jlmedaios） - 权限管理服务层
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * 面向 BFF 管理路由的服务封装：
 *  - 列出角色定义 / 生效权限矩阵 / 单条目详情；
 *  - 更新条目、授权（grant）、撤销（revoke）；
 *  - 复用 PermissionChecker 做运行时权限决策，并叠加运行时覆盖层。
 *
 * 医疗安全红线：
 *  - 所有写操作（update/grant/revoke/reset）要求操作人具备 SYSTEM_ADMIN 角色，
 *    否则抛出 PermissionDeniedError；
 *  - 不关闭 MFA 强制：覆盖层只能"开启"MFA，不允许把已强制 MFA 的高风险条目
 *    降级为不要求（见 assertMfaNotWeakened）；
 *  - 每次写操作经 PermissionConfigStore 落审计。
 *
 * @module security/auth/AdminPermissionService
 */

import {
  ConfirmationType,
  DataScope,
  PermissionAction,
  type PermissionCheckResult,
  PermissionDecision,
  PermissionDeniedError,
  PermissionModule,
  RoleCode,
  type RoleDefinition,
  type UserContext,
  type ResourceContext,
  SecurityError,
} from '../types';
import { MODULE_DEFINITIONS, ACTION_DEFINITIONS, type PermissionMatrixEntry } from './PermissionMatrix';
import { ROLE_DEFINITIONS } from './RoleDefinitions';
import { PermissionChecker } from './PermissionChecker';
import {
  PermissionConfigStore,
  type EntryOverride,
  type PermissionAuditRecord,
  type PermissionOperator,
  type RiskLevelValue,
} from './PermissionConfigStore';

export type { PermissionOperator } from './PermissionConfigStore';

/** 条目详情（含覆盖与角色定制范围） */
export interface PermissionEntryDetail extends PermissionMatrixEntry {
  /** 是否存在运行时覆盖 */
  overlayActive: boolean;
  /** 运行时覆盖原始内容（无覆盖为 null） */
  overlay: EntryOverride | null;
  /** 按角色定制的数据范围 */
  roleScopes: Partial<Record<RoleCode, DataScope>>;
}

/** 生效矩阵视图 */
export interface PermissionMatrixView {
  version: number;
  overlayCount: number;
  modules: typeof MODULE_DEFINITIONS;
  actions: typeof ACTION_DEFINITIONS;
  entries: PermissionMatrixEntry[];
}

/** 更新条目的入参 diff */
export interface UpdateEntryDiff {
  module: PermissionModule;
  action: PermissionAction;
  allowedRoles?: RoleCode[];
  defaultScope?: DataScope;
  requireMfa?: boolean;
  riskLevel?: RiskLevelValue;
  roleScopes?: Partial<Record<RoleCode, DataScope>>;
}

/** 授权入参 */
export interface GrantParams {
  role: RoleCode;
  module: PermissionModule;
  action: PermissionAction;
  scope?: DataScope;
}

/** 评估入参（用户上下文来源） */
export interface EvaluateParams {
  user: {
    userId: string;
    userName: string;
    roles: RoleCode[];
    department: string;
    groupId?: string;
  };
  module: PermissionModule;
  action: PermissionAction;
  /** 资源所属科室（用于数据范围判定，可选） */
  resourceDepartment?: string;
  /** 资源负责人（SELF 范围判定，可选） */
  resourceOwnerId?: string;
  /** 资源所属组（GROUP 范围判定，可选） */
  resourceGroupId?: string;
}

/** 评估结果（在标准决策上叠加生效条目信息） */
export interface EvaluateResult extends PermissionCheckResult {
  effectiveEntry: PermissionMatrixEntry | undefined;
  overlayActive: boolean;
}

/** 合法的风险等级集合 */
const RISK_LEVELS: readonly RiskLevelValue[] = ['low', 'medium', 'high', 'critical'];

/** 合法的数据范围集合 */
const DATA_SCOPES: readonly DataScope[] = [
  DataScope.SELF,
  DataScope.ASSIGNED,
  DataScope.GROUP,
  DataScope.DEPARTMENT,
  DataScope.HOSPITAL,
  DataScope.AUTHORIZED,
];

/**
 * 权限管理服务。
 */
export class AdminPermissionService {
  private readonly store: PermissionConfigStore;
  /** 复用 PermissionChecker 做 RBAC+数据范围决策（关闭缓存以保证读到最新覆盖） */
  private readonly checker: PermissionChecker;

  constructor(store?: PermissionConfigStore) {
    this.store = store ?? new PermissionConfigStore();
    this.checker = new PermissionChecker({ enableCache: false, enableDenyAudit: true });
  }

  /** 列出全部角色定义（按 RoleCode 字典序稳定排序） */
  public listRoles(): RoleDefinition[] {
    return [...ROLE_DEFINITIONS.values()].sort((a, b) => a.code.localeCompare(b.code));
  }

  /** 列出生效权限矩阵视图 */
  public listMatrix(): PermissionMatrixView {
    return {
      version: this.store.getVersion(),
      overlayCount: this.store.getOverlayCount(),
      modules: MODULE_DEFINITIONS,
      actions: ACTION_DEFINITIONS,
      entries: this.store.listEffectiveMatrix(),
    };
  }

  /** 获取单条目详情 */
  public getEntry(module: PermissionModule, action: PermissionAction): PermissionEntryDetail {
    const entry = this.store.getEffectiveEntry(module, action);
    if (!entry) {
      throw new SecurityError('PERMISSION_ENTRY_NOT_FOUND', `未找到权限条目 ${module}:${action}`);
    }
    const overlay = this.store.getOverlay(module, action) ?? null;
    return {
      ...entry,
      overlayActive: overlay !== null,
      overlay,
      roleScopes: this.store.listRoleScopes(module, action),
    };
  }

  /** 更新条目（需 SYSTEM_ADMIN） */
  public updateEntry(diff: UpdateEntryDiff, operator: PermissionOperator): PermissionEntryDetail {
    this.assertAdmin(operator);
    this.assertEntryExists(diff.module, diff.action);
    if (diff.riskLevel !== undefined && !RISK_LEVELS.includes(diff.riskLevel)) {
      throw new SecurityError('INVALID_RISK_LEVEL', `非法风险等级: ${diff.riskLevel}`);
    }
    if (diff.defaultScope !== undefined && !DATA_SCOPES.includes(diff.defaultScope)) {
      throw new SecurityError('INVALID_DATA_SCOPE', `非法数据范围: ${diff.defaultScope}`);
    }
    // 医疗安全：禁止把已强制 MFA 的高风险条目降级为不要求 MFA
    this.assertMfaNotWeakened(diff);

    this.store.updateEntry(
      diff.module,
      diff.action,
      {
        allowedRoles: diff.allowedRoles,
        defaultScope: diff.defaultScope,
        requireMfa: diff.requireMfa,
        riskLevel: diff.riskLevel,
        roleScopes: diff.roleScopes,
      },
      operator,
    );
    return this.getEntry(diff.module, diff.action);
  }

  /** 授权（需 SYSTEM_ADMIN） */
  public grant(params: GrantParams, operator: PermissionOperator): PermissionEntryDetail {
    this.assertAdmin(operator);
    this.assertEntryExists(params.module, params.action);
    if (params.scope !== undefined && !DATA_SCOPES.includes(params.scope)) {
      throw new SecurityError('INVALID_DATA_SCOPE', `非法数据范围: ${params.scope}`);
    }
    this.store.grant(params.role, params.module, params.action, params.scope, operator);
    return this.getEntry(params.module, params.action);
  }

  /** 撤销（需 SYSTEM_ADMIN） */
  public revoke(
    role: RoleCode,
    module: PermissionModule,
    action: PermissionAction,
    operator: PermissionOperator,
  ): PermissionEntryDetail {
    this.assertAdmin(operator);
    this.assertEntryExists(module, action);
    this.store.revoke(role, module, action, operator);
    return this.getEntry(module, action);
  }

  /** 重置单条目（需 SYSTEM_ADMIN） */
  public resetEntry(
    module: PermissionModule,
    action: PermissionAction,
    operator: PermissionOperator,
  ): PermissionEntryDetail {
    this.assertAdmin(operator);
    this.assertEntryExists(module, action);
    this.store.reset(module, action, operator);
    return this.getEntry(module, action);
  }

  /** 读取审计日志 */
  public getAuditLog(): PermissionAuditRecord[] {
    return this.store.getAuditLog();
  }

  /**
   * 运行时权限决策：复用 PermissionChecker 的 RBAC + 数据范围 + ABAC 能力，
   * 并叠加运行时覆盖层的权威授权。
   *
   * 决策顺序：
   *  1. 无覆盖时，完全委托 PermissionChecker（与静态矩阵行为一致，零回归）；
   *  2. 有覆盖时，覆盖层为权威授权：
   *     - 用户任一角色不在生效 allowedRoles → DENY（运行时撤销生效）；
   *     - 覆盖层显式授予而静态矩阵未授予时，提升为 ALLOW（运行时授权生效）；
   *     - 其余沿用 PermissionChecker 的数据范围/MFA 结论，requireMfa 以覆盖层为准。
   */
  public evaluate(params: EvaluateParams): EvaluateResult {
    const { user, module, action } = params;
    const effectiveEntry = this.store.getEffectiveEntry(module, action);
    const overlayActive = this.store.hasOverlay(module, action);

    const userCtx: UserContext = {
      userId: user.userId,
      userName: user.userName,
      roles: user.roles,
      department: user.department,
      groupId: user.groupId,
    };
    const resourceCtx: ResourceContext = {
      module,
      action,
      department: params.resourceDepartment,
      groupId: params.resourceGroupId,
      ownerId: params.resourceOwnerId,
    };

    const base = this.checker.check(userCtx, resourceCtx);

    if (!overlayActive) {
      return { ...base, effectiveEntry, overlayActive: false };
    }

    // 覆盖层为权威授权
    const effectiveRoles = effectiveEntry?.allowedRoles ?? [];
    const overlayAllows = user.roles.some((r) => effectiveRoles.includes(r));

    if (!overlayAllows) {
      return {
        decision: PermissionDecision.DENY,
        matchedRule: 'overlay:revoke',
        denyReason: '运行时授权：当前角色未被授权访问该模块操作',
        effectiveEntry,
        overlayActive: true,
      };
    }

    // 覆盖层允许：静态 RBAC 拒绝时提升为 ALLOW（运行时授权生效）
    if (base.decision === PermissionDecision.DENY) {
      return {
        decision: PermissionDecision.ALLOW,
        matchedRule: 'overlay:grant',
        requireConfirmation: !!effectiveEntry?.requireMfa,
        confirmationType: effectiveEntry?.requireMfa
          ? ConfirmationType.CA_SIGNATURE
          : undefined,
        effectiveEntry,
        overlayActive: true,
      };
    }

    // 覆盖层与静态一致：沿用数据范围结论，requireMfa 以生效条目为准
    return {
      ...base,
      requireConfirmation: effectiveEntry?.requireMfa ?? base.requireConfirmation,
      confirmationType: effectiveEntry?.requireMfa
        ? ConfirmationType.CA_SIGNATURE
        : base.confirmationType,
      effectiveEntry,
      overlayActive: true,
    };
  }

  /** 校验操作人具备 SYSTEM_ADMIN，否则拒绝（未登录或非管理员 403） */
  private assertAdmin(operator: PermissionOperator): void {
    if (!operator.roles.includes(RoleCode.SYSTEM_ADMIN)) {
      throw new PermissionDeniedError('权限不足：仅系统管理员可配置权限', {
        operatorId: operator.userId,
        operatorRoles: operator.roles,
      });
    }
  }

  /** 校验条目存在 */
  private assertEntryExists(module: PermissionModule, action: PermissionAction): void {
    if (!this.store.getEffectiveEntry(module, action)) {
      throw new SecurityError('PERMISSION_ENTRY_NOT_FOUND', `未找到权限条目 ${module}:${action}`);
    }
  }

  /**
   * 医疗安全：禁止通过覆盖把原本强制 MFA 的高风险条目降级为不要求 MFA。
   * （只允许 requireMfa: true，或不传；显式 false 且基线为 true 时拒绝。）
   */
  private assertMfaNotWeakened(diff: UpdateEntryDiff): void {
    if (diff.requireMfa === false) {
      const current = this.store.getEffectiveEntry(diff.module, diff.action);
      if (current?.requireMfa) {
        throw new PermissionDeniedError(
          '医疗安全红线：禁止关闭已强制 MFA 的高风险操作（处方/医嘱/系统管理等）',
          { module: diff.module, action: diff.action },
        );
      }
    }
  }
}

/** 进程级默认单例 */
export const adminPermissionService = new AdminPermissionService();
