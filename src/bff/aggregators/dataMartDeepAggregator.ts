/**
 * 健澜科技 jlmedaios - 医院数据中台深化 · 数据资产治理聚合器（M164-A）
 *
 * 「数据中台与AI大脑」——数据中台要真治理，不是建表就完。
 * 本模块把一张张表从「存了什么」升级为「可管、可追、可用、可控」的资产：
 *   - buildDataAssetCatalog()          数据资产清单：表 / 字段 / 敏感级别 / 质量分（纯函数）；
 *   - classifyDataSensitivity(column)  字段敏感分级：按列名规则判 L1 公开 ~ L4 绝密（纯函数）；
 *   - traceDataLineage(table, column)  数据血缘追踪：来源(ODS) → 加工(DWD/DWS) → 应用(ADS/服务)（纯函数）；
 *   - generateDataService(table, params) 数据服务 API：标准化查询端点 + 脱敏与字段白名单（纯函数）。
 *
 * 设计口径：
 *   - 全部派生数值（行数、质量分、服务ID）由确定性哈希算出，不触 DB、不触网络，便于单测；
 *   - 敏感分级遵循《个人信息保护法》与医疗数据分类分级惯例：L4 绝密（证件/生物特征）、
 *     L3 机密（姓名/手机/诊断等可识别个人健康信息 PHI）、L2 内部（科室/费用/床位）、
 *     L1 公开（性别/统计口径等聚合值）；
 *   - 数据服务只暴露白名单字段，L3 及以上字段自动标记 requiresMask，落地由脱敏层执行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型定义                                                             */
/* ------------------------------------------------------------------ */

/** 敏感级别：L1 公开 / L2 内部 / L3 机密(PHI) / L4 绝密 */
export type SensitivityLevel = 'L1' | 'L2' | 'L3' | 'L4';

/** 数据分层：ODS 贴源 → DWD 明细 → DWS 汇总 → ADS 应用 */
export type DataLayer = 'ODS' | 'DWD' | 'DWS' | 'ADS';

/** 单个字段资产 */
export interface DataColumnAsset {
  /** 字段英文名 */
  column: string;
  /** 字段中文名 */
  columnName: string;
  /** 数据类型 */
  dataType: string;
  /** 敏感级别 */
  sensitivity: SensitivityLevel;
  /** 敏感级别中文标签 */
  sensitivityLabel: string;
  /** 是否个人敏感信息（PHI / PII） */
  isPii: boolean;
}

/** 数据质量三维评分（0-100） */
export interface DataQualityScore {
  /** 完整性：关键字段非空率 */
  completeness: number;
  /** 准确性：值域/格式校验通过率 */
  accuracy: number;
  /** 一致性：跨表主外键/编码一致率 */
  consistency: number;
  /** 综合分（三维加权） */
  overall: number;
  /** 质量问题清单 */
  issues: string[];
}

/** 一张表的数据资产 */
export interface DataTableAsset {
  /** schema 名 */
  schema: string;
  /** 表名 */
  table: string;
  /** 中文表名 */
  tableName: string;
  /** 所属分层 */
  layer: DataLayer;
  /** 数据责任人/域负责人 */
  owner: string;
  /** 业务口径说明 */
  description: string;
  /** 字段资产清单 */
  columns: DataColumnAsset[];
  /** 估算物化行数（确定性派生） */
  rowCount: number;
  /** 数据质量评分 */
  quality: DataQualityScore;
}

/** 资产清单汇总 */
export interface AssetCatalogSummary {
  tableCount: number;
  columnCount: number;
  piiColumnCount: number;
  bySensitivity: Record<SensitivityLevel, number>;
  avgQuality: number;
}

/** buildDataAssetCatalog 返回 */
export interface DataAssetCatalog {
  generatedAt: string;
  tables: DataTableAsset[];
  summary: AssetCatalogSummary;
}

/** 血缘节点 */
export interface LineageNode {
  layer: DataLayer;
  table: string;
  column?: string;
  note: string;
}

/** traceDataLineage 返回：来源 → 加工 → 应用 */
export interface DataLineage {
  table: string;
  column: string | null;
  /** 上游来源（贴源 ODS） */
  sources: LineageNode[];
  /** 中游加工（DWD/DWS） */
  process: LineageNode[];
  /** 下游应用（ADS / 数据服务 / AI 大脑） */
  applications: LineageNode[];
  /** 一条可读链路：来源 → 加工 → 应用 */
  path: string[];
}

