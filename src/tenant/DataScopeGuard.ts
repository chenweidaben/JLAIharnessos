/**
 * 健澜科技数智医院智能体（jlmedaios）— 数据行级隔离守卫
 *
 * 策略（医疗多租户数据隔离红线）：
 *  - 所有租户业务数据行必须携带 tenantId；查询/过滤时无条件叠加 tenantId 谓词；
 *  - 院区场景再叠加 campusId 谓词（仅当上下文指定了院区时）；
 *  - 跨租户数据一律不可见；未指定院区时，可见该院租户下全部院区数据
 *    （适用于院级管理员/集团视图）；指定院区后严格限定该院区。
 *
 * 用法（供后续业务表/仓储层复用）：
 *  ```ts
 *  const pred = dataScopeGuard.buildPredicate(ctx);   // → { tenantId, campusId? }
 *  const rows = dataScopeGuard.filterRows(allRows, ctx);
 *  ```
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TenantContext } from './types';

/** 任意租户数据行的最小结构（业务行只需带这两个字段即可被过滤） */
export interface TenantScopedRow {
  tenantId?: string;
  campusId?: string;
}

/** 生成的查询谓词（可直接拼到 SQL WHERE / 内存过滤 / ORM where 子句） */
export interface DataScopePredicate {
  tenantId: string;
  campusId?: string;
}

export class DataScopeGuard {
  /**
   * 生成数据隔离谓词。
   *  - 永远包含 tenantId；
   *  - 仅当上下文指定了 campusId 时才叠加 campusId（未指定=全院区可见）。
   */
  buildPredicate(ctx: TenantContext): DataScopePredicate {
    const pred: DataScopePredicate = { tenantId: ctx.tenantId };
    if (ctx.campusId) {
      pred.campusId = ctx.campusId;
    }
    return pred;
  }

  /**
   * 判断单行数据是否对当前上下文可见。
   *  - 行缺 tenantId 视为脏数据，拒绝可见（fail-closed）；
   *  - tenantId 不匹配直接拒绝；
   *  - 上下文指定院区而行无 campusId，或 campusId 不匹配，拒绝。
   */
  isRowVisible(row: TenantScopedRow, ctx: TenantContext): boolean {
    if (!row.tenantId) return false; // fail-closed：无租户标记的数据不可见
    if (row.tenantId !== ctx.tenantId) return false;
    if (ctx.campusId) {
      if (!row.campusId) return false; // 指定院区后，无院区标记的数据不泄露
      if (row.campusId !== ctx.campusId) return false;
    }
    return true;
  }

  /** 批量过滤：仅保留对当前上下文可见的行 */
  filterRows<T extends TenantScopedRow>(rows: readonly T[], ctx: TenantContext): T[] {
    return rows.filter((r) => this.isRowVisible(r, ctx));
  }

  /** 断言某行必须属于当前租户（写操作前的归属校验，越权即抛错） */
  assertRowInScope(row: TenantScopedRow, ctx: TenantContext): void {
    if (!this.isRowVisible(row, ctx)) {
      throw new Error(
        `数据越权：行 tenantId=${row.tenantId ?? '(空)'} campusId=${row.campusId ?? '(空)'} ` +
          `不属于当前上下文 tenantId=${ctx.tenantId} campusId=${ctx.campusId ?? '(全院区)'}`,
      );
    }
  }
}

/** 进程级单例 */
export const dataScopeGuard = new DataScopeGuard();
