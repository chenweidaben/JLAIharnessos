/* ============================================================================
 * 健澜科技杠OS - 数据治理聚合器（M5-E）
 *
 * 编排数据质量检测与隐私分级治理：
 *  - 质量检测：加载启用规则 → 逐规则对真实表检测 → 登记结果 → 评分；
 *  - 查询：最新评分、检测结果、规则清单、评分趋势；
 *  - 隐私分级：自动扫描列（DataClassifier）→ 台账；人工修正分级（留痕）。
 *
 * 权限：检测/修正需 data_governance:admin，查询需 data_governance:read
 *（路由层校验）。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import type { AuthView } from '../view/userView.js';
import { getDb, withTx, type TransactionSql } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { DataClassifier } from '../../security/classification/DataClassifier.js';
import { DataLevel } from '../../security/types.js';
import {
  type CheckOutcome,
  type DqRule,
  checkRule,
} from '../../data-platform/dataQuality.js';

/* -------------------------------- 错误类型 ------------------------------- */

export class DataGovernanceError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DataGovernanceError';
  }
}
const badRequest = (m: string) => new DataGovernanceError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new DataGovernanceError(404, 'NOT_FOUND', m);

/* -------------------------------- 审计 -------------------------------- */

async function audit(
  tx: TransactionSql,
  auth: AuthView,
  action: string,
  resourceId: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  await recordChainAudit(
    {
      actorId: auth.id,
      actorName: auth.realName,
      actorRole: auth.rawRoles[0] ?? null,
      actorDept: auth.deptName,
      action,
      resourceType: 'data_governance',
      resourceId,
      result: 'success',
      detail,
    },
    tx,
  );
}

/* -------------------------------- 映射 -------------------------------- */

function mapRule(r: Record<string, unknown>): DqRule {
  return {
    ruleCode: String(r.rule_code),
    ruleName: String(r.rule_name),
    dimension: r.dimension as DqRule['dimension'],
    targetSchema: String(r.target_schema),
    targetTable: String(r.target_table),
    targetColumn: r.target_column ? String(r.target_column) : null,
    checkType: r.check_type as DqRule['checkType'],
    params: (r.params as Record<string, unknown>) ?? {},
    severity: r.severity as DqRule['severity'],
  };
}

function levelToNumber(level: DataLevel): number {
  switch (level) {
    case DataLevel.L1_PUBLIC:
      return 1;
    case DataLevel.L2_INTERNAL:
      return 2;
    case DataLevel.L3_SENSITIVE:
      return 3;
    case DataLevel.L4_CONFIDENTIAL:
      return 4;
  }
}

function num(v: unknown): number {
  return v == null ? 0 : Number(v) || 0;
}

/* ============================== 质量检测 ============================== */

export interface RuleResultView {
  ruleCode: string;
  ruleName: string;
  dimension: string;
  severity: string;
  target: string;
  totalRows: number;
  passedRows: number;
  failedRows: number;
  passRate: number;
  status: 'pass' | 'fail';
  failedSample: unknown[];
}

export interface QualityRunSummary {
  runId: string;
  status: 'success' | 'failed';
  totalRules: number;
  passedRules: number;
  failedRules: number;
  score: number;
  startedAt: string;
  finishedAt: string;
  results: RuleResultView[];
}

/** 触发一次全量质量检测（在单个事务内完成检测/登记/评分/审计）。 */
export async function runQualityCheck(auth: AuthView): Promise<QualityRunSummary> {
  return withTx(async (tx) => {
    const ruleRows = await tx`
      SELECT * FROM meta.dq_rules WHERE enabled ORDER BY rule_code
    `;
    const rules = (ruleRows as Record<string, unknown>[]).map(mapRule);
    if (rules.length === 0) throw badRequest('未配置启用的质量规则');

    const runRows = await tx`
      INSERT INTO meta.dq_runs (run_mode, status, total_rules, triggered_by)
      VALUES ('full', 'running', ${rules.length}, ${auth.id})
      RETURNING run_id, started_at
    `;
    const runRow = (runRows as Record<string, unknown>[])[0];
    const runId = String(runRow.run_id);

    const results: RuleResultView[] = [];
    let failedRules = 0;
    let rateSum = 0;
    let runFailed = false;

    for (const rule of rules) {
      let outcome: CheckOutcome;
      try {
        outcome = await checkRule(tx, rule);
      } catch (err) {
        runFailed = true;
        throw err;
      }

      const passRate =
        outcome.totalRows > 0
          ? Math.round((outcome.passedRows / outcome.totalRows) * 10000) / 100
          : 100;
      const status: 'pass' | 'fail' = outcome.failedRows > 0 ? 'fail' : 'pass';
      if (status === 'fail') failedRules += 1;
      rateSum += passRate;

      const target = `${rule.targetSchema}.${rule.targetTable}${
        rule.targetColumn ? '.' + rule.targetColumn : ''
      }`;
      const view: RuleResultView = {
        ruleCode: rule.ruleCode,
        ruleName: rule.ruleName,
        dimension: rule.dimension,
        severity: rule.severity,
        target,
        totalRows: outcome.totalRows,
        passedRows: outcome.passedRows,
        failedRows: outcome.failedRows,
        passRate,
        status,
        failedSample: outcome.failedSample,
      };
      results.push(view);

      await tx`
        INSERT INTO meta.dq_results
          (run_id, rule_code, total_rows, passed_rows, failed_rows,
           pass_rate, failed_sample, status)
        VALUES (
          ${runId}, ${rule.ruleCode}, ${outcome.totalRows},
          ${outcome.passedRows}, ${outcome.failedRows}, ${passRate},
          ${JSON.stringify(outcome.failedSample)}::jsonb, ${status})
      `;
    }

    const score = Math.round((rateSum / rules.length) * 100) / 100;
    const passedRules = rules.length - failedRules;
    const runStatus: 'success' | 'failed' = runFailed ? 'failed' : 'success';

    const finished = await tx`
      UPDATE meta.dq_runs
      SET status = ${runStatus}, passed_rules = ${passedRules},
          failed_rules = ${failedRules}, score = ${score}, finished_at = now()
      WHERE run_id = ${runId}
      RETURNING finished_at
    `;
    const finishedAt = String((finished as Record<string, unknown>[])[0].finished_at);

    await audit(tx, auth, 'data_governance.quality_check', runId, {
      totalRules: rules.length,
      failedRules,
      score,
    });

    return {
      runId,
      status: runStatus,
      totalRules: rules.length,
      passedRules,
      failedRules,
      score,
      startedAt: String(runRow.started_at),
      finishedAt,
      results,
    };
  });
}

