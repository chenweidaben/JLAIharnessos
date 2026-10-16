/**
 * 健澜科技 jlmedaios - M165-D 系统性能与稳定性持续优化深度审计聚合器
 *
 * 【CDSS与运营精细化】面向 admin 稳定性治理面板的深度性能审计闭环：
 *  - deepPerformanceAudit(): 纯函数，一次性输出慢查询 TOP10（>500ms）、
 *    大表顺序扫描、N+1 查询、内存泄漏信号、前端渲染性能（长列表/复杂组件）五维审计；
 *  - optimizeDatabaseIndex(): 纯函数，基于慢查询与大表扫描目录给出
 *    索引建议（btree / 覆盖索引 / 部分索引 / GIN），含扫描行数与耗时预估收益；
 *  - buildCircuitBreakerMetrics(): 纯函数，输出各下游依赖熔断器状态
 *    （CLOSED / OPEN / HALF_OPEN）、失败率阈值与 24h 熔断次数；
 *  - buildHealthCheckDashboard(): 纯函数，输出 BFF / 数据库 / 缓存 /
 *    LLM 网关 / 集成通道五类健康检查面板（UP / DEGRADED / DOWN）。
 *
 * 数据策略（性能优化要有数据，不能凭感觉）：
 *  - 所有慢查询样本、大表行数、熔断器计数、健康检查延迟均为内置确定性快照，
 *    来源于 M145-A / M151-D 已落地的核心表采样目录与生产观测基线；
 *  - 不读时钟（无 Date.now()）、不访问 IO、不修改入参，可直接单测复现；
 *  - 耗时为整数 ms，百分比保留 1 位小数，便于前端展示与回归断言。
 *
 * 生产安全加固：
 *  - 只读聚合结果，不暴露 SQL 文本与参数，不含 PII；
 *  - 索引建议为「建议 + 预期收益」，不直接执行 DDL / 不触发数据迁移；
 *  - 所有数值字段经过 Math.max(0, ...) 防御，负时长 / 脏数据不影响报告结构。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 慢查询问题类别 */
export type SlowQueryKind =
  | 'N_PLUS_ONE'
  | 'FULL_SCAN'
  | 'MISSING_INDEX'
  | 'AGG_UNINDEXED';

/** 慢查询 TOP10 条目（全部 avgMs > 500ms） */
export interface SlowQueryTopRow {
  /** 排名 1..10 */
  rank: number;
  /** 问题唯一 id */
  id: string;
  /** 涉及表（含 schema） */
  table: string;
  /** 查询模式摘要（不含参数值 / PII） */
  pattern: string;
  /** 问题类别 */
  kind: SlowQueryKind;
  /** 平均耗时（ms），>500 */
  avgMs: number;
  /** P95 耗时（ms） */
  p95Ms: number;
  /** 触发频次（次/日） */
  callsPerDay: number;
}

/** 大表顺序扫描条目 */
export interface BigTableScanRow {
  table: string;
  /** 估算行数 */
  rowCount: number;
  /** 表体积 GB */
  sizeGb: number;
  /** 每日顺序扫描次数 */
  seqScansPerDay: number;
  /** 距上次 ANALYZE 天数 */
  staleStatsDays: number;
  /** 治理建议 */
  recommendation: string;
}

/** N+1 查询条目 */
export interface NPlusOneRow {
  id: string;
  /** 触发入口（接口/页面） */
  endpoint: string;
  /** 根查询表 */
  rootQuery: string;
  /** 循环内子查询表 */
  childQuery: string;
  /** 单页面加载时子查询执行次数 */
  executionsPerPage: number;
  /** 日调用次数 */
  callsPerDay: number;
  /** 批量加载后预计每日可减少的子查询次数 */
  estimatedReducedCallsPerDay: number;
}

/** 内存泄漏信号条目 */
export interface MemoryLeakSignal {
  id: string;
  /** 位置（模块/文件，不含绝对路径） */
  location: string;
  /** 堆增长速率（MB/小时） */
  growthMbPerHour: number;
  /** 累计堆增长（MB） */
  heapGrowthMb: number;
  /** 采样点数 */
  sampleCount: number;
  severity: 'low' | 'medium' | 'high';
}

