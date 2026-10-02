/**
 * 健澜科技数智医院智能体（jlmedaios）— 租户/院区注册表
 *
 * 维护 hospital → campus 的层级注册表；内置默认医院 + 默认院区
 * （对应 env: DEFAULT_TENANT_ID / DEFAULT_CAMPUS_ID）。
 *
 * 两种工作模式：
 *  - 纯内存（默认）：同步写方法，开箱即用，便于测试与无库演示；
 *  - 持久化（BFF 连库时）：启动调用 hydrate() 从 iam.tenants 加载，
 *    管理端写操作走 persistXxx() 异步方法，先落库再更新内存，保证重启不丢。
 *
 * 安全：
 *  - 停用/软删节点一律不可被「解析」到运行时上下文；
 *  - 删除为软删除（标记 deletedAt），保留审计痕迹；
 *  - 默认医院租户受保护，不可停用/删除；
 *  - 不存放任何密钥。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { MedicalAgentError } from '../core/errors';
import { withTx } from '../db/pool';
import { listAllTenants, upsertTenant } from '../db/repositories/tenantRepo';
import type { DbExecutor } from '../db/pool';
import {
  type Campus,
  type Tenant,
  type TenantId,
  type TenantTreeNode,
} from './types';

/** 构造选项（测试可注入，避免依赖 env） */
export interface TenantServiceOptions {
  /** 默认医院 id（env: DEFAULT_TENANT_ID） */
  defaultTenantId?: string;
  /** 默认院区 id（env: DEFAULT_CAMPUS_ID） */
  defaultCampusId?: string;
  /** 默认医院名 */
  defaultHospitalName?: string;
  /** 默认院区名 */
  defaultCampusName?: string;
}

/** 错误码（字面量，不改动 core/errors 的 ErrorCodes 常量，避免跨模块耦合） */
export const TenantErrorCodes = {
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_DISABLED: 'TENANT_DISABLED',
  TENANT_DELETED: 'TENANT_DELETED',
  PARENT_TENANT_INVALID: 'PARENT_TENANT_INVALID',
  CAMPUS_NOT_UNDER_HOSPITAL: 'CAMPUS_NOT_UNDER_HOSPITAL',
  DEFAULT_TENANT_PROTECTED: 'DEFAULT_TENANT_PROTECTED',
} as const;

function now(): string {
  return new Date().toISOString();
}

export class TenantService {
  private readonly nodes = new Map<TenantId, Tenant>();
  private readonly defaultTenantId: string;
  private readonly defaultCampusId: string;

  constructor(opts: TenantServiceOptions = {}) {
    this.defaultTenantId = opts.defaultTenantId ?? process.env.DEFAULT_TENANT_ID ?? 'demo-hospital';
    this.defaultCampusId = opts.defaultCampusId ?? process.env.DEFAULT_CAMPUS_ID ?? 'main-campus';

    // 内置默认医院 + 默认院区（保证任何部署开箱即有一个可用租户）
    this.commit({
      id: this.defaultTenantId,
      name: opts.defaultHospitalName ?? '健澜示范医院',
      level: 'hospital',
      enabled: true,
      config: {},
      createdAt: now(),
    });
    this.commit({
      id: this.defaultCampusId,
      name: opts.defaultCampusName ?? '主院区',
      level: 'campus',
      parentId: this.defaultTenantId,
      enabled: true,
      config: {},
      createdAt: now(),
    } satisfies Campus);
  }

  /** 默认医院 id（只读） */
  getDefaultTenantId(): string {
    return this.defaultTenantId;
  }

  /** 默认院区 id（只读） */
  getDefaultCampusId(): string {
    return this.defaultCampusId;
  }

  // ------------------------------------------------------------------
  // 查询
  // ------------------------------------------------------------------

  /** 取任意节点（含停用/软删），调用方自行判断状态 */
  get(id: TenantId): Tenant | undefined {
    return this.nodes.get(id);
  }