/* ============================== 查询 ============================== */

export interface QualityRunView {
  runId: string;
  status: string;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  score: number;
  startedAt: string;
  finishedAt: string | null;
}

function mapRun(r: Record<string, unknown>): QualityRunView {
  return {
    runId: String(r.run_id),
    status: String(r.status),
    totalRules: num(r.total_rules),
    passedRules: num(r.passed_rules),
    failedRules: num(r.failed_rules),
    score: num(r.score),
    startedAt: String(r.started_at),
    finishedAt: r.finished_at ? String(r.finished_at) : null,
  };
}

/** 最新一次质量检测概览。 */
export async function getLatestRun(auth: AuthView): Promise<QualityRunView | null> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM meta.dq_runs ORDER BY started_at DESC LIMIT 1
  `;
  const list = rows as Record<string, unknown>[];
  return list.length ? mapRun(list[0]) : null;
}

/** 评分趋势（最近 N 次检测）。 */
export async function getQualityTrend(
  auth: AuthView,
  limit = 10,
): Promise<QualityRunView[]> {
  const db = getDb();
  const safeLimit = Math.min(Math.max(1, Math.trunc(limit) || 10), 50);
  const rows = await db`
    SELECT * FROM meta.dq_runs
    WHERE status = 'success'
    ORDER BY started_at DESC LIMIT ${safeLimit}
  `;
  return (rows as Record<string, unknown>[]).map(mapRun).reverse();
}

/** 某一次检测的逐规则结果。 */
export async function getRunResults(
  auth: AuthView,
  runId?: string,
): Promise<{ run: QualityRunView; results: RuleResultView[] }> {
  const db = getDb();

  let runRow: Record<string, unknown> | undefined;
  if (runId) {
    const rows = await db`SELECT * FROM meta.dq_runs WHERE run_id = ${runId}`;
    runRow = (rows as Record<string, unknown>[])[0];
    if (!runRow) throw notFound('检测运行不存在');
  } else {
    const rows = await db`
      SELECT * FROM meta.dq_runs ORDER BY started_at DESC LIMIT 1
    `;
    runRow = (rows as Record<string, unknown>[])[0];
    if (!runRow) throw notFound('尚无检测运行，请先触发质量检测');
  }

  const resultRows = await db`
    SELECT r.*, ru.rule_name, ru.dimension, ru.severity,
           ru.target_schema, ru.target_table, ru.target_column
    FROM meta.dq_results r
    LEFT JOIN meta.dq_rules ru ON ru.rule_code = r.rule_code
    WHERE r.run_id = ${String(runRow.run_id)}
    ORDER BY r.status DESC, r.rule_code
  `;
  const results: RuleResultView[] = (resultRows as Record<string, unknown>[]).map(
    (r) => ({
      ruleCode: String(r.rule_code),
      ruleName: String(r.rule_name ?? r.rule_code),
      dimension: String(r.dimension ?? ''),
      severity: String(r.severity ?? ''),
      target: `${String(r.target_schema ?? '')}.${String(r.target_table ?? '')}${
        r.target_column ? '.' + String(r.target_column) : ''
      }`,
      totalRows: num(r.total_rows),
      passedRows: num(r.passed_rows),
      failedRows: num(r.failed_rows),
      passRate: num(r.pass_rate),
      status: r.status === 'fail' ? 'fail' : 'pass',
      failedSample: (r.failed_sample as unknown[]) ?? [],
    }),
  );

  return { run: mapRun(runRow), results };
}

/** 规则清单（含启用状态）。 */
export async function listRules(auth: AuthView): Promise<DqRule[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM meta.dq_rules ORDER BY rule_code`;
  return (rows as Record<string, unknown>[]).map(mapRule);
}

