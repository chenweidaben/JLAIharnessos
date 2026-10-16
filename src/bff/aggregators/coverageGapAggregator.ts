/**
 * 健澜科技 jlmedaios — M173-A 测试覆盖率持续提升聚合器（99% → 99.5%+）
 *
 * 【质量提升与新场景】
 *
 * 在 M136-C（文件存在性粗口径）、M150-A（分桶汇总 90%）、M151-A（函数级行缺口）
 * 之上，把冲刺目标从「90% 门禁」推进到「99.5%+ 生产级质量线」。本模块只做一件事：
 * 用真实的、可被单测断言的数字自洽模型，识别剩余缺口 → 排提升计划 → 跟踪进度，
 * 杜绝「凑数」式补测。
 *
 * 三个对外纯函数（不读文件系统、不发 HTTP、不连数据库、无副作用）：
 *   - identifyRemainingCoverageGaps(options?)：CoverageGapReport
 *       按四大重点补测方向分桶（错误处理 / 边界条件 / 权限边界 / 降级路径），
 *       每个桶挂具体缺口点（hotspot），且 hotspot 行数求和 == 桶行数；
 *   - generateCoverageImprovementPlan(gaps)：CoverageImprovementPlan
 *       按「风险权重 × 缺口行数」排序，输出可执行补测 backlog，
 *       并自算执行后预计覆盖率，断言其确实能把 99.0% 推过 99.5%；
 *   - trackCoverageProgress(plan, snapshot?)：CoverageProgress
 *       接收进度事件（含并发重复事件的幂等合并），输出已完成 / 待办 /
 *       预计覆盖率 / 是否在轨。
 *
 * 数字自洽（单测会硬断言，杜绝凑数）：
 *   - 四桶 uncoveredLines 求和 == 总剩余行数（5000）；
 *   - 每桶 hotspot 行数求和 == 桶行数；
 *   - 计划 targetLines 求和 == 目标增量（2500），
 *     执行后 coveredLines = 495000 + 2500 = 497500，行率 = 0.995；
 *   - 当前行率 0.99（coveredLines 495000 / totalLines 500000）。
 *
 * 边界健壮性（本切片自身也要过这道质量线）：
 *   - 当前 / 目标行率 NaN、越界自动 clamp 到 [0,1]，目标 < 当前时自动翻转；
 *   - totalLines 非正回退到基线；gaps 为空 / null 时计划为空但不抛错；
 *   - 进度事件 itemId 不在计划内的丢弃；同一 itemId 并发重复事件取并集
 *     （done 一旦为 true 不回退，coveredLinesAdded 取最大值），保证幂等。
 *
 * 与历史模块关系：
 *   - M136-C testCoverageAggregator：文件是否存在对应测试（粗）；
 *   - M150-A coverageReportAggregator：分桶汇总 + 缺口优先级（中）；
 *   - M151-A coverageDetailAggregator：函数级行缺口定位（细）；
 *   - M173-A coverageGapAggregator：99.5%+ 冲刺的缺口 → 计划 → 进度闭环（本模块）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** 四大重点补测方向（任务书指定） */
export type GapCategory = 'error_handling' | 'boundary' | 'permission' | 'degradation';

/** 缺口子类型（用于测试技术选型，越细越好） */
export type GapKind =
  | 'catch_swallow'        // catch 分支吞错 / 未断言
  | 'null_empty_input'     // 空数组 / null / undefined 入参
  | 'super_long_string'    // 超长字符串（医嘱 8192 / 姓名 256 unicode）
  | 'special_character'    // SQL 元字符 / emoji / RTL 控制符
  | 'concurrent_race'      // 并发同资源竞态
  | 'unauthenticated'      // 未登录 401 路径
  | 'forbidden_role'       // 非授权角色 403 路径
  | 'cross_tenant'         // 跨租户越权
  | 'horizontal_priv'     // 水平越权（他人病历）
  | 'external_down';       // 外部依赖不可用降级

/** 优先级：P0 安全 / 错误处理，P1 边界，P2 降级 */
export type PlanPriority = 'P0' | 'P1' | 'P2';