  /**
   * 解析一个「可用」节点：存在、未软删、已启用。
   * 不可用则抛 MedicalAgentError（区分不存在 / 已删除 / 已停用）。
   */
  resolveActive(id: TenantId): Tenant {
    const node = this.nodes.get(id);
    if (!node) {
      throw new MedicalAgentError(TenantErrorCodes.TENANT_NOT_FOUND, `租户不存在: ${id}`);
    }
    if (node.deletedAt) {
      throw new MedicalAgentError(TenantErrorCodes.TENANT_DELETED, `租户已删除: ${id}`);
    }
    if (!node.enabled) {
      throw new MedicalAgentError(TenantErrorCodes.TENANT_DISABLED, `租户已停用: ${id}`);
    }
    return node;
  }

  /** 列出全部节点（含停用/软删，管理后台用） */
  list(): Tenant[] {
    return [...this.nodes.values()];
  }

  /** 列出未删除的节点 */
  listNotDeleted(): Tenant[] {
    return this.list().filter((t) => !t.deletedAt);
  }

  /** 列出已启用且未删除的节点 */
  listActive(): Tenant[] {
    return this.listNotDeleted().filter((t) => t.enabled);
  }

  /** 列出所有医院（level=hospital，未删除） */
  listHospitals(): Tenant[] {
    return this.listNotDeleted().filter((t) => t.level === 'hospital');
  }

  /** 列出某医院下的全部院区（未删除） */
  listCampuses(hospitalId: TenantId): Tenant[] {
    return this.listNotDeleted().filter(
      (t) => t.level === 'campus' && t.parentId === hospitalId,
    );
  }

