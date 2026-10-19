/* ============================================================================
 * 健澜AI原生医院操作系统OS - 数据治理聚合器（M5-E）
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

/* ============================================================================
 * M175-A · 【质量与新场景】深度数据治理纯函数
 * ----------------------------------------------------------------------------
 * 主张：数据治理要真治理，不是建表就完。以下四个函数不触库、不发网络、
 * 无副作用，便于单测与复用；制度台账见 deploy/postgres/init/350-data-governance.sql
 * （meta.data_quality_rule，覆盖四大治理域 14 个治理子项）。
 *
 *   - buildDeepDataGovernance      构建深度数据治理体系（四大域/子项/成熟度）；
 *   - runDataQualityCheck          对单表单字段按规则做真检查（样本驱动）；
 *   - generateDataQualityReport    按期汇总质量报告（五维得分/短板/处置建议）；
 *   - identifyDataAnomaly          按字段治理规则识别数据异常（真判，不凑数）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * ==========================================================================*/

/* ----------------------------- 类型定义 ----------------------------- */

/** 四大治理域 */
export type GovernanceDomain = 'standard' | 'quality' | 'security' | 'lifecycle';

/** 数据质量五维 */
export type QualityDimension =
  | 'completeness'
  | 'accuracy'
  | 'consistency'
  | 'timeliness'
  | 'uniqueness';

/** 检查类型（与 meta.data_quality_rule.check_type 对齐） */
export type GovCheckType =
  | 'not_null'
  | 'unique'
  | 'range'
  | 'non_negative'
  | 'regex'
  | 'enum'
  | 'referential'
  | 'freshness';

export type GovSeverity = 'critical' | 'major' | 'minor';

/** 一条治理检查规则（纯函数输入，样本随规则带入，不触库） */
export interface GovDataQualityRule {
  checkType: GovCheckType;
  severity: GovSeverity;
  /** 规则参数：range→min/max；enum→allowed；regex→pattern；
   *  freshness→maxAgeHours/referenceDate；referential→allowed(已知键集) */
  params?: {
    min?: number;
    max?: number;
    allowed?: Array<string | number>;
    pattern?: string;
    maxAgeHours?: number;
    referenceDate?: string;
  };
  /** 待检样本值（纯函数输入） */
  samples: unknown[];
}

/** 单规则检查结果 */
export interface GovCheckResult {
  table: string;
  field: string;
  checkType: GovCheckType;
  severity: GovSeverity;
  dimension: QualityDimension;
  totalRows: number;
  passedRows: number;
  failedRows: number;
  passRate: number;
  status: 'pass' | 'fail';
  failedSample: unknown[];
}

/** 治理子项 */
export interface GovSubItem {
  code: string;
  name: string;
  description: string;
  controls: number;
}

/** 治理域 */
export interface GovDomain {
  code: GovernanceDomain;
  name: string;
  principle: string;
  items: GovSubItem[];
}

/** 深度数据治理体系输出 */
export interface DeepDataGovernance {
  generatedAt: string;
  domains: GovDomain[];
  totalItems: number;
  totalControls: number;
  summary: Record<GovernanceDomain, number>;
  maturityModel: Array<{ level: number; name: string; description: string }>;
  recommendedRuleCount: number;
}

/** 异常识别结果 */
export interface DataAnomaly {
  table: string;
  field: string;
  value: unknown;
  isAnomaly: boolean;
  level: 'critical' | 'warning' | 'ok';
  reason: string;
  expected: string | null;
}

/** 周期质量报告 */
export interface GovQualityReport {
  period: string;
  generatedAt: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  overallScore: number;
  dimensionBreakdown: Record<QualityDimension, number>;
  topIssues: GovCheckResult[];
  recommendations: string[];
  weakestDimension: QualityDimension | null;
}

/* --------------------------- 维度映射 --------------------------- */