/* ============================== 隐私分级 ============================== */

export interface ClassificationView {
  schemaName: string;
  tableName: string;
  columnName: string;
  level: number;
  source: 'auto' | 'manual';
  reason: string | null;
  overriddenByName: string | null;
  updatedAt: string;
}

/** 自动扫描列并分级（不覆盖人工修正）。 */
export async function scanClassification(
  auth: AuthView,
): Promise<{ scanned: number; classified: number }> {
  return withTx(async (tx) => {
    const colRows = await tx`
      SELECT table_schema, table_name, column_name
      FROM information_schema.columns
      WHERE table_schema IN ('clinical','iam','agent','audit')
        AND table_name NOT LIKE 'tmp%'
      ORDER BY table_schema, table_name, ordinal_position
    `;
    const cols = colRows as Record<string, unknown>[];
    const classifier = new DataClassifier({ enableCache: true });

    let classified = 0;
    for (const c of cols) {
      const schemaName = String(c.table_schema);
      const tableName = String(c.table_name);
      const columnName = String(c.column_name);
      const result = classifier.classify(columnName);
      const level = levelToNumber(result.level);

      const upserted = await tx`
        INSERT INTO meta.field_classification
          (schema_name, table_name, column_name, level, source, reason)
        VALUES (${schemaName}, ${tableName}, ${columnName},
                ${level}, 'auto', ${result.reason})
        ON CONFLICT (schema_name, table_name, column_name) DO UPDATE
          SET level = EXCLUDED.level,
              reason = EXCLUDED.reason,
              updated_at = now()
          WHERE meta.field_classification.source = 'auto'
        RETURNING id
      `;
      if ((upserted as unknown[]).length > 0) classified += 1;
    }

    await audit(tx, auth, 'data_governance.scan_classification', 'field_classification', {
      scanned: cols.length,
      classified,
    });
    return { scanned: cols.length, classified };
  });
}

/** 查询分级台账（可按 schema/级别过滤）。 */
export async function listClassification(
  auth: AuthView,
  filter: { schema?: string; level?: number },
): Promise<ClassificationView[]> {
  const db = getDb();
  const rows = await db`
    SELECT fc.*, u.name AS overridden_name
    FROM meta.field_classification fc
    LEFT JOIN iam.users u ON u.id = fc.overridden_by
    WHERE ${filter.schema ? db`fc.schema_name = ${filter.schema}` : db`true`}
      AND ${filter.level ? db`fc.level = ${filter.level}` : db`true`}
    ORDER BY fc.level DESC, fc.schema_name, fc.table_name, fc.column_name
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    schemaName: String(r.schema_name),
    tableName: String(r.table_name),
    columnName: String(r.column_name),
    level: num(r.level),
    source: r.source === 'manual' ? 'manual' : 'auto',
    reason: r.reason ? String(r.reason) : null,
    overriddenByName: r.overridden_name ? String(r.overridden_name) : null,
    updatedAt: String(r.updated_at),
  }));
}

/** 人工修正字段分级（留痕，不被自动扫描覆盖）。 */
export async function overrideClassification(
  auth: AuthView,
  input: {
    schemaName: string;
    tableName: string;
    columnName: string;
    level: number;
    reason?: string;
  },
): Promise<ClassificationView> {
  if (!input.schemaName || !input.tableName || !input.columnName) {
    throw badRequest('schema/表/列名不能为空');
  }
  if (!Number.isInteger(input.level) || input.level < 1 || input.level > 4) {
    throw badRequest('分级必须是 1-4 的整数');
  }

  return withTx(async (tx) => {
    const exists = await tx`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = ${input.schemaName}
        AND table_name = ${input.tableName}
        AND column_name = ${input.columnName}
    `;
    if ((exists as unknown[]).length === 0) {
      throw notFound('目标列不存在，无法修正分级');
    }

    const upserted = await tx`
      INSERT INTO meta.field_classification
        (schema_name, table_name, column_name, level, source, reason, overridden_by)
      VALUES (${input.schemaName}, ${input.tableName}, ${input.columnName},
              ${input.level}, 'manual', ${input.reason ?? '人工修正分级'}, ${auth.id})
      ON CONFLICT (schema_name, table_name, column_name) DO UPDATE
        SET level = EXCLUDED.level,
            source = 'manual',
            reason = EXCLUDED.reason,
            overridden_by = EXCLUDED.overridden_by,
            updated_at = now()
      RETURNING *
    `;
    const row = (upserted as Record<string, unknown>[])[0];

    await audit(
      tx,
      auth,
      'data_governance.override_level',
      `${input.schemaName}.${input.tableName}.${input.columnName}`,
      { level: input.level },
    );

    return {
      schemaName: String(row.schema_name),
      tableName: String(row.table_name),
      columnName: String(row.column_name),
      level: num(row.level),
      source: 'manual',
      reason: row.reason ? String(row.reason) : null,
      overriddenByName: auth.realName,
      updatedAt: String(row.updated_at),
    };
  });
}