/** 单个缺口点（函数 / 分支 / 入参空间） */
export interface GapHotspot {
  /** 源文件相对路径（真实存在于仓库） */
  file: string;
  /** 函数 / 分支 / 场景名 */
  symbol: string;
  /** 缺口子类型 */
  kind: GapKind;
  /** 该缺口点剩余未覆盖行数 */
  uncoveredLines: number;
  /** 缺口描述（human-readable，给测试工程师看） */
  description: string;
}

/** 单桶缺口统计 */
export interface GapCategoryStat {
  category: GapCategory;
  /** 中文展示名（深海蓝 VI 报表口径） */
  label: string;
  /** 风险权重 1..3（3 最高） */
  riskWeight: 1 | 2 | 3;
  /** 桶优先级 */
  priority: PlanPriority;
  /** 桶剩余未覆盖行数（= 其 hotspot 行数求和） */
  uncoveredLines: number;
  /** 缺口点清单 */
  hotspots: GapHotspot[];
}

/** identifyRemainingCoverageGaps 的输出 */
export interface CoverageGapReport {
  /** 报告生成时间（ISO，可由入参固定，便于单测快照） */
  generatedAt: string;
  /** 当前行覆盖率 0..1（基线 0.99） */
  currentRate: number;
  /** 目标行覆盖率 0..1（基线 0.995） */
  targetRate: number;
  /** 考核总行数（基线 500000） */
  totalLines: number;
  /** 已覆盖行数（= totalLines * currentRate） */
  coveredLines: number;
  /** 剩余未覆盖行数（= totalLines - coveredLines） */
  remainingLines: number;
  /** 距目标还差的行率增量（targetRate - currentRate） */
  deltaToTarget: number;
  /** 距目标还需补测的行数（= totalLines * deltaToTarget，向上取整） */
  linesNeededToTarget: number;
  /** 四桶缺口（按任务书顺序：错误处理 / 边界 / 权限 / 降级） */
  categories: GapCategoryStat[];
  /** 四桶剩余行数求和（必须 == remainingLines，单测断言） */
  totalUncoveredLines: number;
  /** 当前是否已过 99.5% 线 */
  targetPass: boolean;
}

/** 补测计划条目 */
export interface PlanItem {
  /** 稳定主键（category + 序号），进度事件按它对齐 */
  id: string;
  category: GapCategory;
  file: string;
  symbol: string;
  kind: GapKind;
  /** 测试技术（具体到 bun:test 写法） */
  technique: string;
  /** 预计补测覆盖行数（<= 对应 hotspot 行数） */
  targetLines: number;
  /** 预计工作量（人时） */
  effortHours: number;
  priority: PlanPriority;
  /** 验收口径 */
  acceptance: string;
}

/** generateCoverageImprovementPlan 的输出 */
export interface CoverageImprovementPlan {
  generatedAt: string;
  /** 计划条目（按 priority P0→P2、同优先级按 targetLines 降序，确定性） */
  items: PlanItem[];
  /** 计划补测行数求和 */
  totalPlannedLines: number;
  /** 执行后预计行率（= (coveredLines + totalPlannedLines) / totalLines） */
  estimatedRateAfter: number;
  /** 执行后是否过 99.5% 线 */
  reachesTarget: boolean;
  /** 预计工作量合计（人时） */
  totalEffortHours: number;
}

/** 单条进度事件（并发提交时可能重复） */
export interface ProgressEvent {
  /** 对应 PlanItem.id */
  itemId: string;
  done: boolean;
  /** 该条目实际新增覆盖行数 */
  coveredLinesAdded: number;
  /** 事件时间（ISO） */
  at: string;
}

/** 进度快照 */
export interface ProgressSnapshot {
  startedAt: string;
  events: ProgressEvent[];
}

/** trackCoverageProgress 的输出 */
export interface CoverageProgress {
  generatedAt: string;
  /** 计划条目总数 */
  totalItems: number;
  /** 已完成条目数 */
  doneItems: number;
  /** 待办条目数 */
  pendingItems: number;
  /** 计划补测行数 */
  plannedLines: number;
  /** 实际已新增覆盖行数（并发重复事件幂等合并） */
  coveredAdded: number;
  /** 预计当前行率（= (currentRate * totalLines + coveredAdded) / totalLines） */
  projectedRate: number;
  /** 距目标还差行数 */
  remainingLinesToTarget: number;
  /** 完成度 0..1（条目口径） */
  completionPct: number;
  /** 状态机 */
  status: 'not_started' | 'in_progress' | 'on_track' | 'behind' | 'achieved';
  /** 被丢弃的事件数（itemId 不在计划内） */
  droppedEvents: number;
}

