/* ============================================================================
 * 健澜科技杠OS - 数据质量检测引擎（M5-E）
 *
 * 对真实业务表执行结构化质量检测：
 *  - not_null              完整性：目标列非空；
 *  - unique                唯一性：目标列无重复；
 *  - valid_values          有效性：目标列取值在允许集合内；
 *  - valid_regex           有效性：目标列匹配正则；
 *  - fk_exists             一致性：目标列在引用表中存在；
 *  - conditional_not_null  及时性：满足前提时目标列非空。
 *
 * 安全：
 *  - schema/table/column 来自受信任的规则定义（种子），用 qi() 双引号转义；
 *  - 允许值集合、正则、引用表等通过参数绑定（$1）传入，不字符串拼接值；
 *  - condition 片段为规则内置固定文本（不含用户输入）。
 *
 * 本模块只做检测，不做 run 登记/权限/HTTP（由聚合器编排）。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { type DbExecutor } from '../db/pool.js';

export type QualityDimension =
  | 'completeness'
  | 'uniqueness'
  | 'validity'
  | 'consistency'
  | 'timeliness';

export type CheckType =
  | 'not_null'
  | 'unique'
  | 'valid_values'
  | 'valid_regex'
  | 'fk_exists'
  | 'conditional_not_null';

export interface DqRule {
  ruleCode: string;
  ruleName: string;
  dimension: QualityDimension;
  targetSchema: string;
  targetTable: string;
  targetColumn: string | null;
  checkType: CheckType;
  params: Record<string, unknown>;
  severity: 'critical' | 'major' | 'minor';
}

export interface CheckOutcome {
  totalRows: number;
  passedRows: number;
  failedRows: number;
  failedSample: unknown[];
}

/** 安全引用一个 SQL 标识符（双引号包裹，内部双引号翻倍）。 */
export function qi(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"';
}

/** 完整的限定表引用："schema"."table"。 */
function qualified(schema: string, table: string): string {
  return `${qi(schema)}.${qi(table)}`;
}

function toNumber(v: unknown): number {
  if (v == null) return 0;
  return Number(v) || 0;
}

/**
 * 对单条规则执行检测。
 *
 * @param sql  执行器（连接池或事务）
 * @param rule 规则定义
 */
export async function checkRule(
  sql: DbExecutor,
  rule: DqRule,
): Promise<CheckOutcome> {
  const table = qualified(rule.targetSchema, rule.targetTable);
  const col = rule.targetColumn ? qi(rule.targetColumn) : null;

  let statSql = '';
  let statParams: unknown[] = [];
  let sampleSql = '';
  let sampleParams: unknown[] = [];

  switch (rule.checkType) {
    case 'not_null': {
      statSql = `
        SELECT count(*) AS total,
               count(*) FILTER (WHERE ${col} IS NULL) AS failed
        FROM ${table}`;
      sampleSql = `
        SELECT ctid::text AS row_ref
        FROM ${table} WHERE ${col} IS NULL LIMIT 5`;
      break;
    }

    case 'unique': {
      statSql = `
        SELECT
          count(*) FILTER (WHERE ${col} IS NOT NULL) AS total,
          (SELECT coalesce(sum(c), 0) FROM (
             SELECT count(*) AS c FROM ${table} t2
             WHERE ${col} IN (
               SELECT ${col} FROM ${table}
                 WHERE ${col} IS NOT NULL
                 GROUP BY ${col} HAVING count(*) > 1)
             GROUP BY ${col}) dup) AS failed
        FROM ${table}`;
      sampleSql = `
        SELECT ${col} AS value, count(*) AS occurrences
        FROM ${table} WHERE ${col} IS NOT NULL
        GROUP BY ${col} HAVING count(*) > 1 LIMIT 5`;
      break;
    }

    case 'valid_values': {
      const allowed = rule.params.allowed_values;
      statParams = [allowed];
      sampleParams = [allowed];
      statSql = `
        SELECT count(*) AS total,
               count(*) FILTER (
                 WHERE ${col} IS NOT NULL AND NOT (${col} = ANY($1))) AS failed
        FROM ${table}`;
      sampleSql = `
        SELECT DISTINCT ${col} AS value
        FROM ${table}
        WHERE ${col} IS NOT NULL AND NOT (${col} = ANY($1))
        LIMIT 5`;
      break;
    }

    case 'valid_regex': {
      const pattern = String(rule.params.pattern ?? '');
      statParams = [pattern];
      sampleParams = [pattern];
      statSql = `
        SELECT count(*) FILTER (WHERE ${col} IS NOT NULL) AS total,
               count(*) FILTER (
                 WHERE ${col} IS NOT NULL AND ${col}::text !~ $1) AS failed
        FROM ${table}`;
      sampleSql = `
        SELECT DISTINCT ${col} AS value
        FROM ${table}
        WHERE ${col} IS NOT NULL AND ${col}::text !~ $1
        LIMIT 5`;
      break;
    }

    case 'fk_exists': {
      const refSchema = String(rule.params.ref_schema ?? '');
      const refTable = String(rule.params.ref_table ?? '');
      const refColumn = String(rule.params.ref_column ?? 'id');
      const ref = qualified(refSchema, refTable);
      const refCol = qi(refColumn);
      statSql = `
        SELECT count(*) FILTER (WHERE ${col} IS NOT NULL) AS total,
               count(*) FILTER (
                 WHERE ${col} IS NOT NULL AND NOT EXISTS (
                   SELECT 1 FROM ${ref} r WHERE r.${refCol} = t.${col})) AS failed
        FROM ${table} t`;
      sampleSql = `
        SELECT ${col} AS value
        FROM ${table} t
        WHERE ${col} IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM ${ref} r WHERE r.${refCol} = t.${col})
        LIMIT 5`;
      break;
    }

    case 'conditional_not_null': {
      const condition = String(rule.params.condition ?? 'true');
      statSql = `
        SELECT count(*) FILTER (WHERE ${condition}) AS total,
               count(*) FILTER (WHERE ${condition} AND ${col} IS NULL) AS failed
        FROM ${table}`;
      sampleSql = `
        SELECT ctid::text AS row_ref
        FROM ${table}
        WHERE ${condition} AND ${col} IS NULL LIMIT 5`;
      break;
    }

    default: {
      const exhaustive: never = rule.checkType;
      throw new Error(`不支持的检测类型: ${String(exhaustive)}`);
    }
  }

  const statRows = await sql.unsafe(statSql, statParams as never[]);
  const stat = (statRows as Record<string, unknown>[])[0] ?? {};
  const totalRows = toNumber(stat.total);
  const failedRows = toNumber(stat.failed);

  const sampleRows = await sql.unsafe(sampleSql, sampleParams as never[]);
  const failedSample = (sampleRows as Record<string, unknown>[]).map((r) => ({ ...r }));

  return {
    totalRows,
    failedRows,
    passedRows: Math.max(0, totalRows - failedRows),
    failedSample,
  };
}
