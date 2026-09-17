/**
 * 健澜科技杠OS — 知识多租户管理
 *
 * 四级空间：public（公共/开源）→ hospital（医院私有）→ department（科室）→ personal（个人）。
 * 检索时按「当前租户 + 其祖先链 + public」可见；写入严格隔离到所属租户。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { type Tenant, type TenantScope } from '../types';
import { shortId } from '../util';

export class TenantManager {
  private tenants = new Map<string, Tenant>();

  constructor() {
    // 内置公共空间
    this.tenants.set('public', {
      id: 'public',
      scope: 'public',
      name: '公共知识空间（开源）',
      createdAt: new Date(0).toISOString(),
    });
  }

  create(name: string, scope: TenantScope, parentId?: string): Tenant {
    if (parentId && !this.tenants.has(parentId)) throw new Error(`上级租户不存在: ${parentId}`);
    const tenant: Tenant = { id: shortId('tenant'), name, scope, parentId, createdAt: new Date().toISOString() };
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  get(id: string): Tenant | undefined {
    return this.tenants.get(id);
  }

  /** 返回租户自身到根的祖先链（含自身） */
  ancestorChain(tenantId: string): string[] {
    const chain: string[] = [];
    let cur = this.tenants.get(tenantId);
    const guard = new Set<string>();
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id);
      chain.push(cur.id);
      cur = cur.parentId ? this.tenants.get(cur.parentId) : undefined;
    }
    return chain;
  }

  /** 可见租户集合：公共 + 祖先链（实际数据还需 isPublic 标记，KB 层处理） */
  visibleScopes(tenantId: string): string[] {
    const chain = this.ancestorChain(tenantId);
    return chain.includes('public') ? chain : ['public', ...chain];
  }

  list(): Tenant[] {
    return [...this.tenants.values()];
  }
}