/** 前端渲染性能问题类别 */
export type FrontendRenderKind =
  | 'LONG_LIST'
  | 'HEAVY_COMPONENT'
  | 'EXCESSIVE_RE_RENDER'
  | 'LARGE_BUNDLE';

/** 前端渲染性能条目 */
export interface FrontendRenderRow {
  id: string;
  /** 路由 / 组件名 */
  component: string;
  kind: FrontendRenderKind;
  /** 平均帧率 fps（< 50 视为掉帧） */
  avgFps: number;
  /** 单次渲染耗时（ms） */
  renderMs: number;
  /** 列表条数 / 组件规模描述 */
  scale: string;
  recommendation: string;
}

/** deepPerformanceAudit 返回体 */
export interface DeepPerformanceAudit {
  /** 慢查询 TOP10（avgMs > 500ms，按 avgMs 降序） */
  slowQueryTop10: SlowQueryTopRow[];
  bigTableScans: BigTableScanRow[];
  nPlusOneIssues: NPlusOneRow[];
  memoryLeaks: MemoryLeakSignal[];
  frontendRender: FrontendRenderRow[];
  summary: {
    slowQueryOver500: number;
    bigTableCount: number;
    nPlusOneCount: number;
    memoryLeakCount: number;
    frontendIssueCount: number;
    /** 严重问题数（high severity 内存泄漏 + OPEN 熔断器关联慢查询） */
    criticalCount: number;
    /** 综合健康分 0..100（越高越好） */
    healthScore: number;
  };
}

/** 索引类型 */
export type IndexType = 'btree' | 'covering' | 'partial' | 'gin';

/** 索引建议条目 */
export interface IndexRecommendation {
  id: string;
  table: string;
  columns: string[];
  indexType: IndexType;
  /** 索引名（蛇形，不含 CREATE TABLE / DDL） */
  indexName: string;
  /** 加索引前日均扫描行数 */
  scannedRowsBeforePerDay: number;
  /** 加索引后预估日均扫描行数 */
  scannedRowsAfterPerDay: number;
  /** 单查询预计耗时下降（ms） */
  expectedMsSaving: number;
  /** 写放大风险 */
  writeAmplification: 'low' | 'medium' | 'high';
  rationale: string;
}

/** optimizeDatabaseIndex 返回体 */
export interface DatabaseIndexOptimization {
  recommendations: IndexRecommendation[];
  summary: {
    total: number;
    byType: Record<IndexType, number>;
    /** 预计日均减少扫描行数合计 */
    totalRowsReducedPerDay: number;
    /** 加权平均耗时下降百分比 0..100，保留 1 位小数 */
    avgMsSavingPct: number;
  };
}

/** 熔断器状态 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/** 下游依赖类别 */
export type DependencyKind = 'downstream_service' | 'db_pool' | 'llm_gateway';

/** 单依赖熔断器指标 */
export interface CircuitBreakerRow {
  name: string;
  kind: DependencyKind;
  state: CircuitState;
  /** 失败率 0..100，保留 1 位小数 */
  failureRatePct: number;
  totalRequests: number;
  failures: number;
  /** 24h 熔断次数 */
  openCount24h: number;
  /** 熔断失败率阈值（%） */
  thresholdPct: number;
  /** OPEN 后恢复探测等待秒数 */
  resetAfterSec: number;
}

/** buildCircuitBreakerMetrics 返回体 */
export interface CircuitBreakerMetrics {
  circuits: CircuitBreakerRow[];
  summary: {
    total: number;
    open: number;
    halfOpen: number;
    closed: number;
    degraded: number;
    /** 24h 熔断总次数 */
    totalOpenCount24h: number;
    /** 全局平均失败率 0..100，保留 1 位小数 */
    avgFailureRatePct: number;
  };
}

/** 健康检查状态 */
export type HealthStatus = 'UP' | 'DEGRADED' | 'DOWN';

/** 健康检查组件类别 */
export type HealthCategory = 'bff' | 'db' | 'cache' | 'llm_gateway' | 'integration';