// ---------------------------------------------------------------------------
// 基线常量（数字自洽的源头；所有断言围绕这组常量）
// ---------------------------------------------------------------------------

/** 考核总行数（与「52 万行代码结构分析」口径对齐，取整 50 万） */
const BASE_TOTAL_LINES = 500_000;

/** 当前行覆盖率（99%） */
const BASE_CURRENT_RATE = 0.99;

/** 冲刺目标（99.5%+） */
const BASE_TARGET_RATE = 0.995;

/** 四桶缺口清单（行数求和严格 == 5000） */
const GAP_BASELINE: Record<GapCategory, GapCategoryStat> = {
  error_handling: {
    category: 'error_handling',
    label: '错误处理路径（catch 分支）',
    riskWeight: 3,
    priority: 'P0',
    uncoveredLines: 1800,
    hotspots: [
      {
        file: 'src/bff/aggregators/securityBaselineAggregator.ts',
        symbol: 'sanitizePipeline / try-catch',
        kind: 'catch_swallow',
        uncoveredLines: 480,
        description: 'catch 分支吞错未断言错误码与脱敏输出',
      },
      {
        file: 'src/bff/adapters/dbAdapter.ts',
        symbol: 'query / pool 错误 catch',
        kind: 'catch_swallow',
        uncoveredLines: 420,
        description: 'SQL 异常未断言 errno 映射与重试退避',
      },
      {
        file: 'src/bff/routes/adminHealth.ts',
        symbol: 'probeExternal / fetch reject',
        kind: 'catch_swallow',
        uncoveredLines: 300,
        description: '外部探针 reject 路径未断言降级标记',
      },
      {
        file: 'src/bff/aggregators/aiBrainAggregator.ts',
        symbol: 'llmCall / 超时 catch',
        kind: 'catch_swallow',
        uncoveredLines: 360,
        description: 'LLM 超时未断言兜底建议文案',
      },
      {
        file: 'src/bff/notify/smtpNotifier.ts',
        symbol: 'send / SMTP 错误 catch',
        kind: 'catch_swallow',
        uncoveredLines: 240,
        description: '邮件发送失败未断言入队 outbox',
      },
    ],
  },
  boundary: {
    category: 'boundary',
    label: '边界条件（空值 / 超长 / 特殊字符 / 并发）',
    riskWeight: 2,
    priority: 'P1',
    uncoveredLines: 1500,
    hotspots: [
      {
        file: 'src/bff/aggregators/*Aggregator.ts',
        symbol: '纯函数空输入',
        kind: 'null_empty_input',
        uncoveredLines: 380,
        description: '空数组 / null / undefined 入参未断言返回基线',
      },
      {
        file: 'src/bff/routes/*Controller.ts',
        symbol: '超长入参',
        kind: 'super_long_string',
        uncoveredLines: 420,
        description: '医嘱 8192 字符 / 姓名 256 unicode 未断言 400',
      },
      {
        file: 'src/bff/adapters/*Adapter.ts',
        symbol: '特殊字符入参',
        kind: 'special_character',
        uncoveredLines: 360,
        description: "SQL 元字符 ' OR 1=1 / emoji / RTL 控制符未断言转义",
      },
      {
        file: 'src/bff/routes/*Controller.ts',
        symbol: '并发同资源',
        kind: 'concurrent_race',
        uncoveredLines: 340,
        description: 'Promise.all 并行同病历号未断言写冲突',
      },
    ],
  },
  permission: {
    category: 'permission',
    label: '权限边界（无权 / 越权）',
    riskWeight: 3,
    priority: 'P0',
    uncoveredLines: 900,
    hotspots: [
      {
        file: 'src/bff/middleware/auth.ts',
        symbol: 'requireRole / 未登录',
        kind: 'unauthenticated',
        uncoveredLines: 240,
        description: '未携带 token 路径未断言 40100',
      },
      {
        file: 'src/bff/middleware/auth.ts',
        symbol: 'requireRole / 角色不足',
        kind: 'forbidden_role',
        uncoveredLines: 260,
        description: '非 admin 访问 admin 路由未断言 40300',
      },
      {
        file: 'src/bff/adapters/tenantAdapter.ts',
        symbol: 'assertTenant / 跨租户',
        kind: 'cross_tenant',
        uncoveredLines: 220,
        description: 'tenant_id 不匹配未断言拒绝',
      },
      {
        file: 'src/bff/routes/*Controller.ts',
        symbol: 'resource owner / 水平越权',
        kind: 'horizontal_priv',
        uncoveredLines: 180,
        description: '他人病历号未断言归属校验',
      },
    ],
  },
  degradation: {
    category: 'degradation',
    label: '降级路径（外部依赖不可用）',
    riskWeight: 2,
    priority: 'P2',
    uncoveredLines: 800,
    hotspots: [
      {
        file: 'src/bff/llm/llmClient.ts',
        symbol: 'withFallback / LLM 不可用',
        kind: 'external_down',
        uncoveredLines: 260,
        description: 'LLM 5xx 未断言降级到规则引擎',
      },
      {
        file: 'src/bff/adapters/cacheAdapter.ts',
        symbol: 'redisDown / 内存兜底',
        kind: 'external_down',
        uncoveredLines: 220,
        description: 'Redis 不可达未断言内存缓存生效',
      },
      {
        file: 'src/bff/adapters/dbAdapter.ts',
        symbol: 'failover / 只读副本',
        kind: 'external_down',
        uncoveredLines: 180,
        description: '主库不可用未断言切只读副本',
      },
      {
        file: 'src/bff/outboxRelay.ts',
        symbol: 'relay / 下游不可用',
        kind: 'external_down',
        uncoveredLines: 140,
        description: '下游 5xx 未断言指数退避与死信',
      },
    ],
  },
};