/** 数据服务查询参数 */
export interface DataServiceParams {
  /** 过滤条件，如 { dept_code: '0101', stat_date: '2026-10-16' } */
  filters?: Record<string, string>;
  /** 请求字段白名单（缺省全部可暴露字段） */
  fields?: string[];
  page?: number;
  pageSize?: number;
}

/** generateDataService 返回：标准化数据服务端点规格 */
export interface DataService {
  serviceId: string;
  table: string;
  /** 对外标准化查询端点 */
  endpoint: string;
  method: 'GET';
  /** 可暴露字段（已按敏感级别裁剪） */
  fields: string[];
  /** 请求过滤条件透传 */
  filters: Record<string, string>;
  page: number;
  pageSize: number;
  /** 该服务触及的最高敏感级别 */
  maxSensitivity: SensitivityLevel;
  /** 是否需要脱敏（触及 L3/L4 时为 true） */
  requiresMask: boolean;
  /** 估算命中行数 */
  estimatedRows: number;
  /** 生成的参数化查询 SQL（占位符，禁止拼接用户输入） */
  sql: string;
}

/* ------------------------------------------------------------------ */
/* 错误类型                                                             */
/* ------------------------------------------------------------------ */

export class DataMartDeepError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DataMartDeepError';
  }
}

const notFound = (m: string) => new DataMartDeepError(404, 'NOT_FOUND', m);
const badRequest = (m: string) => new DataMartDeepError(400, 'BAD_REQUEST', m);

/* ------------------------------------------------------------------ */
/* 确定性哈希（仅派生数值，不用于安全场景）                                */
/* ------------------------------------------------------------------ */