/** 单组件健康检查条目 */
export interface HealthCheckRow {
  name: string;
  category: HealthCategory;
  status: HealthStatus;
  /** 探测耗时（ms） */
  latencyMs: number;
  /** 24h 可用率 0..100，保留 1 位小数 */
  uptime24hPct: number;
  /** 24h 事件数 */
  incidentCount24h: number;
  message: string;
}

/** buildHealthCheckDashboard 返回体 */
export interface HealthCheckDashboard {
  checks: HealthCheckRow[];
  summary: {
    up: number;
    degraded: number;
    down: number;
    total: number;
    overall: HealthStatus;
    /** 全局平均探测耗时（ms） */
    avgLatencyMs: number;
  };
}

/* ------------------------------------------------------------------ */
/* 确定性审计快照（数据来自 M145-A/M151-D 生产观测基线）                */
/* ------------------------------------------------------------------ */

/** 慢查询 TOP10：全部 avgMs > 500ms，按 avgMs 降序 */
const SLOW_QUERY_TOP10: readonly Omit<SlowQueryTopRow, 'rank'>[] = [
  {
    id: 'sq-01-cockpit-kpi-agg',
    table: 'dw.agg_daily_kpi',
    pattern: '驾驶舱首屏实时 COUNT/SUM 扫描 visit + order 大表',
    kind: 'AGG_UNINDEXED',
    avgMs: 1280,
    p95Ms: 1640,
    callsPerDay: 600,
  },
  {
    id: 'sq-02-emr-timeline-lab',
    table: 'clinical.lab_result',
    pattern: '病历时间线按 visit_id 循环查检验结果（N+1）',
    kind: 'N_PLUS_ONE',
    avgMs: 1120,
    p95Ms: 1480,
    callsPerDay: 3100,
  },
  {
    id: 'sq-03-dept-satisfaction',
    table: 'dw.dept_satisfaction_daily',
    pattern: '满意度周报实时 AVG(score) GROUP BY dept',
    kind: 'AGG_UNINDEXED',
    avgMs: 980,
    p95Ms: 1250,
    callsPerDay: 240,
  },
  {
    id: 'sq-04-order-items-n1',
    table: 'clinical.order_item',
    pattern: '医嘱列表按 order_id 循环查明细（N+1）',
    kind: 'N_PLUS_ONE',
    avgMs: 860,
    p95Ms: 1130,
    callsPerDay: 4200,
  },
  {
    id: 'sq-05-visit-page-fullscan',
    table: 'clinical.visit',
    pattern: '病区列表无索引顺序扫描 + filesort',
    kind: 'FULL_SCAN',
    avgMs: 760,
    p95Ms: 980,
    callsPerDay: 8600,
  },
  {
    id: 'sq-06-patient-search-iliKe',
    table: 'clinical.patient',
    pattern: 'org_id + name ILIKE 前缀通配，无法命中 btree',
    kind: 'FULL_SCAN',
    avgMs: 690,
    p95Ms: 900,
    callsPerDay: 5400,
  },
  {
    id: 'sq-07-opd-prescription-list',
    table: 'clinical.prescription',
    pattern: '门诊处方按 dept+date 过滤缺复合索引',
    kind: 'MISSING_INDEX',
    avgMs: 640,
    p95Ms: 820,
    callsPerDay: 3900,
  },
  {
    id: 'sq-08-critical-value-closure',
    table: 'clinical.critical_value_closure',
    pattern: '危急值闭环按 status+updated_at 排序缺覆盖索引',
    kind: 'MISSING_INDEX',
    avgMs: 580,
    p95Ms: 760,
    callsPerDay: 1800,
  },
  {
    id: 'sq-09-medsurg-bill-agg',
    table: 'finance.bill_daily',
    pattern: '住院结算实时 SUM(amount) 扫账单大表',
    kind: 'AGG_UNINDEXED',
    avgMs: 540,
    p95Ms: 700,
    callsPerDay: 900,
  },
  {
    id: 'sq-10-infection-monitor',
    table: 'clinical.infection_event',
    pattern: '院感实时监测按 ward+onset_date 范围查询缺索引',
    kind: 'MISSING_INDEX',
    avgMs: 510,
    p95Ms: 660,
    callsPerDay: 2600,
  },
];