  /** 节点自身到根的祖先链（含自身），循环防护 */
  ancestorChain(id: TenantId): TenantId[] {
    const chain: TenantId[] = [];
    let cur = this.nodes.get(id);
    const guard = new Set<TenantId>();
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id);
      chain.push(cur.id);
      cur = cur.parentId ? this.nodes.get(cur.parentId) : undefined;
    }
    return chain;
  }

  /** 构造医院→院区树（仅未删除节点） */
  tree(): TenantTreeNode[] {
    const hospitals = this.listHospitals();
    return hospitals.map((h) => ({
      node: h,
      children: this.listCampuses(h.id).map((c) => ({ node: c, children: [] })),
    }));
  }

  // ------------------------------------------------------------------
  // 纯内存写方法（同步；测试与无库场景使用）
  // ------------------------------------------------------------------

  /** 创建医院（level=hospital） */
  createHospital(name: string, config: Record<string, unknown> = {}): Tenant {
    const node = this.buildHospital(name, config);
    this.commit(node);
    return node;
  }

  /** 创建院区（挂在某医院下） */
  createCampus(hospitalId: TenantId, name: string, config: Record<string, unknown> = {}): Tenant {
    const node = this.buildCampus(hospitalId, name, config);
    this.commit(node);
    return node;
  }

  /** 启停节点（默认医院不可停用，避免锁死系统） */
  setEnabled(id: TenantId, enabled: boolean): Tenant {
    const node = this.buildStatusChange(id, enabled);
    this.commit(node);
    return node;
  }

  /** 浅合并租户级配置（已存在的 key 覆盖，未提及的 key 保留） */
  mergeConfig(id: TenantId, patch: Record<string, unknown>): Tenant {
    const node = this.buildConfigMerge(id, patch);
    this.commit(node);
    return node;
  }

  /** 软删除（默认医院不可删除；级联软删其下院区） */
  softDelete(id: TenantId): Tenant {
    const nodes = this.buildSoftDelete(id);
    for (const n of nodes) this.commit(n);
    return nodes[0];
  }

  // ------------------------------------------------------------------
  // 持久化写方法（异步；先落库再更新内存，BFF 管理端使用）
  // ------------------------------------------------------------------

  /** 从 iam.tenants 加载全部节点到内存（BFF 启动时调用，需先完成迁移） */
  async hydrate(): Promise<number> {
    const all = await listAllTenants();
    this.nodes.clear();
    for (const n of all) this.commit(n);
    return all.length;
  }

  /** 持久化创建医院 */
  async persistCreateHospital(
    name: string,
    config: Record<string, unknown> = {},
    tx?: DbExecutor,
  ): Promise<Tenant> {
    const node = this.buildHospital(name, config);
    await upsertTenant(node, tx);
    this.commit(node);
    return node;
  }

  /** 持久化创建院区 */
  async persistCreateCampus(
    hospitalId: TenantId,
    name: string,
    config: Record<string, unknown> = {},
    tx?: DbExecutor,
  ): Promise<Tenant> {
    const node = this.buildCampus(hospitalId, name, config);
    await upsertTenant(node, tx);
    this.commit(node);
    return node;
  }

  /** 持久化启停 */
  async persistSetEnabled(id: TenantId, enabled: boolean, tx?: DbExecutor): Promise<Tenant> {
    const node = this.buildStatusChange(id, enabled);
    await upsertTenant(node, tx);
    this.commit(node);
    return node;
  }

  /** 持久化合并配置 */
  async persistMergeConfig(
    id: TenantId,
    patch: Record<string, unknown>,
    tx?: DbExecutor,
  ): Promise<Tenant> {
    const node = this.buildConfigMerge(id, patch);
    await upsertTenant(node, tx);
    this.commit(node);
    return node;
  }

  /** 持久化软删除（同事务级联院区） */
  async persistSoftDelete(id: TenantId): Promise<Tenant> {
    const nodes = this.buildSoftDelete(id);
    await withTx(async (tx) => {
      for (const n of nodes) await upsertTenant(n, tx);
    });
    for (const n of nodes) this.commit(n);
    return nodes[0];
  }

  // ------------------------------------------------------------------
  // 内部：构造（纯函数，不写内存）+ 提交
  // ------------------------------------------------------------------

  /** 写入/替换内存节点 */
  private commit(node: Tenant): void {
    this.nodes.set(node.id, node);
  }

  private buildHospital(name: string, config: Record<string, unknown>): Tenant {
    return {
      id: this.genId('hospital'),
      name,
      level: 'hospital',
      enabled: true,
      config,
      createdAt: now(),
    };
  }

  private buildCampus(
    hospitalId: TenantId,
    name: string,
    config: Record<string, unknown>,
  ): Campus {
    const parent = this.nodes.get(hospitalId);
    if (!parent || parent.deletedAt) {
      throw new MedicalAgentError(
        TenantErrorCodes.PARENT_TENANT_INVALID,
        `上级医院不存在或已删除: ${hospitalId}`,
      );
    }
    if (parent.level !== 'hospital') {
      throw new MedicalAgentError(
        TenantErrorCodes.PARENT_TENANT_INVALID,
        `上级必须为医院节点: ${hospitalId}`,
      );
    }
    return {
      id: this.genId('campus'),
      name,
      level: 'campus',
      parentId: hospitalId,
      enabled: true,
      config,
      createdAt: now(),
    };
  }

  private buildStatusChange(id: TenantId, enabled: boolean): Tenant {
    const node = this.requireNotDeleted(id);
    if (id === this.defaultTenantId && !enabled) {
      throw new MedicalAgentError(
        TenantErrorCodes.DEFAULT_TENANT_PROTECTED,
        '默认医院租户不可停用',
      );
    }
    return { ...node, enabled, updatedAt: now() };
  }

  private buildConfigMerge(id: TenantId, patch: Record<string, unknown>): Tenant {
    const node = this.requireNotDeleted(id);
    return { ...node, config: { ...node.config, ...patch }, updatedAt: now() };
  }

  private buildSoftDelete(id: TenantId): Tenant[] {
    const node = this.requireNotDeleted(id);
    if (id === this.defaultTenantId) {
      throw new MedicalAgentError(
        TenantErrorCodes.DEFAULT_TENANT_PROTECTED,
        '默认医院租户不可删除',
      );
    }
    const ts = now();
    const result: Tenant[] = [{ ...node, deletedAt: ts, enabled: false, updatedAt: ts }];
    if (node.level === 'hospital') {
      for (const campus of this.listCampuses(id)) {
        result.push({ ...campus, deletedAt: ts, enabled: false, updatedAt: ts });
      }
    }
    return result;
  }

  private requireNotDeleted(id: TenantId): Tenant {
    const node = this.nodes.get(id);
    if (!node) {
      throw new MedicalAgentError(TenantErrorCodes.TENANT_NOT_FOUND, `租户不存在: ${id}`);
    }
    if (node.deletedAt) {
      throw new MedicalAgentError(TenantErrorCodes.TENANT_DELETED, `租户已删除: ${id}`);
    }
    return node;
  }

  private genId(prefix: 'hospital' | 'campus'): string {
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${t}${r}`;
  }
}

/** 进程级单例（BFF 路由与中间件共用；测试请自行 new TenantService()） */
export const tenantService = new TenantService();