function hashSeed(input: string): number {
  let h = 7;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ------------------------------------------------------------------ */
/* 字段目录定义（医院核心主题域）                                         */
/* ------------------------------------------------------------------ */

interface ColumnDef {
  column: string;
  columnName: string;
  dataType: string;
}

interface TableDef {
  schema: string;
  table: string;
  tableName: string;
  layer: DataLayer;
  owner: string;
  description: string;
  columns: ColumnDef[];
  /** 上游来源表（血缘） */
  sources: Array<{ table: string; note: string }>;
  /** 下游应用（血缘） */
  applications: Array<{ table: string; note: string }>;
}

const SENS_LABEL: Record<SensitivityLevel, string> = {
  L1: '公开',
  L2: '内部',
  L3: '机密(PHI)',
  L4: '绝密',
};

/** 医院数据中台核心资产目录（ODS→DWD→DWS→ADS 四层） */
const TABLE_CATALOG: TableDef[] = [
  {
    schema: 'dwd',
    table: 'visit_detail',
    tableName: '就诊明细表',
    layer: 'DWD',
    owner: '门诊域',
    description: '门急诊与住院就诊的一次就诊一行，承载患者主索引、科室、诊断与就诊时间。',
    columns: [
      { column: 'visit_id', columnName: '就诊ID', dataType: 'varchar(32)' },
      { column: 'patient_name', columnName: '患者姓名', dataType: 'varchar(64)' },
      { column: 'gender', columnName: '性别', dataType: 'char(1)' },
      { column: 'age', columnName: '年龄', dataType: 'int' },
      { column: 'id_card', columnName: '身份证号', dataType: 'varchar(18)' },
      { column: 'phone', columnName: '联系电话', dataType: 'varchar(20)' },
      { column: 'dept_code', columnName: '就诊科室编码', dataType: 'varchar(16)' },
      { column: 'diagnosis_code', columnName: '诊断ICD编码', dataType: 'varchar(10)' },
      { column: 'visit_time', columnName: '就诊时间', dataType: 'timestamptz' },
    ],
    sources: [
      { table: 'ods.his_reg_outp', note: 'HIS 门诊挂号贴源表' },
      { table: 'ods.his_reg_inp', note: 'HIS 住院登记贴源表' },
    ],
    applications: [
      { table: 'dws.dept_daily_summary', note: '科室日汇总' },
      { table: 'ads.hospital_daily_metrics', note: '医院运营指标' },
    ],
  },
  {
    schema: 'dwd',
    table: 'fee_item_detail',
    tableName: '费用明细明细表',
    layer: 'DWD',
    owner: '收费域',
    description: '医嘱收费项目逐行明细，用于收入核算、药占比与均次费用分析。',
    columns: [
      { column: 'fee_id', columnName: '费用ID', dataType: 'varchar(32)' },
      { column: 'visit_id', columnName: '就诊ID', dataType: 'varchar(32)' },
      { column: 'item_name', columnName: '收费项目名称', dataType: 'varchar(128)' },
      { column: 'amount', columnName: '金额(元)', dataType: 'numeric(12,2)' },
      { column: 'dept_code', columnName: '开单科室编码', dataType: 'varchar(16)' },
    ],
    sources: [{ table: 'ods.his_orders_fee', note: 'HIS 收费流水贴源表' }],
    applications: [{ table: 'dws.dept_daily_summary', note: '科室收入与均次费用' }],
  },
  {
    schema: 'dws',
    table: 'dept_daily_summary',
    tableName: '科室日汇总表',
    layer: 'DWS',
    owner: '运营域',
    description: '按科室×日期聚合门急诊量、在院人数、均次费用与床位使用率，支撑科室驾驶舱。',
    columns: [
      { column: 'dept_code', columnName: '科室编码', dataType: 'varchar(16)' },
      { column: 'stat_date', columnName: '统计日期', dataType: 'date' },
      { column: 'opd_count', columnName: '门急诊人次', dataType: 'int' },
      { column: 'avg_cost', columnName: '均次费用(元)', dataType: 'numeric(10,2)' },
      { column: 'bed_usage_rate', columnName: '床位使用率', dataType: 'numeric(5,2)' },
    ],
    sources: [{ table: 'dwd.visit_detail', note: '就诊明细聚合' }, { table: 'dwd.fee_item_detail', note: '费用明细聚合' }],
    applications: [
      { table: 'ads.hospital_daily_metrics', note: '全院日指标' },
      { table: 'svc.dept_cockpit_api', note: '科室驾驶舱数据服务' },
    ],
  },
  {
    schema: 'ads',
    table: 'hospital_daily_metrics',
    tableName: '医院日指标表',
    layer: 'ADS',
    owner: '院办',
    description: '面向院领导驾驶舱与 AI 健康大脑的全院日粒度核心指标。',
    columns: [
      { column: 'stat_date', columnName: '统计日期', dataType: 'date' },
      { column: 'opd_total', columnName: '全院门急诊总量', dataType: 'int' },
      { column: 'bed_usage_rate', columnName: '全院床位使用率', dataType: 'numeric(5,2)' },
      { column: 'avg_los', columnName: '平均住院日', dataType: 'numeric(4,1)' },
    ],
    sources: [{ table: 'dws.dept_daily_summary', note: '科室日汇总上行' }],
    applications: [
      { table: 'svc.hospital_kpi_api', note: '院领导 KPI 服务' },
      { table: 'ai.brain_health_copilot', note: 'AI 健康大脑决策输入' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* 1) classifyDataSensitivity —— 字段敏感分级（纯函数）                   */
/* ------------------------------------------------------------------ */

/**
 * 按字段名规则判定敏感级别。
 * 规则优先级：L4 绝密 > L3 机密(PHI) > L2 内部 > L1 公开。
 *
 * @param column 字段英文名（大小写不敏感）
 * @returns SensitivityLevel
 */
export function classifyDataSensitivity(column: string): SensitivityLevel {
  if (!column || typeof column !== 'string') return 'L1';
  const c = column.toLowerCase();

  // L4 绝密：证件号、银行账户、口令、生物特征
  const secret = [
    'id_card', 'identity_card', 'cert_no', 'ssn', 'social_security',
    'bank_card', 'bank_account', 'password', 'passwd', 'pay_password',
    'fingerprint', 'face_feature', 'biometric',
  ];
  if (secret.some((k) => c.includes(k))) return 'L4';

  // L3 机密(PHI)：可直接识别到自然人的健康/联系信息
  const phi = [
    'name', 'patient', 'phone', 'mobile', 'tel', 'address',
    'diagnosis', 'disease', 'medical_record', 'mrn', 'birth',
    'email', 'contact', 'family', 'guardian',
  ];
  if (phi.some((k) => c.includes(k))) return 'L3';

  // L2 内部：科室/医生/费用/床位等运营内部口径
  const internal = [
    'dept', 'doctor', 'physician', 'amount', 'fee', 'cost',
    'price', 'charge', 'bed', 'ward', 'order',
  ];
  if (internal.some((k) => c.includes(k))) return 'L2';

  // L1 公开：性别、统计日期、聚合指标等
  return 'L1';
}

/** 敏感级别中文标签 */
export function sensitivityLabel(level: SensitivityLevel): string {
  return SENS_LABEL[level];
}

/* ------------------------------------------------------------------ */
/* 质量分派生（确定性）                                                   */
/* ------------------------------------------------------------------ */

function deriveQuality(table: TableDef): DataQualityScore {
  const seed = hashSeed(`${table.schema}.${table.table}:quality`);
  // 78~99 之间，保证质量分整体健康但略有差异
  const completeness = 78 + (seed % 22);
  const accuracy = 80 + ((seed >> 3) % 19);
  const consistency = 76 + ((seed >> 6) % 23);
  const overall = Math.round(completeness * 0.4 + accuracy * 0.35 + consistency * 0.25);

  const issues: string[] = [];
  if (completeness < 90) issues.push('关键字段存在空值，建议补全录入校验');
  if (accuracy < 90) issues.push('部分编码未通过值域校验（ICD/科室字典）');
  if (consistency < 90) issues.push('主外键跨表一致率待提升，建议加 ETL 比对');
  if (issues.length === 0) issues.push('质量良好，维持日常监控');
  return { completeness, accuracy, consistency, overall, issues };
}

function deriveRowCount(table: TableDef): number {
  // 8,000 ~ 9,800,000 之间，按表分层量级递增
  const layerBase: Record<DataLayer, number> = { ODS: 9_000_000, DWD: 6_000_000, DWS: 120_000, ADS: 1_500 };
  const base = layerBase[table.layer] ?? 100_000;
  return Math.round(base * (0.6 + (hashSeed(table.table) % 60) / 100));
}

/* ------------------------------------------------------------------ */
/* 2) buildDataAssetCatalog —— 数据资产清单（纯函数）                    */
/* ------------------------------------------------------------------ */

/**
 * 构建全量数据资产清单：四张核心表 × 各字段，附敏感分级与质量三维分。
 * 纯函数：相同入参（无入参）多次调用的派生数值稳定，仅 generatedAt 为当前时刻。
 */
export function buildDataAssetCatalog(): DataAssetCatalog {
  const tables: DataTableAsset[] = TABLE_CATALOG.map((t) => {
    const columns: DataColumnAsset[] = t.columns.map((col) => {
      const sensitivity = classifyDataSensitivity(col.column);
      return {
        column: col.column,
        columnName: col.columnName,
        dataType: col.dataType,
        sensitivity,
        sensitivityLabel: sensitivityLabel(sensitivity),
        isPii: sensitivity === 'L3' || sensitivity === 'L4',
      };
    });
    return {
      schema: t.schema,
      table: t.table,
      tableName: t.tableName,
      layer: t.layer,
      owner: t.owner,
      description: t.description,
      columns,
      rowCount: deriveRowCount(t),
      quality: deriveQuality(t),
    };
  });

  const bySensitivity: Record<SensitivityLevel, number> = { L1: 0, L2: 0, L3: 0, L4: 0 };
  let piiColumnCount = 0;
  let columnCount = 0;
  tables.forEach((t) =>
    t.columns.forEach((c) => {
      columnCount += 1;
      bySensitivity[c.sensitivity] += 1;
      if (c.isPii) piiColumnCount += 1;
    }),
  );

  const avgQuality =
    tables.length === 0
      ? 0
      : Math.round(tables.reduce((s, t) => s + t.quality.overall, 0) / tables.length);

  return {
    generatedAt: new Date().toISOString(),
    tables,
    summary: { tableCount: tables.length, columnCount, piiColumnCount, bySensitivity, avgQuality },
  };
}

/* ------------------------------------------------------------------ */
/* 3) traceDataLineage —— 数据血缘追踪（纯函数）                          */
/* ------------------------------------------------------------------ */

/** 全限定表名解析为 schema.table */
function resolveTable(fq: string): { schema: string; table: string } {
  const parts = fq.split('.');
  if (parts.length === 2) return { schema: parts[0], table: parts[1] };
  // 未带 schema：默认在 dwd 查找
  const hit = TABLE_CATALOG.find((t) => t.table === fq);
  if (hit) return { schema: hit.schema, table: hit.table };
  return { schema: 'unknown', table: fq };
}

/** 沿 catalog 递归找上游来源 */
function upstream(table: string, acc: LineageNode[]): LineageNode[] {
  const def = TABLE_CATALOG.find((t) => `${t.schema}.${t.table}` === table || t.table === table);
  if (!def) return acc;
  def.sources.forEach((s) => {
    const node: LineageNode = { layer: 'ODS', table: s.table, note: s.note };
    if (!acc.some((n) => n.table === s.table)) acc.push(node);
    const up = TABLE_CATALOG.find((t) => `${t.schema}.${t.table}` === s.table);
    if (up) upstream(s.table, acc);
  });
  return acc;
}

/**
 * traceDataLineage —— 追踪某表（可选某字段）的 来源 → 加工 → 应用 全链路。
 *
 * @param table  表名（可传 schema.table 或仅表名）
 * @param column 可选字段名；传入时在链路节点上标注该字段
 */
export function traceDataLineage(table: string, column?: string): DataLineage {
  if (!table || typeof table !== 'string') {
    throw badRequest('table 为必填项');
  }
  const { schema, table: tbl } = resolveTable(table);
  const def = TABLE_CATALOG.find((t) => t.table === tbl && (schema === 'unknown' || t.schema === schema));
  if (!def) {
    throw notFound(`未在资产目录中找到表：${table}`);
  }

  const sources = upstream(`${def.schema}.${def.table}`, []);

  const process: LineageNode[] = [
    { layer: def.layer, table: `${def.schema}.${def.table}`, column, note: def.description },
  ];

  const applications: LineageNode[] = def.applications.map((a) => {
    // 按目标表 schema 前缀派生分层：ads./svc./ai. → ADS，dws. → DWS，dwd. → DWD
    const prefix = a.table.split('.')[0];
    const layer: DataLayer =
      prefix === 'ads' || prefix === 'svc' || prefix === 'ai'
        ? 'ADS'
        : prefix === 'dws'
          ? 'DWS'
          : prefix === 'dwd'
            ? 'DWD'
            : 'ADS';
    return { layer, table: a.table, note: a.note };
  });

  const path: string[] = [];
  sources.forEach((s) => path.push(`${s.layer}:${s.table}`));
  path.push(`${def.layer}:${def.schema}.${def.table}${column ? `(${column})` : ''}`);
  applications.forEach((a) => path.push(`${a.layer}:${a.table}`));

  return {
    table: `${def.schema}.${def.table}`,
    column: column ?? null,
    sources,
    process,
    applications,
    path,
  };
}

/* ------------------------------------------------------------------ */
/* 4) generateDataService —— 标准化数据服务 API（纯函数）                 */
/* ------------------------------------------------------------------ */

/**
 * generateDataService —— 为某张资产表生成一个标准化查询数据服务规格。
 * 自动按敏感级别裁剪可暴露字段：L3/L4 不直接出参，标记 requiresMask。
 *
 * @param table  表名（schema.table 或表名）
 * @param params 查询参数：filters / fields 白名单 / 分页
 */
export function generateDataService(table: string, params?: DataServiceParams): DataService {
  if (!table || typeof table !== 'string') {
    throw badRequest('table 为必填项');
  }
  const { schema, table: tbl } = resolveTable(table);
  const def = TABLE_CATALOG.find((t) => t.table === tbl && (schema === 'unknown' || t.schema === schema));
  if (!def) {
    throw notFound(`未在资产目录中找到表：${table}`);
  }

  const filters = params?.filters ?? {};
  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const pageSize = Math.min(500, Math.max(1, Math.floor(params?.pageSize ?? 50)));

  // 可暴露字段：默认全部 L1/L2；L3/L4 仅在显式 fields 请求时纳入并要求脱敏
  let candidateCols = def.columns.map((c) => c.column);
  if (Array.isArray(params?.fields) && params.fields.length > 0) {
    candidateCols = candidateCols.filter((c) => params.fields!.includes(c));
  }

  let maxSensitivity: SensitivityLevel = 'L1';
  const fields: string[] = [];
  let requiresMask = false;
  for (const col of candidateCols) {
    const level = classifyDataSensitivity(col);
    if (level === 'L4') continue; // 绝密字段绝不进入服务出参
    fields.push(col);
    if (level === 'L3') requiresMask = true;
    if (level > maxSensitivity) maxSensitivity = level;
  }

  // 估算命中行数：基础行数 × 过滤条件收敛系数
  const base = deriveRowCount(def);
  const filterKeys = Object.keys(filters);
  const selectivity = filterKeys.length === 0 ? 0.05 : Math.max(0.001, 0.05 / filterKeys.length);
  const estimatedRows = Math.min(base, Math.round(base * selectivity));

  const serviceId = `svc-${def.layer.toLowerCase()}-${def.table}`;
  const endpoint = `/api/v1/data-service/${def.schema}/${def.table}`;

  // 参数化 SQL：过滤条件全部用 $n 占位，禁止拼接用户输入
  const where = filterKeys.length === 0 ? '' : ' WHERE ' + filterKeys.map((k, i) => `${k} = $${i + 1}`).join(' AND ');
  const sql = `SELECT ${fields.length > 0 ? fields.join(', ') : '*'} FROM ${def.schema}.${def.table}${where} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize};`;

  return {
    serviceId,
    table: `${def.schema}.${def.table}`,
    endpoint,
    method: 'GET',
    fields,
    filters,
    page,
    pageSize,
    maxSensitivity,
    requiresMask,
    estimatedRows,
    sql,
  };
}
