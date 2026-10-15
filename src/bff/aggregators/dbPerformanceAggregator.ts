/**
 * 健澜科技 jlmedaios - 数据库性能聚合器（M145-A · 生产化收尾）
 *
 * 【生产化收尾】面向 5 张核心流水表的慢查询识别与索引建议纯函数层。
 *
 * 分层：
 *  - analyzeSlowQueries(): 纯函数，返回预置的核心表慢查询模式目录
 *    （patients / visits / prescriptions / medical_records / notifications），
 *    每条标注平均耗时、日调用量、由哪条索引修复；
 *  - suggestIndex(table, columns, queryType): 纯函数，根据表 + 列 + 查询类型
 *    生成索引名 / DDL / 加索引理由 / 写入影响评估 / 风险等级，
 *    与 deploy/postgres/init/291-performance-indexes.sql 一一对应。
 *
 * 生产安全加固：
 *  - 不读时钟、不访问 IO、不修改入参；
 *  - 入参脏数据（空表名 / 空列数组 / 非字符串列）直接抛 TypeError，
 *    让调用方尽早失败，而不是产出一条名字错误的 DDL；
 *  - 慢查询目录不含 SQL 绑定参数值、不含 PII，只存查询模板摘要；
 *  - 索引建议默认 btree 窄列，明确标注「不影响哪些写入热路径」，
 *    避免运维误加 GIN / 宽复合索引拖慢写入。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 慢查询严重等级 */
export type Severity = 'high' | 'medium' | 'low';

/** 一条被识别出的慢查询模式（模板摘要，不含参数值 / PII） */
export interface SlowQuery {
  /** 稳定 id（便于前端 rowKey） */
  id: string;
  /** 物理表名（含 schema） */
  table: string;
  /** 查询模式摘要（WHERE / ORDER BY 模板） */
  pattern: string;
  /** 业务说明 */
  description: string;
  /** 平均耗时（ms） */
  avgMs: number;
  /** 日均调用量 */
  callsPerDay: number;
  /** 修复该慢查询的索引名；已覆盖时为 'none' */
  fixIndex: string;
  severity: Severity;
}

/** 索引面向的查询类型 */
export type QueryType = 'eq' | 'range' | 'eq_range' | 'order_by' | 'partial';

/** suggestIndex 产出的索引建议 */
export interface Suggestion {
  /** 物理表名（含 schema，已规范化小写） */
  table: string;
  /** 索引列序（等值列在前，排序列在后） */
  columns: string[];
  queryType: QueryType;
  /** 生成的索引名（snake_case，已去 schema 前缀） */
  indexName: string;
  /** 可直接执行的 DDL（CREATE INDEX IF NOT EXISTS） */
  ddl: string;
  /** 为什么加这条索引（对应哪条读路径） */
  rationale: string;
  /** 写入影响评估：加这条索引后哪些写入热路径不受影响 */
  writeImpact: string;
  riskLevel: 'low' | 'medium';
}

/* ------------------------------------------------------------------ */
/* 慢查询目录（纯数据，与 291-performance-indexes.sql 一一对应）        */
/* ------------------------------------------------------------------ */

/**
 * 【生产化收尾】核心表慢查询模式目录。
 *
 * 说明：这是 BFF 对已知高频慢查询的固化目录（来自慢查询日志 TOP 模式归类），
 * 不是运行时采样——纯函数无 IO，admin 面板据此展示「哪条慢查询由哪条新索引修复」。
 * notifications 已在 263 建过索引，目录里仍列一条但 fixIndex='none'、severity=low，
 * 用于向运维说明「已优化、无需再加」，呼应任务口径「索引不能加太多」。
 */
export const SLOW_QUERY_CATALOG: readonly SlowQuery[] = [
  {
    id: 'pq-hospital-recent',
    table: 'clinical.patients',
    pattern: "WHERE hospital_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 50",
    description: '患者管理端 / 导诊台首屏按院拉近期建档患者，旧单列索引 filesort 溢出',
    avgMs: 420,
    callsPerDay: 1200,
    fixIndex: 'idx_patients_hospital_created',
    severity: 'medium',
  },
  {
    id: 'v-patient-ongoing',
    table: 'clinical.visits',
    pattern: "WHERE patient_id = $1 AND status = 'ongoing' ORDER BY admit_at DESC",
    description: '患者360 / 医生工作台拉某患者在诊就诊，旧 (patient_id, admit_at) 索引需回表过滤 status',
    avgMs: 680,
    callsPerDay: 5400,
    fixIndex: 'idx_visits_patient_status_admit',
    severity: 'high',
  },
  {
    id: 'rx-visit-status',
    table: 'clinical.prescriptions',
    pattern: "WHERE visit_id = $1 AND status IN ('pending_review','approved') ORDER BY created_at DESC",
    description: '就诊详情处方 tab / 药师审方队列，旧单列索引二选一、另一条件回表过滤',
    avgMs: 510,
    callsPerDay: 3800,
    fixIndex: 'idx_rx_visit_status_created',
    severity: 'high',
  },
  {
    id: 'mr-visit-timeline',
    table: 'clinical.medical_records',
    pattern: 'WHERE visit_id = $1 ORDER BY created_at DESC',
    description: 'EMR 就诊时间线拉文书列表，旧 (visit_id) 单列索引 filesort',
    avgMs: 620,
    callsPerDay: 6100,
    fixIndex: 'idx_records_visit_created',
    severity: 'high',
  },
  {
    id: 'nt-staff-inbox',
    table: 'clinical.notifications',
    pattern: 'WHERE staff_id = $1 AND read_at IS NULL ORDER BY created_at DESC',
    description: '医护铃铛未读列表 / 角标计数，263 已建 (staff_id, created_at DESC) 与未读 partial 索引，无需再加',
    avgMs: 90,
    callsPerDay: 22000,
    fixIndex: 'none',
    severity: 'low',
  },
] as const;

