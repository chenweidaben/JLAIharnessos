/**
 * 健澜科技数智医院智能体 - DB Repository 共享辅助
 *
 * 提供动态 WHERE 构建、JSON 序列化等通用工具。
 * 由于 postgres.js 类型严格，边界使用宽松类型，由 Repository 层保证类型安全。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { DbExecutor } from '../pool.js';

/** 动态查询构建器：累积 WHERE 条件与参数 */
export class QueryBuilder {
  private conditions: string[] = [];
  private params: unknown[] = [];

  /** 添加条件（? 自动编号为 $1, $2...） */
  where(condition: string, ...values: unknown[]): this {
    const numbered = condition.replace(/\?/g, () => {
      this.params.push(values.shift() ?? null);
      return `$${this.params.length}`;
    });
    this.conditions.push(numbered);
    return this;
  }

  /** 添加原始条件（不带参数） */
  whereRaw(condition: string): this {
    this.conditions.push(condition);
    return this;
  }

  toWhere(): string {
    return this.conditions.join(' AND ');
  }

  toClause(): string {
    return this.conditions.length > 0 ? `WHERE ${this.toWhere()}` : '';
  }

  getParams(extra: unknown[] = []): unknown[] {
    return [...this.params, ...extra];
  }
}

/** 将任意对象安全序列化为 postgres.json 可接受的类型 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toJson<T>(obj: T): any {
  return JSON.parse(JSON.stringify(obj));
}

/** 执行动态 SELECT 查询 */
export async function dynamicSelect<T>(
  sql: DbExecutor,
  columns: string,
  table: string,
  qb: QueryBuilder,
  orderBy: string,
  limit?: number,
  offset?: number,
): Promise<T[]> {
  const extra: unknown[] = [];
  let suffix = '';
  if (limit !== undefined) {
    extra.push(limit);
    suffix += ` LIMIT $${qb.getParams(extra).length}`;
  }
  if (offset !== undefined) {
    extra.push(offset);
    suffix += ` OFFSET $${qb.getParams(extra).length}`;
  }
  const query = `SELECT ${columns} FROM ${table} ${qb.toClause()} ORDER BY ${orderBy}${suffix}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await sql.unsafe(query, qb.getParams(extra) as any[]);
  return rows as unknown as T[];
}
