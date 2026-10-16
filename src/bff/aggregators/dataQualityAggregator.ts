/**
 * 健澜科技 jlmedaios - M159-D 数据质量治理聚合器（中期路线图，纯函数层）
 *
 * 【中期路线图】
 *  本模块是数据质量治理的"纯函数判定内核"：不连接数据库、不发起网络请求，
 *  所有待检数据由调用方（路由层）从 PostgreSQL 取出后注入 `rows`。
 *  这样既保证可在单元测试中用内存样本精确断言，又让路由层专注 I/O。
 *
 *  五维检查规则（与 deploy/postgres/init/321-data-quality.sql 对齐）：
 *   - completeness 完整性：非空率 ≥ 95%（可配 threshold）；
 *   - accuracy    准确性：值域（domain）/ 格式（formatRegex）校验；
 *   - consistency 一致性：跨表外键关联值必须在被引用表中存在；
 *   - timeliness  及时性：更新时间距 now 不超过 maxAgeHours（默认 24h）；
 *   - uniqueness  唯一性：主键（pkField，默认 field）无重复。
 *
 *  对外纯函数：
 *   - checkDataQuality(table, field, rule)：对单字段单维度做一次检查，返回 QualityResult；
 *   - generateDataQualityReport(table, period, options)：对一张表跑全五维检查并汇总评分；
 *   - identifyDataIssues(table, field, options)：把不达标维度展开成 Issue 清单。
 *
 *  生产安全：
 *   - 不 mutate 入参；所有结果为新建对象；
 *   - 空表（totalRows=0）视为 100 分（无可检数据，不误报）；
 *   - 缺少维度相关参数时该维度按"通过且 0 失败"处理，避免误杀；
 *   - 失败样本最多保留 10 条，防止大结果集拖垮前端。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 一行待检数据（路由层从业务表 SELECT * 后注入） */
export type Row = Record<string, unknown>;

/** 五维数据质量维度 */
export type QualityDimension =
  | 'completeness'
  | 'accuracy'
  | 'consistency'
  | 'timeliness'
  | 'uniqueness';

/** 单条质量检查规则（携带待检数据 rows，纯函数所需输入全部在此） */
export interface DataQualityRule {
  /** 检查维度 */
  dimension: QualityDimension;
  /** 待检数据行（由路由层注入） */
  rows: readonly Row[];
  /** 达标阈值（百分比 0..100）；完整性默认 95 */
  threshold?: number;
  /** 【准确性】允许的值域（白名单）；给出后非白名单值视为失败 */
  domain?: ReadonlyArray<unknown>;
  /** 【准确性】格式正则；给出后不匹配的字符串值视为失败 */
  formatRegex?: RegExp;
  /** 【一致性】被引用表的数据行（路由层把被引用表行取出注入） */
  refRows?: readonly Row[];
  /** 【一致性】被引用字段名 */
  refField?: string;
  /** 【及时性】用于判断时效的时间字段名（默认取 field） */
  timeField?: string;
  /** 【及时性】允许的最大陈旧时长（小时），默认 24 */
  maxAgeHours?: number;
  /** 【唯一性】主键字段名（默认取 field） */
  pkField?: string;
  /** 可注入的"当前时间"（测试用），默认 new Date() */
  now?: Date;
}

/** 单次检查结果 */
export interface QualityResult {
  table: string;
  field: string;
  dimension: QualityDimension;
  /** 检查总行数 */
  totalRows: number;
  /** 通过行数 */
  passedRows: number;
  /** 失败行数 */
  failedRows: number;
  /** 达标率 0..100（保留两位小数） */
  passRate: number;
  /** 本次规则阈值 0..100 */
  threshold: number;
  /** 是否达标 */
  status: 'pass' | 'fail';
  /** 失败样本（最多 10 条） */
  failedValues: unknown[];
  /** 人类可读说明 */
  message: string;
}

/** 一条定位出的数据问题 */
export interface Issue {
  table: string;
  field: string;
  dimension: QualityDimension;
  severity: 'high' | 'medium' | 'low';
  /** 影响行数 */
  count: number;
  /** 失败样本（最多 10 条） */
  examples: unknown[];
  /** 问题描述 */
  description: string;
}