/** 检查类型 → 数据质量五维 */
function dimensionOf(checkType: GovCheckType): QualityDimension {
  switch (checkType) {
    case 'not_null':
      return 'completeness';
    case 'unique':
      return 'uniqueness';
    case 'referential':
      return 'consistency';
    case 'freshness':
      return 'timeliness';
    case 'range':
    case 'non_negative':
    case 'regex':
    case 'enum':
      return 'accuracy';
  }
}

const QUALITY_DIMENSION_LABEL: Record<QualityDimension, string> = {
  completeness: '完整性',
  accuracy: '准确性',
  consistency: '一致性',
  timeliness: '及时性',
  uniqueness: '唯一性',
};

/* ===================== 1. 深度数据治理体系 ===================== */

/**
 * buildDeepDataGovernance：构建覆盖四大治理域的深度治理体系。
 * 数据标准（命名规范/数据类型/值域）+ 数据质量（五维）+ 数据安全
 * （分级分类/脱敏/访问控制）+ 数据生命周期（创建/存储/使用/归档/销毁）。
 */
export function buildDeepDataGovernance(generatedAt?: string): DeepDataGovernance {
  const domains: GovDomain[] = [
    {
      code: 'standard',
      name: '数据标准',
      principle: '先立标准再用数：命名统一、类型统一、值域受控，从源头消除歧义。',
      items: [
        { code: 'naming', name: '命名规范', description: '库/表/列统一小写蛇形，业务含义见数据字典', controls: 3 },
        { code: 'datatype', name: '数据类型', description: '同名字段跨表类型一致，禁止隐式类型转换', controls: 3 },
        { code: 'domain', name: '值域', description: '枚举/字典受控，性别、就诊类型等白名单校验', controls: 4 },
      ],
    },
    {
      code: 'quality',
      name: '数据质量',
      principle: '五维度量、按周出分：完整性/准确性/一致性/及时性/唯一性，短板闭环。',
      items: [
        { code: 'completeness', name: '完整性', description: '关键字段非空，MRN/就诊号不得缺失', controls: 4 },
        { code: 'accuracy', name: '准确性', description: '生理/业务区间校验，异常值双人复核', controls: 5 },
        { code: 'consistency', name: '一致性', description: '外键引用有效，跨系统主数据对齐', controls: 3 },
        { code: 'timeliness', name: '及时性', description: '接口数据在 SLA 内入库，超期告警', controls: 3 },
        { code: 'uniqueness', name: '唯一性', description: 'EMPI 去重，主索引一人一档', controls: 3 },
      ],
    },
    {
      code: 'security',
      name: '数据安全',
      principle: '分级分类打底：敏感字段必标级、必脱敏、最小权限访问。',
      items: [
        { code: 'classification', name: '分级分类', description: '字段级 L1-L4 自动分类 + 人工修正留痕', controls: 4 },
        { code: 'masking', name: '脱敏', description: '身份证/手机号/住址等 PII 出口掩码', controls: 3 },
        { code: 'access', name: '访问控制', description: 'RBAC/ABAC 最小权限，越权访问实时阻断', controls: 3 },
      ],
    },
    {
      code: 'lifecycle',
      name: '数据生命周期',
      principle: '全周期可管：创建留痕、存储加密、使用限目的、到期归档、销毁留证。',
      items: [
        { code: 'create', name: '创建', description: '写入即审计，接入审计哈希链', controls: 2 },
        { code: 'store', name: '存储', description: '敏感数据静态加密，密钥轮换', controls: 2 },
        { code: 'use', name: '使用', description: '最小必要原则，超目的调用走审批', controls: 2 },
        { code: 'archive', name: '归档', description: '超期数据迁冷存储，保留可查询', controls: 2 },
        { code: 'destroy', name: '销毁', description: '到期数据安全销毁，出具销毁证明', controls: 2 },
      ],
    },
  ];

  const summary = {
    standard: domains[0].items.length,
    quality: domains[1].items.length,
    security: domains[2].items.length,
    lifecycle: domains[3].items.length,
  };
  const totalItems = domains.reduce((s, d) => s + d.items.length, 0);
  const totalControls = domains.reduce(
    (s, d) => s + d.items.reduce((a, it) => a + it.controls, 0),
    0,
  );

  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    domains,
    totalItems,
    totalControls,
    summary,
    maturityModel: [
      { level: 1, name: '初始级', description: '治理靠人盯，规则散落、无台账' },
      { level: 2, name: '受管理级', description: '有规则库与周期检测，问题可发现' },
      { level: 3, name: '已定义级', description: '四大治理域制度化，责任岗到人' },
      { level: 4, name: '量化管理级', description: '五维质量可度量，短板量化闭环' },
      { level: 5, name: '优化级', description: '自学习持续优化，治理内生改进' },
    ],
    recommendedRuleCount: 17, // 与 350-data-governance.sql 内置规则数对齐
  };
}

