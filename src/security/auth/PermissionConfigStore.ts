/**
 * 健澜科技数智医院智能体（jlmedaios） - 权限配置运行时覆盖层
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * 本模块在静态 PERMISSION_MATRIX 之上提供"可编辑覆盖层（overlay）"：
 *  - 启动时以静态矩阵为基线（baseline），不修改任何静态导出；
 *  - 管理员可在运行时（不重启、不改代码）覆盖某 (module, action) 条目的
 *    allowedRoles / defaultScope / requireMfa / riskLevel，并可按角色定制数据范围
 *    （科室/病区维度，复用既有 DataScope）；
 *  - 每次变更带版本号递增与完整审计（谁、何时、改了什么）；
 *  - 当覆盖层为空时，查询结果与静态矩阵逐字段一致（零回归红线）。
 *
 * 并发模型：Node/Bun 为单线程事件循环，本类所有公共读写方法均为同步执行，
 * 方法内部不包含 await 让出点，因此一次调用内的"读-改-写"对事件循环而言是
 * 原子完成的，无需显式锁；对外部则采用"不可变快照 + 整体替换"语义，
 * 读侧始终拿到一致的快照，不会读到半更新状态。
 *
 * @module security/auth/PermissionConfigStore
 */

import { DataScope, PermissionAction, PermissionModule, RoleCode } from '../types';
import {
  PERMISSION_MATRIX,
  type PermissionMatrixEntry,
} from './PermissionMatrix';

/** 风险等级取值（与静态矩阵 riskLevel 字段一致） */
export type RiskLevelValue = 'low' | 'medium' | 'high' | 'critical';

/**
 * 某 (module, action) 条目的运行时覆盖。
 * 所有字段均为可选：未提供的字段沿用静态基线。
 */
export interface EntryOverride {
  /** 完整替换允许角色列表 */
  allowedRoles?: RoleCode[];
  /** 覆盖默认数据范围 */
  defaultScope?: DataScope;
  /** 覆盖是否强制 MFA */
  requireMfa?: boolean;
  /** 覆盖风险等级 */
  riskLevel?: RiskLevelValue;
  /**
   * 按角色定制的数据范围（科室/病区维度）。
   * 命中角色时优先于 defaultScope 生效，用于把某角色在该模块操作上的
   * 数据范围收敛到科室（DEPARTMENT）、病区（以 department 维度表达）等。
   */
  roleScopes?: Partial<Record<RoleCode, DataScope>>;
}

/** 审计记录 */
export interface PermissionAuditRecord {
  /** 本次变更后的配置版本号 */
  version: number;
  /** 变更时间（ISO 8601） */
  timestamp: string;
  /** 操作人 ID */
  operatorId: string;
  /** 操作人姓名 */
  operatorName: string;
  /** 变更类型 */
  action: 'overlay' | 'grant' | 'revoke' | 'reset' | 'resetAll';
  /** 目标条目键（module:action）；resetAll 为 '*' */
  targetKey: string;
  /** 变更摘要 */
  summary: string;
  /** 变更前快照（条目级，resetAll 为整体） */
  before?: unknown;
  /** 变更后快照 */
  after?: unknown;
}

/** 操作人信息（用于审计与越权校验） */
export interface PermissionOperator {
  userId: string;
  userName: string;
  roles: RoleCode[];
}

/** 内部状态快照 */
interface StoreState {
  version: number;
  overlays: Map<string, EntryOverride>;
  audit: PermissionAuditRecord[];
}

/** 构造条目键 */
function keyOf(module: PermissionModule, action: PermissionAction): string {
  return `${module}:${action}`;
}

/** 角色列表去重并保持稳定顺序 */
function normalizeRoles(roles: RoleCode[]): RoleCode[] {
  return Array.from(new Set(roles));
}

/**
 * 权限配置运行时覆盖层存储。
 *
 * 基线来自静态 PERMISSION_MATRIX；覆盖层叠加在其上。
 * 默认导出单例 `permissionConfigStore` 供路由层直接使用；
 * 测试可自行 `new PermissionConfigStore()` 获得干净实例。
 */
export class PermissionConfigStore {
  /** 当前状态（引用整体替换，保证读侧原子可见） */
  private state: StoreState = {
    version: 0,
    overlays: new Map<string, EntryOverride>(),
    audit: [],
  };