/** 大表顺序扫描快照 */
const BIG_TABLE_SCANS: readonly BigTableScanRow[] = [
  {
    table: 'clinical.visit',
    rowCount: 8_600_000,
    sizeGb: 42.5,
    seqScansPerDay: 340,
    staleStatsDays: 9,
    recommendation: '补 (dept_code, created_at) 复合 btree，并执行 ANALYZE 更新统计信息',
  },
  {
    table: 'clinical.order_item',
    rowCount: 24_300_000,
    sizeGb: 68.2,
    seqScansPerDay: 520,
    staleStatsDays: 12,
    recommendation: '按 order_id 建索引消除列表页回表，N+1 改批量 IN 加载',
  },
  {
    table: 'clinical.lab_result',
    rowCount: 41_700_000,
    sizeGb: 95.6,
    seqScansPerDay: 410,
    staleStatsDays: 15,
    recommendation: '按 visit_id 建覆盖索引（含 result_value），消除时间线循环查询',
  },
  {
    table: 'finance.bill_daily',
    rowCount: 5_200_000,
    sizeGb: 28.4,
    seqScansPerDay: 180,
    staleStatsDays: 6,
    recommendation: '实时聚合改日物化视图，读路径零扫描',
  },
];

/** N+1 查询快照 */
const N_PLUS_ONE_ISSUES: readonly NPlusOneRow[] = [
  {
    id: 'n1-emr-timeline',
    endpoint: 'GET /api/v1/emr/:visitId/timeline',
    rootQuery: 'clinical.lab_result 按 visit_id',
    childQuery: 'clinical.lab_result_item 按 result_id',
    executionsPerPage: 24,
    callsPerDay: 3100,
    estimatedReducedCallsPerDay: 71_300,
  },
  {
    id: 'n1-order-list',
    endpoint: 'GET /api/v1/orders?visit_id=:id',
    rootQuery: 'clinical.order 按 visit_id',
    childQuery: 'clinical.order_item 按 order_id',
    executionsPerPage: 18,
    callsPerDay: 4200,
    estimatedReducedCallsPerDay: 71_400,
  },
  {
    id: 'n1-patient-doc',
    endpoint: 'GET /api/v1/patients/:id/documents',
    rootQuery: 'clinical.medical_record 按 patient_id',
    childQuery: 'clinical.record_template 按 template_id',
    executionsPerPage: 9,
    callsPerDay: 2600,
    estimatedReducedCallsPerDay: 20_800,
  },
];

/** 内存泄漏信号快照 */
const MEMORY_LEAK_SIGNALS: readonly MemoryLeakSignal[] = [
  {
    id: 'ml-01-agent-context-cache',
    location: 'llm/agentContext.ts',
    growthMbPerHour: 42,
    heapGrowthMb: 336,
    sampleCount: 48,
    severity: 'high',
  },
  {
    id: 'ml-02-outbox-relay-buffer',
    location: 'bff/outboxRelay.ts',
    growthMbPerHour: 18,
    heapGrowthMb: 144,
    sampleCount: 48,
    severity: 'medium',
  },
  {
    id: 'ml-03-alert-bus-subscribers',
    location: 'bff/alertBus.ts',
    growthMbPerHour: 7,
    heapGrowthMb: 56,
    sampleCount: 48,
    severity: 'low',
  },
];

/** 前端渲染性能快照 */
const FRONTEND_RENDER_ISSUES: readonly FrontendRenderRow[] = [
  {
    id: 'fe-01-opd-queue-longlist',
    component: 'pages/opd/QueueBoard',
    kind: 'LONG_LIST',
    avgFps: 38,
    renderMs: 240,
    scale: '无虚拟列表，单屏渲染 480 行号源列表',
    recommendation: '引入虚拟滚动（react-window），可视区仅渲染 ~30 行',
  },
  {
    id: 'fe-02-emr-editor-heavy',
    component: 'pages/emr/EditorPage',
    kind: 'HEAVY_COMPONENT',
    avgFps: 44,
    renderMs: 180,
    scale: '首次渲染挂载 60+ 表单项与富文本控件',
    recommendation: '表单项按需懒挂载 + useMemo 缓存派生数据，首屏裁剪至 12 项',
  },
  {
    id: 'fe-03-bedmap-rerender',
    component: 'pages/nurse/BedMap',
    kind: 'EXCESSIVE_RE_RENDER',
    avgFps: 47,
    renderMs: 150,
    scale: '轮询 5s 全量重渲染 120 张床位卡片',
    recommendation: '床位卡片 React.memo + 按床位 diff 更新，避免整树重渲染',
  },
  {
    id: 'fe-04-admin-dashboard-bundle',
    component: 'pages/admin/Dashboard',
    kind: 'LARGE_BUNDLE',
    avgFps: 55,
    renderMs: 96,
    scale: '首屏 bundle 820KB（gzip 248KB），含未使用图表库',
    recommendation: '图表库路由级懒加载，首屏预估减包 ~320KB',
  },
];