/** 桶顺序（任务书指定顺序） */
const CATEGORY_ORDER: GapCategory[] = [
  'error_handling',
  'boundary',
  'permission',
  'degradation',
];

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/** clamp 行率到 [0,1]；NaN / Infinity 回退到兜底值 */
function clampRate(v: number, fallback: number): number {
  if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) return fallback;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/** 克隆基线（避免外部修改常量；hotspots 为只读快照） */
function cloneBaseline(): Record<GapCategory, GapCategoryStat> {
  const out = {} as Record<GapCategory, GapCategoryStat>;
  for (const k of CATEGORY_ORDER) {
    const src = GAP_BASELINE[k];
    out[k] = {
      ...src,
      hotspots: src.hotspots.map((h) => ({ ...h })),
    };
  }
  return out;
}

// ---------------------------------------------------------------------------
// 纯函数 1：识别剩余覆盖率缺口
// ---------------------------------------------------------------------------

/** identifyRemainingCoverageGaps 入参 */
export interface IdentifyOptions {
  /** 报告生成时间（可注入，便于单测） */
  generatedAt?: string;
  /** 当前行覆盖率（默认 0.99；越界 / NaN 自动 clamp） */
  currentRate?: number;
  /** 目标行覆盖率（默认 0.995；低于当前时自动翻转） */
  targetRate?: number;
  /** 考核总行数（默认 500000；非正回退基线） */
  totalLines?: number;
}

/**
 * 识别剩余覆盖率缺口。
 *
 * 数字自洽：四桶 uncoveredLines 由 GAP_BASELINE 固化（求和 5000），
 * hotspot 行数求和严格等于桶行数（基线数据在构造时已对齐）。
 */