/** 一张表在某周期的质量报告 */
export interface QualityReport {
  table: string;
  period: string;
  generatedAt: string;
  /** 综合质量分 0..100（五维达标率均值） */
  overallScore: number;
  summary: { total: number; passed: number; failed: number };
  /** 五维逐项结果 */
  dimensionResults: QualityResult[];
  /** 展开后的问题清单 */
  issues: Issue[];
  /** 整体态势：healthy≥95 / warning≥80 / 其余 critical */
  status: 'healthy' | 'warning' | 'critical';
}

/* ------------------------------ 内部工具 ------------------------------ */

/** 空值判定：null / undefined / 空白字符串均视为缺失 */
function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

/** 截断失败样本，最多保留 10 条 */
function cap<T>(arr: T[]): T[] {
  return arr.slice(0, 10);
}

/** 把 passRate 收敛到两位小数 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 维度中文标签（报告/问题描述用） */
const DIM_LABEL: Record<QualityDimension, string> = {
  completeness: '完整性',
  accuracy: '准确性',
  consistency: '一致性',
  timeliness: '及时性',
  uniqueness: '唯一性',
};

/** 把任意值安全地转成可展示样本 */
function sampleOf(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

/** 解析行内时间字段为 Date；失败返回 null */
function toDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

/* ============================ 核心纯函数 ============================ */

/**
 * 单字段单维度质量检查（纯函数）。
 *
 * @param table 目标表名（仅用于回填结果，不做 I/O）
 * @param field 目标字段名
 * @param rule  检查规则 + 待检数据（rows 由路由层注入）
 */
export function checkDataQuality(
  table: string,
  field: string,
  rule: DataQualityRule,
): QualityResult {
  const rows = rule.rows ?? [];
  const total = rows.length;
  let passed = 0;
  const failedValues: unknown[] = [];

  switch (rule.dimension) {
    case 'completeness': {
      const threshold = rule.threshold ?? 95;
      for (const row of rows) {
        if (!isBlank(row[field])) passed += 1;
        else failedValues.push(sampleOf(row[field]));
      }
      const passRate = total === 0 ? 100 : (passed / total) * 100;
      const status: QualityResult['status'] = passRate >= threshold ? 'pass' : 'fail';
      return base(table, field, rule.dimension, total, passed, failedValues, threshold, status,
        `字段【${field}】非空率 ${round2(passRate)}%（阈值 ${threshold}%）`);
    }

    case 'uniqueness': {
      const pk = rule.pkField ?? field;
      const threshold = rule.threshold ?? 100; // 主键默认零容忍
      const seen = new Map<string, number>();
      for (const row of rows) {
        const key = sampleOf(row[pk]);
        const sig = JSON.stringify(key ?? null);
        seen.set(sig, (seen.get(sig) ?? 0) + 1);
      }
      // 主键为空的行也算唯一性失败
      for (const row of rows) {
        const key = row[pk];
        if (isBlank(key)) {
          failedValues.push('<空主键>');
          continue;
        }
        const sig = JSON.stringify(sampleOf(key));
        if ((seen.get(sig) ?? 0) > 1) {
          failedValues.push(sampleOf(key));
        } else {
          passed += 1;
        }
      }
      const bad = total - passed;
      const passRate = total === 0 ? 100 : (passed / total) * 100;
      const status: QualityResult['status'] = passRate >= threshold ? 'pass' : 'fail';
      return base(table, field, rule.dimension, total, passed, failedValues, threshold, status,
        `字段【${field}】主键 ${pk} 重复/缺失 ${bad} 行（达标率 ${round2(passRate)}%）`);
    }

    case 'accuracy': {
      const threshold = rule.threshold ?? 100;
      const hasDomain = Array.isArray(rule.domain) && rule.domain.length > 0;
      const hasFormat = rule.formatRegex instanceof RegExp;
      if (!hasDomain && !hasFormat) {
        // 无判定依据：按通过处理，不误报
        return base(table, field, rule.dimension, total, total, [], threshold, 'pass',
          `字段【${field}】未配置值域/格式，跳过准确性判定`);
      }
      for (const row of rows) {
        const v = row[field];
        let ok = !isBlank(v);
        if (ok && hasDomain) {
          ok = (rule.domain as ReadonlyArray<unknown>).some(
            (allowed) => String(allowed) === String(v),
          );
        }
        if (ok && hasFormat && typeof v === 'string') {
          ok = (rule.formatRegex as RegExp).test(v);
        }
        if (ok) passed += 1;
        else failedValues.push(sampleOf(v));
      }
      const passRate = total === 0 ? 100 : (passed / total) * 100;
      const status: QualityResult['status'] = passRate >= threshold ? 'pass' : 'fail';
      return base(table, field, rule.dimension, total, passed, failedValues, threshold, status,
        `字段【${field}】值域/格式达标率 ${round2(passRate)}%`);
    }

    case 'consistency': {
      const threshold = rule.threshold ?? 100;
      const refField = rule.refField ?? field;
      const refRows = rule.refRows ?? [];
      if (refRows.length === 0) {
        return base(table, field, rule.dimension, total, total, [], threshold, 'pass',
          `字段【${field}】无被引用数据，跳过一致性判定`);
      }
      const refSet = new Set<string>();
      for (const r of refRows) {
        const v = r[refField];
        if (!isBlank(v)) refSet.add(JSON.stringify(sampleOf(v)));
      }
      for (const row of rows) {
        const v = row[field];
        if (isBlank(v)) {
          // 空值由完整性兜底，一致性不重复计失败
          passed += 1;
          continue;
        }
        if (refSet.has(JSON.stringify(sampleOf(v)))) passed += 1;
        else failedValues.push(sampleOf(v));
      }
      const passRate = total === 0 ? 100 : (passed / total) * 100;
      const status: QualityResult['status'] = passRate >= threshold ? 'pass' : 'fail';
      return base(table, field, rule.dimension, total, passed, failedValues, threshold, status,
        `字段【${field}】外键关联一致率 ${round2(passRate)}%`);
    }

    case 'timeliness': {
      const threshold = rule.threshold ?? 100;
      const timeField = rule.timeField ?? field;
      const maxAgeHours = rule.maxAgeHours ?? 24;
      const now = rule.now ?? new Date();
      for (const row of rows) {
        const d = toDate(row[timeField]);
        if (d === null) {
          failedValues.push(sampleOf(row[timeField]));
          continue;
        }
        const ageHours = (now.getTime() - d.getTime()) / 3_600_000;
        if (ageHours <= maxAgeHours) passed += 1;
        else failedValues.push(sampleOf(row[timeField]));
      }
      const passRate = total === 0 ? 100 : (passed / total) * 100;
      const status: QualityResult['status'] = passRate >= threshold ? 'pass' : 'fail';
      return base(table, field, rule.dimension, total, passed, failedValues, threshold, status,
        `字段【${field}】更新时效达标率 ${round2(passRate)}%（≤${maxAgeHours}h）`);
    }
  }
}

/** 组装一条结果 */
function base(
  table: string,
  field: string,
  dimension: QualityDimension,
  total: number,
  passed: number,
  failedValues: unknown[],
  threshold: number,
  status: QualityResult['status'],
  message: string,
): QualityResult {
  return {
    table,
    field,
    dimension,
    totalRows: total,
    passedRows: passed,
    failedRows: total - passed,
    passRate: total === 0 ? 100 : round2((passed / total) * 100),
    threshold,
    status,
    failedValues: cap(failedValues),
    message,
  };
}

/* ========================== 报告生成 / 问题定位 ========================== */

/** generateDataQualityReport 的可选项（注入待检数据与各维度参数） */
export interface ReportOptions {
  /** 待检数据行（路由层注入） */
  rows?: readonly Row[];
  /** 用于一致性检查的被引用表行 */
  refRows?: readonly Row[];
  /** 被引用字段名 */
  refField?: string;
  /** 唯一性主键字段（默认 'id'） */
  pkField?: string;
  /** 及时性时间字段（默认 'updated_at'） */
  timeField?: string;
  /** 完整性阈值（默认 95） */
  completenessThreshold?: number;
  /** 准确性值域白名单 */
  accuracyDomain?: ReadonlyArray<unknown>;
  /** 准确性格式正则 */
  accuracyRegex?: RegExp;
  /** 可注入时钟（测试用） */
  now?: Date;
}

/** 固定巡检的五个字段维度（默认巡检患者/就诊主表常用字段） */
interface DimensionSpec {
  dimension: QualityDimension;
  field: string;
  build: (rows: readonly Row[], o: ReportOptions, now: Date) => DataQualityRule;
}

const DIMENSION_SPECS: DimensionSpec[] = [
  {
    dimension: 'completeness',
    field: 'mrn',
    build: (rows, o) => ({
      dimension: 'completeness',
      rows,
      threshold: o.completenessThreshold ?? 95,
    }),
  },
  {
    dimension: 'uniqueness',
    field: 'id',
    build: (rows, o) => ({
      dimension: 'uniqueness',
      rows,
      pkField: o.pkField ?? 'id',
    }),
  },
  {
    dimension: 'accuracy',
    field: 'gender',
    build: (rows, o) => ({
      dimension: 'accuracy',
      rows,
      domain: o.accuracyDomain ?? ['男', '女', '未知', '未说明'],
      formatRegex: o.accuracyRegex,
    }),
  },
  {
    dimension: 'consistency',
    field: 'patient_id',
    build: (rows, o) => ({
      dimension: 'consistency',
      rows,
      refRows: o.refRows ?? [],
      refField: o.refField ?? 'id',
    }),
  },
  {
    dimension: 'timeliness',
    field: 'updated_at',
    build: (rows, o, now) => ({
      dimension: 'timeliness',
      rows,
      timeField: o.timeField ?? 'updated_at',
      maxAgeHours: 24,
      now,
    }),
  },
];

/**
 * 生成一张表在指定周期的全五维质量报告（纯函数）。
 *
 * @param table  目标表名
 * @param period 周期描述（如 'today' / '2026-W42'，仅回填，不做 I/O）
 * @param options 待检数据与各维度参数（rows 由路由层注入）
 */
export function generateDataQualityReport(
  table: string,
  period: string,
  options: ReportOptions = {},
): QualityReport {
  const rows = options.rows ?? [];
  const now = options.now ?? new Date();
  const results: QualityResult[] = [];

  for (const spec of DIMENSION_SPECS) {
    const rule = spec.build(rows, options, now);
    results.push(checkDataQuality(table, spec.field, rule));
  }

  const failed = results.filter((r) => r.status === 'fail');
  const passedCount = results.length - failed.length;
  const overallScore = round2(
    results.reduce((acc, r) => acc + r.passRate, 0) / Math.max(results.length, 1),
  );

  const status: QualityReport['status'] =
    overallScore >= 95 ? 'healthy' : overallScore >= 80 ? 'warning' : 'critical';

  const issues = identifyDataIssuesInternal(table, results);

  return {
    table,
    period,
    generatedAt: now.toISOString(),
    overallScore,
    summary: { total: results.length, passed: passedCount, failed: failed.length },
    dimensionResults: results,
    issues,
    status,
  };
}

/** 维度 -> 问题严重度映射 */
function severityOf(dim: QualityDimension): Issue['severity'] {
  switch (dim) {
    case 'completeness':
    case 'consistency':
    case 'uniqueness':
      return 'high';
    case 'accuracy':
      return 'medium';
    case 'timeliness':
      return 'low';
  }
}

/** 把失败的检查结果展开为 Issue 清单 */
function identifyDataIssuesInternal(table: string, results: QualityResult[]): Issue[] {
  const issues: Issue[] = [];
  for (const r of results) {
    if (r.status !== 'fail') continue;
    issues.push({
      table,
      field: r.field,
      dimension: r.dimension,
      severity: severityOf(r.dimension),
      count: r.failedRows,
      examples: r.failedValues,
      description: `${DIM_LABEL[r.dimension]}：${r.message}`,
    });
  }
  return issues;
}

/**
 * 定位一张表某字段的数据问题（纯函数）。
 * 对该字段跑完五维检查，返回所有不达标维度的 Issue。
 *
 * @param table   目标表名
 * @param field   目标字段名
 * @param options 待检数据与维度参数（rows 由路由层注入）
 */
export function identifyDataIssues(
  table: string,
  field: string,
  options: ReportOptions = {},
): Issue[] {
  const rows = options.rows ?? [];
  const now = options.now ?? new Date();
  const results: QualityResult[] = [];

  const perDimension: Array<Omit<DataQualityRule, 'rows' | 'dimension'> & { dimension: QualityDimension }> = [
    { dimension: 'completeness', threshold: options.completenessThreshold ?? 95 },
    { dimension: 'uniqueness', pkField: options.pkField ?? field },
    { dimension: 'accuracy', domain: options.accuracyDomain, formatRegex: options.accuracyRegex },
    { dimension: 'consistency', refRows: options.refRows ?? [], refField: options.refField ?? field },
    { dimension: 'timeliness', timeField: options.timeField ?? field, maxAgeHours: 24, now },
  ];

  for (const extra of perDimension) {
    results.push(
      checkDataQuality(table, field, { ...extra, rows } as DataQualityRule),
    );
  }
  return identifyDataIssuesInternal(table, results);
}