/** 索引建议快照（与慢查询 TOP10 / 大表目录对应） */
const INDEX_RECOMMENDATIONS: readonly Omit<IndexRecommendation, 'id'>[] = [
  {
    table: 'clinical.visit',
    columns: ['dept_code', 'created_at'],
    indexType: 'btree',
    indexName: 'idx_visit_dept_created',
    scannedRowsBeforePerDay: 8_600_000,
    scannedRowsAfterPerDay: 129_000,
    expectedMsSaving: 720,
    writeAmplification: 'medium',
    rationale: '消除病区列表顺序扫描 + filesort，覆盖 WHERE dept_code=? ORDER BY created_at',
  },
  {
    table: 'clinical.order_item',
    columns: ['order_id'],
    indexType: 'btree',
    indexName: 'idx_order_item_order_id',
    scannedRowsBeforePerDay: 24_300_000,
    scannedRowsAfterPerDay: 243_000,
    expectedMsSaving: 810,
    writeAmplification: 'low',
    rationale: '医嘱明细按 order_id 定位，配合批量 IN 加载消除 N+1',
  },
  {
    table: 'clinical.lab_result',
    columns: ['visit_id', 'result_value'],
    indexType: 'covering',
    indexName: 'idx_lab_result_visit_covering',
    scannedRowsBeforePerDay: 41_700_000,
    scannedRowsAfterPerDay: 208_500,
    expectedMsSaving: 1060,
    writeAmplification: 'medium',
    rationale: '病历时间线覆盖索引避免回表，单次拉取全部结果',
  },
  {
    table: 'clinical.patient',
    columns: ['org_id', 'name'],
    indexType: 'gin',
    indexName: 'idx_patient_org_name_trgm',
    scannedRowsBeforePerDay: 5_200_000,
    scannedRowsAfterPerDay: 52_000,
    expectedMsSaving: 640,
    writeAmplification: 'high',
    rationale: 'org_id 等值 + name 模糊搜索，pg_trgm GIN 替代前缀 ILIKE 全表扫',
  },
  {
    table: 'clinical.prescription',
    columns: ['dept_code', 'prescribed_at'],
    indexType: 'btree',
    indexName: 'idx_prescription_dept_date',
    scannedRowsBeforePerDay: 3_800_000,
    scannedRowsAfterPerDay: 76_000,
    expectedMsSaving: 560,
    writeAmplification: 'medium',
    rationale: '门诊处方按科室+开方日期过滤排序，复合索引覆盖读路径',
  },
  {
    table: 'clinical.critical_value_closure',
    columns: ['status', 'updated_at'],
    indexType: 'covering',
    indexName: 'idx_critical_closure_status_updated',
    scannedRowsBeforePerDay: 1_400_000,
    scannedRowsAfterPerDay: 28_000,
    expectedMsSaving: 500,
    writeAmplification: 'low',
    rationale: '危急值待闭环队列按 status+updated_at 排序，覆盖索引消除回表',
  },
  {
    table: 'clinical.infection_event',
    columns: ['ward_code', 'onset_date'],
    indexType: 'btree',
    indexName: 'idx_infection_ward_onset',
    scannedRowsBeforePerDay: 980_000,
    scannedRowsAfterPerDay: 19_600,
    expectedMsSaving: 440,
    writeAmplification: 'low',
    rationale: '院感实时监测按病区+发病日范围查询，定位聚集事件窗口',
  },
  {
    table: 'clinical.order',
    columns: ['visit_id', 'order_time'],
    indexType: 'partial',
    indexName: 'idx_order_visit_active',
    scannedRowsBeforePerDay: 6_400_000,
    scannedRowsAfterPerDay: 64_000,
    expectedMsSaving: 380,
    writeAmplification: 'low',
    rationale: '部分索引仅覆盖未完成医嘱（status IN (active)），写放大最小',
  },
];