  /**
   * 计算某 (module, action) 的"生效条目"（静态基线 ∪ 运行时覆盖）。
   * 覆盖层为空时，返回与静态矩阵逐字段一致的对象。
   */
  public getEffectiveEntry(
    module: PermissionModule,
    action: PermissionAction,
  ): PermissionMatrixEntry | undefined {
    const base = PERMISSION_MATRIX.find((e) => e.module === module && e.action === action);
    if (!base) return undefined;

    const overlay = this.state.overlays.get(keyOf(module, action));
    if (!overlay) {
      // 零回归：无覆盖时直接返回静态基线对象（同一引用）。
      return base;
    }

    return {
      module: base.module,
      action: base.action,
      allowedRoles: overlay.allowedRoles ?? base.allowedRoles,
      defaultScope: overlay.defaultScope ?? base.defaultScope,
      requireMfa: overlay.requireMfa ?? base.requireMfa,
      riskLevel: overlay.riskLevel ?? base.riskLevel,
    };
  }

  /** 列出全部生效条目（顺序与静态矩阵一致） */
  public listEffectiveMatrix(): PermissionMatrixEntry[] {
    return PERMISSION_MATRIX.map((base) => {
      const overlay = this.state.overlays.get(keyOf(base.module, base.action));
      if (!overlay) return base;
      return {
        module: base.module,
        action: base.action,
        allowedRoles: overlay.allowedRoles ?? base.allowedRoles,
        defaultScope: overlay.defaultScope ?? base.defaultScope,
        requireMfa: overlay.requireMfa ?? base.requireMfa,
        riskLevel: overlay.riskLevel ?? base.riskLevel,
      };
    });
  }

  /** 获取某条目的原始覆盖（无覆盖返回 undefined） */
  public getOverlay(module: PermissionModule, action: PermissionAction): EntryOverride | undefined {
    const o = this.state.overlays.get(keyOf(module, action));
    // 返回深拷贝，避免外部原地修改内部状态
    return o ? this.cloneOverlay(o) : undefined;
  }

  /** 是否存在运行时覆盖 */
  public hasOverlay(module: PermissionModule, action: PermissionAction): boolean {
    return this.state.overlays.has(keyOf(module, action));
  }

  /** 获取某角色在某条目上的定制数据范围（无则 undefined） */
  public getRoleScope(
    role: RoleCode,
    module: PermissionModule,
    action: PermissionAction,
  ): DataScope | undefined {
    return this.state.overlays.get(keyOf(module, action))?.roleScopes?.[role];
  }

  /** 列出某条目全部角色定制数据范围 */
  public listRoleScopes(
    module: PermissionModule,
    action: PermissionAction,
  ): Partial<Record<RoleCode, DataScope>> {
    return { ...(this.state.overlays.get(keyOf(module, action))?.roleScopes ?? {}) };
  }

  /**
   * 覆盖/更新某条目。diff 中出现的字段即生效；未出现的字段沿用基线。
   * @returns 更新后的生效条目
   */
  public updateEntry(
    module: PermissionModule,
    action: PermissionAction,
    diff: EntryOverride,
    operator: PermissionOperator,
  ): PermissionMatrixEntry {
    const k = keyOf(module, action);
    const before = this.getEffectiveEntry(module, action);
    const prevOverlay = this.state.overlays.get(k);

    const merged: EntryOverride = prevOverlay ? this.cloneOverlay(prevOverlay) : {};
    if (diff.allowedRoles !== undefined) {
      merged.allowedRoles = normalizeRoles(diff.allowedRoles);
    }
    if (diff.defaultScope !== undefined) merged.defaultScope = diff.defaultScope;
    if (diff.requireMfa !== undefined) merged.requireMfa = diff.requireMfa;
    if (diff.riskLevel !== undefined) merged.riskLevel = diff.riskLevel;
    if (diff.roleScopes !== undefined) {
      merged.roleScopes = { ...(merged.roleScopes ?? {}), ...diff.roleScopes };
    }

    this.state.overlays.set(k, merged);
    const after = this.getEffectiveEntry(module, action)!;
    this.commit(operator, 'overlay', k, `更新权限条目 ${k}`, before, after);
    return after;
  }

  /**
   * 授予某角色对某 (module, action) 的访问；可选同时定制其数据范围。
   * 已授予则幂等。
   */
  public grant(
    role: RoleCode,
    module: PermissionModule,
    action: PermissionAction,
    scope: DataScope | undefined,
    operator: PermissionOperator,
  ): PermissionMatrixEntry {
    const k = keyOf(module, action);
    const before = this.getEffectiveEntry(module, action);
    const prevOverlay = this.state.overlays.get(k);
    const merged: EntryOverride = prevOverlay ? this.cloneOverlay(prevOverlay) : {};

    const roles = new Set(merged.allowedRoles ?? before?.allowedRoles ?? []);
    roles.add(role);
    merged.allowedRoles = normalizeRoles([...roles]);

    if (scope !== undefined) {
      merged.roleScopes = { ...(merged.roleScopes ?? {}), [role]: scope };
    }

    this.state.overlays.set(k, merged);
    const after = this.getEffectiveEntry(module, action)!;
    this.commit(operator, 'grant', k, `授予角色 ${role} 访问 ${k}`, before, after);
    return after;
  }