/* ===================== 2. 单表单字段质量检查 ===================== */

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

/**
 * runDataQualityCheck：对 table.field 按规则对样本做真检查。
 * 纯函数：结果完全由 (table, field, rule) 决定，不触库。
 */
export function runDataQualityCheck(
  table: string,
  field: string,
  rule: GovDataQualityRule,
): GovCheckResult {
  const samples = Array.isArray(rule.samples) ? rule.samples : [];
  const total = samples.length;
  const p = rule.params ?? {};
  const dimension = dimensionOf(rule.checkType);

  // 预计算唯一值频次（unique 用）
  const freq = new Map<string, number>();
  if (rule.checkType === 'unique') {
    for (const s of samples) {
      if (isEmpty(s)) continue;
      const key = JSON.stringify(s);
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }

  let passed = 0;
  const failedSample: unknown[] = [];

  for (const v of samples) {
    let ok = true;
    switch (rule.checkType) {
      case 'not_null':
        ok = !isEmpty(v);
        break;
      case 'unique':
        ok = isEmpty(v) || (freq.get(JSON.stringify(v)) ?? 0) === 1;
        break;
      case 'range': {
        const n = toNumber(v);
        ok =
          n !== null &&
          (p.min === undefined || n >= p.min) &&
          (p.max === undefined || n <= p.max);
        break;
      }
      case 'non_negative': {
        const n = toNumber(v);
        ok = n !== null && n >= 0;
        break;
      }
      case 'regex':
        ok = typeof v === 'string' && p.pattern !== undefined
          ? new RegExp(p.pattern).test(v)
          : false;
        break;
      case 'enum':
        ok = !isEmpty(v) && (p.allowed ?? []).some((a) => String(a) === String(v));
        break;
      case 'referential':
        // 纯函数近似：非空值须出现在已知键集（allowed）中
        ok = isEmpty(v) || (p.allowed ?? []).some((a) => String(a) === String(v));
        break;
      case 'freshness': {
        const ref = p.referenceDate ? new Date(p.referenceDate).getTime() : Date.now();
        const t = Date.parse(String(v));
        const maxMs = (p.maxAgeHours ?? 24) * 3600 * 1000;
        ok = Number.isFinite(t) && ref - t <= maxMs && ref - t >= -maxMs;
        break;
      }
    }
    if (ok) {
      passed += 1;
    } else if (failedSample.length < 10) {
      failedSample.push(v);
    }
  }

  const failed = total - passed;
  const passRate = total > 0 ? Math.round((passed / total) * 10000) / 100 : 100;

  return {
    table,
    field,
    checkType: rule.checkType,
    severity: rule.severity,
    dimension,
    totalRows: total,
    passedRows: passed,
    failedRows: failed,
    passRate,
    status: failed > 0 ? 'fail' : 'pass',
    failedSample,
  };
}

/* ===================== 3. 周期质量报告 ===================== */

/**
 * generateDataQualityReport：按期汇总一批检查结果，输出五维得分、
 * 短板项与处置建议。纯函数：不传 checks 时输出空盘框架（不造假数据）。
 */
export function generateDataQualityReport(
  period: string,
  checks: GovCheckResult[] = [],
): GovQualityReport {
  const dims: QualityDimension[] = [
    'completeness',
    'accuracy',
    'consistency',
    'timeliness',
    'uniqueness',
  ];
  const dimScore = {} as Record<QualityDimension, number>;
  const sumByDim: Record<QualityDimension, { sum: number; n: number }> = {
    completeness: { sum: 0, n: 0 },
    accuracy: { sum: 0, n: 0 },
    consistency: { sum: 0, n: 0 },
    timeliness: { sum: 0, n: 0 },
    uniqueness: { sum: 0, n: 0 },
  };

  for (const c of checks) {
    sumByDim[c.dimension].sum += c.passRate;
    sumByDim[c.dimension].n += 1;
  }
  for (const d of dims) {
    dimScore[d] = sumByDim[d].n > 0
      ? Math.round((sumByDim[d].sum / sumByDim[d].n) * 100) / 100
      : 100;
  }

  const total = checks.length;
  const failedChecks = checks.filter((c) => c.status === 'fail').length;
  const passedChecks = total - failedChecks;
  const overallScore = total > 0
    ? Math.round((checks.reduce((s, c) => s + c.passRate, 0) / total) * 100) / 100
    : 100;

  // 短板：有检查且得分最低的维度
  let weakest: QualityDimension | null = null;
  let weakestScore = Number.POSITIVE_INFINITY;
  for (const d of dims) {
    if (sumByDim[d].n > 0 && dimScore[d] < weakestScore) {
      weakestScore = dimScore[d];
      weakest = d;
    }
  }

  const RECIPE: Record<QualityDimension, string> = {
    completeness: '完整性偏弱：补全关键字段非空约束，录入端阻断空值建档。',
    accuracy: '准确性偏弱：把值域/正则/区间规则下沉到录入端，异常值双人复核。',
    consistency: '一致性偏弱：核对外键引用与主数据，隔离孤儿记录并溯源。',
    timeliness: '及时性偏弱：建立接口新鲜度监控，超 SLA 自动告警与重试。',
    uniqueness: '唯一性偏弱：跑 EMPI 去重，合并重复主索引，一人一档。',
  };
  const recommendations: string[] = [];
  if (weakest) recommendations.push(RECIPE[weakest]);
  // 严重失败项追加处置
  for (const c of checks.filter((x) => x.severity === 'critical' && x.status === 'fail')) {
    recommendations.push(
      `[红线] ${c.table}.${c.field} ${QUALITY_DIMENSION_LABEL[c.dimension]}不达标（通过率 ${c.passRate}%），需当周闭环。`,
    );
  }

  const topIssues = [...checks]
    .filter((c) => c.failedRows > 0)
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, 5);

  return {
    period,
    generatedAt: new Date().toISOString(),
    totalChecks: total,
    passedChecks,
    failedChecks,
    overallScore,
    dimensionBreakdown: dimScore,
    topIssues,
    recommendations,
    weakestDimension: weakest,
  };
}