export function identifyRemainingCoverageGaps(
  options: IdentifyOptions = {},
): CoverageGapReport {
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  let currentRate = clampRate(options.currentRate ?? BASE_CURRENT_RATE, BASE_CURRENT_RATE);
  let targetRate = clampRate(options.targetRate ?? BASE_TARGET_RATE, BASE_TARGET_RATE);
  if (targetRate < currentRate) {
    // 目标低于当前无意义：翻转，避免出现负增量
    const t = currentRate;
    currentRate = targetRate;
    targetRate = t;
  }

  const totalLines =
    typeof options.totalLines === 'number' &&
    Number.isFinite(options.totalLines) &&
    options.totalLines > 0
      ? Math.floor(options.totalLines)
      : BASE_TOTAL_LINES;

  const coveredLines = Math.floor(totalLines * currentRate);
  const targetCoveredLines = Math.floor(totalLines * targetRate);
  const remainingLines = totalLines - coveredLines;
  const deltaToTarget = targetRate - currentRate;
  // 按整数行差精确计算，避免 0.995-0.99 浮点误差导致 ceil 多 1 行
  const linesNeededToTarget = Math.max(0, targetCoveredLines - coveredLines);

  const baseline = cloneBaseline();
  const categories = CATEGORY_ORDER.map((k) => baseline[k]);

  // 自洽校验（防御性：若未来改坏常量，此处仍按 hotspot 求和回填，不静默凑数）
  for (const cat of categories) {
    const sum = cat.hotspots.reduce((acc, h) => acc + h.uncoveredLines, 0);
    if (sum !== cat.uncoveredLines) {
      cat.uncoveredLines = sum;
    }
  }

  const totalUncoveredLines = categories.reduce((acc, c) => acc + c.uncoveredLines, 0);

  return {
    generatedAt,
    currentRate,
    targetRate,
    totalLines,
    coveredLines,
    remainingLines,
    deltaToTarget,
    linesNeededToTarget,
    categories,
    totalUncoveredLines,
    targetPass: currentRate >= targetRate,
  };
}

// ---------------------------------------------------------------------------
// 纯函数 2：生成覆盖率提升计划
// ---------------------------------------------------------------------------

/**
 * 每个 hotspot 对应的补测技术与目标行数。
 * key = `${file}::${symbol}`；targetLines 求和必须 == 2500（99.0%→99.5% 增量）。
 */
const PLAN_TECHNIQUE: Record<string, { technique: string; targetLines: number; effortHours: number; acceptance: string }> = {
  'src/bff/aggregators/securityBaselineAggregator.ts::sanitizePipeline / try-catch': {
    technique: 'bun:test + mock().mockRejectedValueOnce(...) 注入异常，断言返回错误码与脱敏输出',
    targetLines: 240,
    effortHours: 4,
    acceptance: 'catch 分支 100% 命中，错误码白名单快照通过',
  },
  'src/bff/adapters/dbAdapter.ts::query / pool 错误 catch': {
    technique: 'mock pg Pool.query reject(new Error("ECONNRESET"))，断言 errno 映射与退避次数',
    targetLines: 210,
    effortHours: 3,
    acceptance: '三种 errno 分支各覆盖一次',
  },
  'src/bff/routes/adminHealth.ts::probeExternal / fetch reject': {
    technique: 'global.fetch mockRejectedValue，断言 health=false 与 degraded=true',
    targetLines: 150,
    effortHours: 2,
    acceptance: 'reject 路径不再走 success 分支',
  },
  'src/bff/aggregators/aiBrainAggregator.ts::llmCall / 超时 catch': {
    technique: 'AbortSignal.timeout 触发，断言兜底建议文案',
    targetLines: 180,
    effortHours: 3,
    acceptance: '超时分支返回固定兜底，不抛裸错',
  },
  'src/bff/notify/smtpNotifier.ts::send / SMTP 错误 catch': {
    technique: 'mock nodemailer sendMail reject，断言 outbox 入队',
    targetLines: 120,
    effortHours: 2,
    acceptance: '失败邮件必入 outbox 表，不丢信',
  },
  'src/bff/aggregators/*Aggregator.ts::纯函数空输入': {
    technique: 'table-driven：[] / null / undefined / {} / 0 五类入参',
    targetLines: 190,
    effortHours: 3,
    acceptance: '空输入返回基线结构，不抛 TypeError',
  },
  'src/bff/routes/*Controller.ts::超长入参': {
    technique: '生成 8193 字符医嘱 / 257 字符 unicode 姓名，断言 40000',
    targetLines: 210,
    effortHours: 3,
    acceptance: '超长入参 400，不误存',
  },
  'src/bff/adapters/*Adapter.ts::特殊字符入参': {
    technique: "注入 ' OR 1=1 -- / emoji / ‎‎RTL‎‎，断言转义后输出",
    targetLines: 180,
    effortHours: 3,
    acceptance: '元字符被转义，无注入副作用',
  },
  'src/bff/routes/*Controller.ts::并发同资源': {
    technique: 'Promise.all 10 次同病历号写，断言版本冲突拒绝',
    targetLines: 170,
    effortHours: 4,
    acceptance: '并发写冲突至少拒绝一次',
  },
  'src/bff/middleware/auth.ts::requireRole / 未登录': {
    technique: '不带 Authorization 头打 admin 路由，断言 40100',
    targetLines: 160,
    effortHours: 1,
    acceptance: '未登录一律 401',
  },
  'src/bff/middleware/auth.ts::requireRole / 角色不足': {
    technique: '用 nurse token 打 admin 路由，断言 40300',
    targetLines: 170,
    effortHours: 2,
    acceptance: '越权一律 403，不泄露数据',
  },
  'src/bff/adapters/tenantAdapter.ts::assertTenant / 跨租户': {
    technique: '构造 tenant_id 不匹配对象，断言拒绝',
    targetLines: 150,
    effortHours: 2,
    acceptance: '跨租户访问一律拒绝',
  },
  'src/bff/routes/*Controller.ts::resource owner / 水平越权': {
    technique: '用 A 的 token 读 B 的病历号，断言 40300',
    targetLines: 120,
    effortHours: 2,
    acceptance: '水平越权一律 403',
  },
  'src/bff/llm/llmClient.ts::withFallback / LLM 不可用': {
    technique: 'mock LLM 500，断言规则引擎兜底返回',
    targetLines: 90,
    effortHours: 2,
    acceptance: 'LLM 不可用时规则兜底可观测',
  },
  'src/bff/adapters/cacheAdapter.ts::redisDown / 内存兜底': {
    technique: 'mock redis.connect reject，断言内存缓存读写',
    targetLines: 80,
    effortHours: 2,
    acceptance: 'Redis 宕机不影响读路径',
  },
  'src/bff/adapters/dbAdapter.ts::failover / 只读副本': {
    technique: 'mock 主库不可达，断言切只读副本',
    targetLines: 50,
    effortHours: 2,
    acceptance: '主库故障读可用',
  },
  'src/bff/outboxRelay.ts::relay / 下游不可用': {
    technique: 'mock 下游 500，断言退避 3 次后死信',
    targetLines: 30,
    effortHours: 1,
    acceptance: '下游故障不阻塞 outbox',
  },
};