  /**
   * 撤销某角色对某 (module, action) 的访问，并清除其定制数据范围。
   */
  public revoke(
    role: RoleCode,
    module: PermissionModule,
    action: PermissionAction,
    operator: PermissionOperator,
  ): PermissionMatrixEntry {
    const k = keyOf(module, action);
    const before = this.getEffectiveEntry(module, action);
    const prevOverlay = this.state.overlays.get(k);
    const merged: EntryOverride = prevOverlay ? this.cloneOverlay(prevOverlay) : {};

    const baseRoles = before?.allowedRoles ?? [];
    const currentRoles = merged.allowedRoles ?? baseRoles;
    // 撤销：以"生效列表"为准移除该角色
    merged.allowedRoles = normalizeRoles(currentRoles.filter((r) => r !== role));

    if (merged.roleScopes && merged.roleScopes[role] !== undefined) {
      const nextScopes = { ...merged.roleScopes };
      delete nextScopes[role];
      merged.roleScopes = nextScopes;
    }

    this.state.overlays.set(k, merged);
    const after = this.getEffectiveEntry(module, action)!;
    this.commit(operator, 'revoke', k, `撤销角色 ${role} 访问 ${k}`, before, after);
    return after;
  }

  /** 重置某条目为静态基线 */
  public reset(module: PermissionModule, action: PermissionAction, operator: PermissionOperator): void {
    const k = keyOf(module, action);
    const before = this.getEffectiveEntry(module, action);
    this.state.overlays.delete(k);
    const after = this.getEffectiveEntry(module, action);
    this.commit(operator, 'reset', k, `重置条目 ${k} 为基线`, before, after);
  }

  /** 清空全部覆盖，恢复为纯静态矩阵 */
  public resetAll(operator: PermissionOperator): void {
    const beforeVersion = this.state.version;
    this.state.overlays.clear();
    this.commit(
      operator,
      'resetAll',
      '*',
      `清空全部权限覆盖（此前版本 v${beforeVersion}）`,
      { overlays: this.state.overlays.size },
      { overlays: 0 },
    );
  }

  /** 当前配置版本号（每次变更 +1） */
  public getVersion(): number {
    return this.state.version;
  }

  /** 覆盖条目数量 */
  public getOverlayCount(): number {
    return this.state.overlays.size;
  }

  /** 审计记录（返回拷贝，不暴露内部引用） */
  public getAuditLog(): PermissionAuditRecord[] {
    return [...this.state.audit];
  }

  /** 生成当前状态的可序列化快照（用于导出/持久化） */
  public exportState(): {
    version: number;
    overlays: Record<string, EntryOverride>;
  } {
    const overlays: Record<string, EntryOverride> = {};
    for (const [k, v] of this.state.overlays) {
      overlays[k] = this.cloneOverlay(v);
    }
    return { version: this.state.version, overlays };
  }

  /** 深拷贝覆盖对象 */
  private cloneOverlay(o: EntryOverride): EntryOverride {
    const clone: EntryOverride = {};
    if (o.allowedRoles) clone.allowedRoles = [...o.allowedRoles];
    if (o.defaultScope) clone.defaultScope = o.defaultScope;
    if (o.requireMfa !== undefined) clone.requireMfa = o.requireMfa;
    if (o.riskLevel) clone.riskLevel = o.riskLevel;
    if (o.roleScopes) clone.roleScopes = { ...o.roleScopes };
    return clone;
  }

  /** 提交一次变更：版本 +1 并落审计 */
  private commit(
    operator: PermissionOperator,
    action: PermissionAuditRecord['action'],
    targetKey: string,
    summary: string,
    before: unknown,
    after: unknown,
  ): void {
    this.state.version += 1;
    this.state.audit.push({
      version: this.state.version,
      timestamp: new Date().toISOString(),
      operatorId: operator.userId,
      operatorName: operator.userName,
      action,
      targetKey,
      summary,
      before,
      after,
    });
    // 限制审计长度，防止长期运行内存膨胀（保留最近 10000 条）
    if (this.state.audit.length > 10000) {
      this.state.audit = this.state.audit.slice(-5000);
    }
  }
}

/** 进程级单例，供 BFF 路由直接注入使用 */
export const permissionConfigStore = new PermissionConfigStore();