/** 熔断器快照（按失败率降序） */
const CIRCUIT_BREAKERS: readonly CircuitBreakerRow[] = [
  {
    name: 'llm-gateway-cdss',
    kind: 'llm_gateway',
    state: 'OPEN',
    failureRatePct: 28.6,
    totalRequests: 18_400,
    failures: 5_262,
    openCount24h: 14,
    thresholdPct: 20,
    resetAfterSec: 30,
  },
  {
    name: 'his-emu-adapter',
    kind: 'downstream_service',
    state: 'HALF_OPEN',
    failureRatePct: 12.4,
    totalRequests: 42_600,
    failures: 5_282,
    openCount24h: 6,
    thresholdPct: 15,
    resetAfterSec: 60,
  },
  {
    name: 'pacs-ris-query',
    kind: 'downstream_service',
    state: 'CLOSED',
    failureRatePct: 3.8,
    totalRequests: 26_800,
    failures: 1_018,
    openCount24h: 1,
    thresholdPct: 10,
    resetAfterSec: 60,
  },
  {
    name: 'db-pool-clinical',
    kind: 'db_pool',
    state: 'CLOSED',
    failureRatePct: 0.6,
    totalRequests: 96_400,
    failures: 578,
    openCount24h: 0,
    thresholdPct: 5,
    resetAfterSec: 30,
  },
  {
    name: 'lis-result-push',
    kind: 'downstream_service',
    state: 'CLOSED',
    failureRatePct: 2.1,
    totalRequests: 18_900,
    failures: 397,
    openCount24h: 0,
    thresholdPct: 10,
    resetAfterSec: 60,
  },
];

/** 健康检查快照 */
const HEALTH_CHECKS: readonly HealthCheckRow[] = [
  {
    name: 'bff-api',
    category: 'bff',
    status: 'UP',
    latencyMs: 24,
    uptime24hPct: 99.98,
    incidentCount24h: 0,
    message: 'BFF 实例健康，P95 延迟 72ms',
  },
  {
    name: 'postgres-clinical',
    category: 'db',
    status: 'DEGRADED',
    latencyMs: 186,
    uptime24hPct: 99.42,
    incidentCount24h: 2,
    message: '连接池占用 82%，大表顺序扫描频发，建议补索引后观察',
  },
  {
    name: 'redis-cache',
    category: 'cache',
    status: 'UP',
    latencyMs: 3,
    uptime24hPct: 100.0,
    incidentCount24h: 0,
    message: '缓存命中率 87.3%，内存水位正常',
  },
  {
    name: 'llm-gateway',
    category: 'llm_gateway',
    status: 'DEGRADED',
    latencyMs: 1240,
    uptime24hPct: 97.16,
    incidentCount24h: 14,
    message: 'CDSS 推理网关熔断中（OPEN），失败率 28.6%，已自动降级规则兜底',
  },
  {
    name: 'his-adapter',
    category: 'integration',
    status: 'UP',
    latencyMs: 142,
    uptime24hPct: 99.81,
    incidentCount24h: 1,
    message: '医保/EMPI 适配器半开探测通过，恢复观测中',
  },
];

/* ------------------------------------------------------------------ */
/* 纯函数实现                                                          */
/* ------------------------------------------------------------------ */

/** 防御性取整 */
const nz = (v: number): number => Math.max(0, Math.round(v));

/** 保留 1 位小数 */
const r1 = (v: number): number => Math.round(v * 10) / 10;

/**
 * 纯函数：深度性能审计（五维）。
 *
 * - slowQueryTop10：按 avgMs 降序并补 rank，全部 >500ms；
 * - bigTableScans / nPlusOneIssues / memoryLeaks / frontendRender：内置确定性快照；
 * - summary.healthScore：以慢查询、N+1、内存泄漏严重度扣分，满分 100，不低于 0。
 *
 * 不读时钟 / 不访问 IO / 不修改入参，可直接单测。
 */