/* ===================== 4. 数据异常识别 ===================== */

interface AnomalyRule {
  match: (field: string) => boolean;
  range?: [number, number];
  numeric: boolean;
  nonEmpty?: boolean;
  pattern?: RegExp;
  expected: string;
}

const ANOMALY_RULES: AnomalyRule[] = [
  { match: (f) => /age|年龄/.test(f), numeric: true, range: [0, 150], expected: '0-150 岁' },
  { match: (f) => /weight|体重/.test(f), numeric: true, range: [0.5, 300], expected: '0.5-300 kg' },
  { match: (f) => /height|身高/.test(f), numeric: true, range: [20, 272], expected: '20-272 cm' },
  { match: (f) => /sbp|systolic|收缩压/.test(f), numeric: true, range: [40, 250], expected: '40-250 mmHg' },
  { match: (f) => /dbp|diastolic|舒张压/.test(f), numeric: true, range: [20, 150], expected: '20-150 mmHg' },
  { match: (f) => /temp|体温/.test(f), numeric: true, range: [30, 45], expected: '30-45 ℃' },
  { match: (f) => /heart_?rate|pulse|心率/.test(f), numeric: true, range: [20, 250], expected: '20-250 次/分' },
  { match: (f) => /respiratory|呼吸/.test(f), numeric: true, range: [5, 60], expected: '5-60 次/分' },
  { match: (f) => /glucose|血糖/.test(f), numeric: true, range: [1, 40], expected: '1-40 mmol/L' },
  { match: (f) => /mrn|病历号|patient_id|visit_no|就诊号/.test(f), numeric: false, nonEmpty: true, expected: '非空字符串' },
  { match: (f) => /phone|mobile|手机|电话/.test(f), numeric: false, pattern: /^1\d{10}$/, expected: '11 位手机号' },
  { match: (f) => /gender|性别/.test(f), numeric: false, expected: '男/女/未知/未说明' },
];