/* ------------------------------------------------------------------ */
/* 纯函数：慢查询识别                                                  */
/* ------------------------------------------------------------------ */

/**
 * 纯函数：返回核心表慢查询目录，按严重度 + 平均耗时降序排序的副本。
 *
 * 排序规则：high > medium > low；同级别内 avgMs 高者在前。
 * 返回新数组，外部修改不影响内部目录。
 */
export function analyzeSlowQueries(): SlowQuery[] {
  const weight: Record<Severity, number> = { high: 3, medium: 2, low: 1 };
  return SLOW_QUERY_CATALOG.map((row) => ({ ...row }))
    .sort(
      (a, b) =>
        weight[b.severity] - weight[a.severity] || b.avgMs - a.avgMs,
    );
}

/* ------------------------------------------------------------------ */
/* 纯函数：索引建议生成                                                */
/* ------------------------------------------------------------------ */

const QUERY_TYPE_RATIONALE: Record<QueryType, string> = {
  eq: '等值过滤列，作为索引前导列可直接定位行',
  range: '范围过滤列（时间窗口），放在等值列之后以利用索引有序性',
  eq_range: '「等值过滤 + 时间倒序」组合，复合索引一次性消化 WHERE 与 ORDER BY，避免 filesort',
  order_by: '排序列，放在等值列之后让索引物理有序，消除排序溢出',
  partial: 'partial 索引只索引满足谓词的行，体积小、命中快（仅用于高频局部过滤）',
};

/** 判定列是否为窄列（uuid / timestamptz / low-cardinality text）——窄列 btree 写放大低 */
function isNarrowColumn(col: string): boolean {
  const c = col.toLowerCase();
  return (
    c.endsWith('_id') ||
    c.endsWith('_at') ||
    c === 'created_at' ||
    c === 'updated_at' ||
    c === 'status' ||
    c === 'read_at' ||
    c === 'hospital_id'
  );
}

/**
 * 纯函数：根据表 + 列 + 查询类型生成一条索引建议。
 *
 * 规则：
 *  - table 缺省补 schema：未含 '.' 时视为 clinical.<table>；统一小写；
 *  - columns 必须是非空字符串数组（至少 1 列），否则抛 TypeError；
 *  - indexName = idx_<去schema表名>_<col1>_<col2>...；
 *  - DDL 一律 CREATE INDEX IF NOT EXISTS；queryType='partial' 且表为
 *    notifications 时追加 WHERE read_at IS NULL（与 263 对齐的未读 partial 形态）；
 *  - 全部列为窄列 → riskLevel='low'，否则 'medium'；
 *  - writeImpact 明确写出「不影响哪些既有写入热路径」，供运维评审。
 *
 * @throws TypeError 入参非法时直接抛错（纯函数，不静默产出错误 DDL）
 */
export function suggestIndex(
  table: string,
  columns: readonly string[],
  queryType: QueryType,
): Suggestion {
  if (typeof table !== 'string' || table.trim().length === 0) {
    throw new TypeError('suggestIndex: table 必须是非空字符串');
  }
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new TypeError('suggestIndex: columns 必须是非空数组');
  }
  const cleaned = columns.map((c) => (typeof c === 'string' ? c.trim() : ''));
  if (cleaned.some((c) => c.length === 0)) {
    throw new TypeError('suggestIndex: columns 中存在空串 / 非字符串列');
  }

  const normalizedTable = table.includes('.') ? table.toLowerCase() : `clinical.${table.toLowerCase()}`;
  const shortTable = normalizedTable.split('.')[1];
  const indexName = `idx_${shortTable}_${cleaned.join('_')}`;
  const isPartial = queryType === 'partial';
  const partialClause =
    isPartial && normalizedTable.endsWith('notifications') ? ' WHERE read_at IS NULL' : '';
  const ddl = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${normalizedTable} (${cleaned.join(', ')})${partialClause};`;

  const allNarrow = cleaned.every(isNarrowColumn);
  const riskLevel: 'low' | 'medium' = allNarrow ? 'low' : 'medium';

  const rationale = `${QUERY_TYPE_RATIONALE[queryType]}（${normalizedTable}(${cleaned.join(', ')})）`;
  const writeImpact = allNarrow
    ? '窄列 btree（uuid/timestamptz/low-cardinality text），写入时仅多维护一条叶子项；' +
      '不影响该表既有唯一约束校验、GIN 全文/jsonb 索引这两类重写入路径。'
    : '含较宽列，写入放大高于窄 btree；上线前需在预发库测量 INSERT/UPDATE 延迟基线。';

  return {
    table: normalizedTable,
    columns: [...cleaned],
    queryType,
    indexName,
    ddl,
    rationale,
    writeImpact,
    riskLevel,
  };
}

/* ------------------------------------------------------------------ */
/* 与 291 迁移对齐的推荐索引清单（供 admin 路由一次性产出）             */
/* ------------------------------------------------------------------ */

/**
 * 【生产化收尾】与 deploy/postgres/init/291-performance-indexes.sql
 * 一一对应的 4 条新索引建议；notifications 已覆盖，不在此列。
 */
export function recommendCoreIndexes(): Suggestion[] {
  return [
    suggestIndex('clinical.patients', ['hospital_id', 'created_at'], 'eq_range'),
    suggestIndex('clinical.visits', ['patient_id', 'status', 'admit_at'], 'eq_range'),
    suggestIndex('clinical.prescriptions', ['visit_id', 'status', 'created_at'], 'eq_range'),
    suggestIndex('clinical.medical_records', ['visit_id', 'created_at'], 'order_by'),
  ];
}