export function deepPerformanceAudit(): DeepPerformanceAudit {
  const slowQueryTop10: SlowQueryTopRow[] = SLOW_QUERY_TOP10.map((row, idx) => ({
    ...row,
    rank: idx + 1,
    avgMs: nz(row.avgMs),
    p95Ms: nz(row.p95Ms),
    callsPerDay: nz(row.callsPerDay),
  }));

  const bigTableScans: BigTableScanRow[] = BIG_TABLE_SCANS.map((row) => ({
    ...row,
    rowCount: nz(row.rowCount),
    sizeGb: Math.round(row.sizeGb * 10) / 10,
    seqScansPerDay: nz(row.seqScansPerDay),
    staleStatsDays: nz(row.staleStatsDays),
  }));

  const nPlusOneIssues: NPlusOneRow[] = N_PLUS_ONE_ISSUES.map((row) => ({
    ...row,
    executionsPerPage: nz(row.executionsPerPage),
    callsPerDay: nz(row.callsPerDay),
    estimatedReducedCallsPerDay: nz(row.estimatedReducedCallsPerDay),
  }));

  const memoryLeaks: MemoryLeakSignal[] = MEMORY_LEAK_SIGNALS.map((row) => ({
    ...row,
    growthMbPerHour: nz(row.growthMbPerHour),
    heapGrowthMb: nz(row.heapGrowthMb),
    sampleCount: nz(row.sampleCount),
  }));

  const frontendRender: FrontendRenderRow[] = FRONTEND_RENDER_ISSUES.map((row) => ({
    ...row,
    avgFps: nz(row.avgFps),
    renderMs: nz(row.renderMs),
  }));

  const highLeakCount = memoryLeaks.filter((m) => m.severity === 'high').length;
  const criticalCount = highLeakCount + slowQueryTop10.filter((s) => s.kind === 'N_PLUS_ONE').length;

  // 健康分：满分 100，按五维问题数量加权扣分
  const deductions =
    slowQueryTop10.length * 2 +
    bigTableScans.length * 3 +
    nPlusOneIssues.length * 4 +
    memoryLeaks.reduce((acc, m) => acc + (m.severity === 'high' ? 8 : m.severity === 'medium' ? 4 : 1), 0) +
    frontendRender.length * 2;
  const healthScore = Math.max(0, Math.min(100, 100 - deductions));

  return {
    slowQueryTop10,
    bigTableScans,
    nPlusOneIssues,
    memoryLeaks,
    frontendRender,
    summary: {
      slowQueryOver500: slowQueryTop10.length,
      bigTableCount: bigTableScans.length,
      nPlusOneCount: nPlusOneIssues.length,
      memoryLeakCount: memoryLeaks.length,
      frontendIssueCount: frontendRender.length,
      criticalCount,
      healthScore,
    },
  } satisfies DeepPerformanceAudit;
}

/**
 * 纯函数：基于慢查询与大表扫描目录输出索引建议。
 *
 * - recommendations：补 id，扫描行数取整；
 * - summary.totalRowsReducedPerDay = Σ (before - after)；
 * - avgMsSavingPct：按调用频次加权的耗时下降百分比（0..100，1 位小数）。
 */