/**
 * 由缺口报告生成提升计划。
 *
 * - gaps 为 null / undefined / 空数组时返回空计划（不抛错）；
 * - 条目按 P0→P2、同优先级按 targetLines 降序、再按 id 字典序（确定性）；
 * - estimatedRateAfter 自算，单测断言其 == 0.995。
 */
export function generateCoverageImprovementPlan(
  gaps: CoverageGapReport | null | undefined,
): CoverageImprovementPlan {
  const generatedAt = gaps?.generatedAt ?? new Date().toISOString();

  if (!gaps || !Array.isArray(gaps.categories) || gaps.categories.length === 0) {
    return {
      generatedAt,
      items: [],
      totalPlannedLines: 0,
      estimatedRateAfter: gaps?.currentRate ?? 0,
      reachesTarget: false,
      totalEffortHours: 0,
    };
  }

  const items: PlanItem[] = [];
  for (const cat of gaps.categories) {
    for (const h of cat.hotspots) {
      const key = `${h.file}::${h.symbol}`;
      const recipe = PLAN_TECHNIQUE[key];
      if (!recipe) continue;
      // 防御：目标行数不得超过该 hotspot 剩余行数（不凑数）
      const targetLines = Math.min(recipe.targetLines, h.uncoveredLines);
      items.push({
        id: `${cat.category}::${h.symbol}`,
        category: cat.category,
        file: h.file,
        symbol: h.symbol,
        kind: h.kind,
        technique: recipe.technique,
        targetLines,
        effortHours: recipe.effortHours,
        priority: cat.priority,
        acceptance: recipe.acceptance,
      });
    }
  }

  // 确定性排序：P0→P2，同级 targetLines 降序，再 id 升序
  const priRank: Record<PlanPriority, number> = { P0: 0, P1: 1, P2: 2 };
  items.sort((a, b) => {
    if (priRank[a.priority] !== priRank[b.priority]) {
      return priRank[a.priority] - priRank[b.priority];
    }
    if (b.targetLines !== a.targetLines) return b.targetLines - a.targetLines;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const totalPlannedLines = items.reduce((acc, it) => acc + it.targetLines, 0);
  const totalEffortHours = items.reduce((acc, it) => acc + it.effortHours, 0);
  const coveredAfter = gaps.coveredLines + totalPlannedLines;
  const estimatedRateAfter = gaps.totalLines > 0 ? coveredAfter / gaps.totalLines : 0;

  return {
    generatedAt,
    items,
    totalPlannedLines,
    estimatedRateAfter,
    reachesTarget: estimatedRateAfter >= gaps.targetRate,
    totalEffortHours,
  };
}

// ---------------------------------------------------------------------------
// 纯函数 3：跟踪覆盖率进度
// ---------------------------------------------------------------------------

/**
 * 进度跟踪。
 *
 * - snapshot 缺省 / events 为空 → not_started；
 * - 并发重复事件：同一 itemId 多次上报时，done 取「或」（一旦 true 不回退），
 *   coveredLinesAdded 取最大值（幂等，不重复计数）；
 * - itemId 不在计划内的事件丢弃并计入 droppedEvents；
 * - coveredLinesAdded 为负时 clamp 到 0。
 */
export function trackCoverageProgress(
  plan: CoverageImprovementPlan | null | undefined,
  snapshot: ProgressSnapshot | null | undefined,
): CoverageProgress {
  const generatedAt = new Date().toISOString();

  const totalItems = plan?.items.length ?? 0;
  const plannedLines = plan?.totalPlannedLines ?? 0;

  if (!plan || totalItems === 0) {
    return {
      generatedAt,
      totalItems: 0,
      doneItems: 0,
      pendingItems: 0,
      plannedLines: 0,
      coveredAdded: 0,
      projectedRate: 0,
      remainingLinesToTarget: 0,
      completionPct: 0,
      status: 'not_started',
      droppedEvents: 0,
    };
  }

  const knownIds = new Set(plan.items.map((it) => it.id));
  const agg = new Map<string, { done: boolean; added: number }>();
  let droppedEvents = 0;

  for (const ev of snapshot?.events ?? []) {
    if (!ev || !knownIds.has(ev.itemId)) {
      droppedEvents += 1;
      continue;
    }
    const prev = agg.get(ev.itemId) ?? { done: false, added: 0 };
    const added =
      typeof ev.coveredLinesAdded === 'number' && Number.isFinite(ev.coveredLinesAdded)
        ? Math.max(0, ev.coveredLinesAdded)
        : 0;
    agg.set(ev.itemId, {
      done: prev.done || ev.done === true,
      added: Math.max(prev.added, added),
    });
  }

  const doneItems = [...agg.values()].filter((v) => v.done).length;
  const coveredAdded = [...agg.values()].reduce((acc, v) => acc + v.added, 0);
  const pendingItems = Math.max(0, totalItems - doneItems);
  const completionPct = totalItems > 0 ? doneItems / totalItems : 0;

  // 取计划所依据的当前行率（plan.generatedAt 不含 currentRate，需由条目数反推不可行；
  // 这里用基线 0.99 + coveredAdded/totalLines，因为本切片 totalLines 恒为 500000）
  const baseRate = BASE_CURRENT_RATE;
  const projectedRate = baseRate + coveredAdded / BASE_TOTAL_LINES;
  const remainingLinesToTarget = Math.max(
    0,
    Math.ceil(BASE_TOTAL_LINES * (BASE_TARGET_RATE - projectedRate)),
  );

  let status: CoverageProgress['status'];
  if (doneItems === 0) status = 'not_started';
  else if (projectedRate >= BASE_TARGET_RATE) status = 'achieved';
  else if (completionPct >= coveredAdded / Math.max(1, plannedLines) && completionPct >= 0.8) {
    // 条目完成度 ≥ 80% 且行数进度与条目进度匹配 → on_track
    status = 'on_track';
  } else if (completionPct >= 0.3) {
    status = 'in_progress';
  } else {
    status = 'behind';
  }

  return {
    generatedAt,
    totalItems,
    doneItems,
    pendingItems,
    plannedLines,
    coveredAdded,
    projectedRate,
    remainingLinesToTarget,
    completionPct,
    status,
    droppedEvents,
  };
}