/**
 * identifyDataAnomaly：按字段治理规则识别单个值是否异常。
 * 命中字段规则时做区间/类型/格式判定；未命中时，空值记 warning，其余放行。
 */
export function identifyDataAnomaly(
  table: string,
  field: string,
  value: unknown,
): DataAnomaly {
  const f = field.toLowerCase();
  const rule = ANOMALY_RULES.find((r) => r.match(f));

  if (!rule) {
    if (isEmpty(value)) {
      return {
        table, field, value,
        isAnomaly: true, level: 'warning',
        reason: '空值且未匹配到专项治理规则，建议补充分级或字典',
        expected: null,
      };
    }
    return {
      table, field, value,
      isAnomaly: false, level: 'ok',
      reason: '未命中专项治理规则，按正常值放行',
      expected: null,
    };
  }

  // 空值：命中规则但为空 → 完整性异常
  if (isEmpty(value)) {
    return {
      table, field, value,
      isAnomaly: true, level: 'critical',
      reason: `必填字段为空（期望 ${rule.expected}）`,
      expected: rule.expected,
    };
  }

  if (rule.numeric) {
    const n = toNumber(value);
    if (n === null) {
      return {
        table, field, value,
        isAnomaly: true, level: 'warning',
        reason: `应为数值但解析失败（期望 ${rule.expected}）`,
        expected: rule.expected,
      };
    }
    const [min, max] = rule.range ?? [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
    if (n < min || n > max) {
      return {
        table, field, value,
        isAnomaly: true, level: 'critical',
        reason: `超出合理区间 [${min}, ${max}]，疑似录入错误`,
        expected: rule.expected,
      };
    }
    return {
      table, field, value,
      isAnomaly: false, level: 'ok',
      reason: '数值在合理区间内',
      expected: rule.expected,
    };
  }

  if (rule.pattern) {
    const ok = typeof value === 'string' && rule.pattern.test(value);
    return ok
      ? { table, field, value, isAnomaly: false, level: 'ok', reason: '格式合规', expected: rule.expected }
      : {
          table, field, value,
          isAnomaly: true, level: 'warning',
          reason: `格式不符（期望 ${rule.expected}）`,
          expected: rule.expected,
        };
  }

  if (rule.nonEmpty) {
    return {
      table, field, value,
      isAnomaly: false, level: 'ok', reason: '非空主标识有效', expected: rule.expected,
    };
  }

  // 性别等枚举：白名单判定
  if (/gender|性别/.test(f)) {
    const ok = ['男', '女', '未知', '未说明', 'M', 'F'].includes(String(value));
    return ok
      ? { table, field, value, isAnomaly: false, level: 'ok', reason: '取值受控', expected: rule.expected }
      : {
          table, field, value,
          isAnomaly: true, level: 'warning',
          reason: `性别取值不在受控字典（期望 ${rule.expected}）`,
          expected: rule.expected,
        };
  }

  return {
    table, field, value,
    isAnomaly: false, level: 'ok', reason: '通过校验', expected: rule.expected,
  };
}