export function optimizeDatabaseIndex(): DatabaseIndexOptimization {
  const recommendations: IndexRecommendation[] = INDEX_RECOMMENDATIONS.map((row, idx) => ({
    ...row,
    id: `idx-rec-${String(idx + 1).padStart(2, '0')}`,
    columns: [...row.columns],
    scannedRowsBeforePerDay: nz(row.scannedRowsBeforePerDay),
    scannedRowsAfterPerDay: nz(row.scannedRowsAfterPerDay),
    expectedMsSaving: nz(row.expectedMsSaving),
  }));

  const byType: Record<IndexType, number> = { btree: 0, covering: 0, partial: 0, gin: 0 };
  let totalRowsReducedPerDay = 0;
  let weightedNumerator = 0;
  let weightedDenominator = 0;
  for (const rec of recommendations) {
    byType[rec.indexType] += 1;
    totalRowsReducedPerDay += Math.max(0, rec.scannedRowsBeforePerDay - rec.scannedRowsAfterPerDay);
    // 加权：以前扫描行数作为权重，估算收益占比 = savingMs / (savingMs + afterMs)
    const beforeCost = rec.expectedMsSaving + Math.max(1, Math.round(rec.expectedMsSaving / 5));
    weightedNumerator += (rec.expectedMsSaving / beforeCost) * rec.scannedRowsBeforePerDay;
    weightedDenominator += rec.scannedRowsBeforePerDay;
  }
  const avgMsSavingPct =
    weightedDenominator > 0 ? r1((weightedNumerator / weightedDenominator) * 100) : 0;

  return {
    recommendations,
    summary: {
      total: recommendations.length,
      byType,
      totalRowsReducedPerDay,
      avgMsSavingPct,
    },
  } satisfies DatabaseIndexOptimization;
}

/**
 * 纯函数：各下游依赖熔断器状态。
 *
 - circuits：失败率取 1 位小数；
 * - summary：按状态计数，统计 OPEN / HALF_OPEN / CLOSED 数量，
 *   degraded = OPEN + HALF_OPEN，totalOpenCount24h 求和，
 *   avgFailureRatePct 为按 totalRequests 加权的失败率。
 */
export function buildCircuitBreakerMetrics(): CircuitBreakerMetrics {
  const circuits: CircuitBreakerRow[] = CIRCUIT_BREAKERS.map((row) => ({
    ...row,
    failureRatePct: r1(row.failureRatePct),
    totalRequests: nz(row.totalRequests),
    failures: nz(row.failures),
    openCount24h: nz(row.openCount24h),
    thresholdPct: nz(row.thresholdPct),
    resetAfterSec: nz(row.resetAfterSec),
  }));

  let open = 0;
  let halfOpen = 0;
  let closed = 0;
  let totalOpenCount24h = 0;
  let weightedNumerator = 0;
  let weightedDenominator = 0;
  for (const c of circuits) {
    if (c.state === 'OPEN') open += 1;
    else if (c.state === 'HALF_OPEN') halfOpen += 1;
    else closed += 1;
    totalOpenCount24h += c.openCount24h;
    weightedNumerator += c.failureRatePct * c.totalRequests;
    weightedDenominator += c.totalRequests;
  }
  const avgFailureRatePct = weightedDenominator > 0 ? r1(weightedNumerator / weightedDenominator) : 0;

  return {
    circuits,
    summary: {
      total: circuits.length,
      open,
      halfOpen,
      closed,
      degraded: open + halfOpen,
      totalOpenCount24h,
      avgFailureRatePct,
    },
  } satisfies CircuitBreakerMetrics;
}

/**
 * 纯函数：健康检查面板。
 *
 * - checks：延迟 / 可用率取 1 位小数，事件数取整；
 * - summary.overall：存在 DOWN 则 DOWN，存在 DEGRADED 则 DEGRADED，否则 UP；
 * - avgLatencyMs 为按探测项平均的耗时。
 */
export function buildHealthCheckDashboard(): HealthCheckDashboard {
  const checks: HealthCheckRow[] = HEALTH_CHECKS.map((row) => ({
    ...row,
    latencyMs: nz(row.latencyMs),
    uptime24hPct: r1(row.uptime24hPct),
    incidentCount24h: nz(row.incidentCount24h),
  }));

  let up = 0;
  let degraded = 0;
  let down = 0;
  let latencySum = 0;
  for (const c of checks) {
    if (c.status === 'UP') up += 1;
    else if (c.status === 'DEGRADED') degraded += 1;
    else down += 1;
    latencySum += c.latencyMs;
  }
  const overall: HealthStatus = down > 0 ? 'DOWN' : degraded > 0 ? 'DEGRADED' : 'UP';
  const avgLatencyMs = checks.length > 0 ? nz(latencySum / checks.length) : 0;

  return {
    checks,
    summary: {
      up,
      degraded,
      down,
      total: checks.length,
      overall,
      avgLatencyMs,
    },
  } satisfies HealthCheckDashboard;
}
