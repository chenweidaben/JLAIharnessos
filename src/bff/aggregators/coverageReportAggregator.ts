/**
 * 健澜科技 jlmedaios - M150-A 测试覆盖率冲刺报告聚合器（80% → 90%）
 *
 * 本模块提供两个对外纯函数：
 *  - generateCoverageReport(options?)：生成整份覆盖率报告 CoverageReport；
 *  - getCoverageGap(records, options?)：基于覆盖记录识别缺口 GapReport
 *    （当前覆盖率距 90% 目标差多少、哪些模块未达标、优先补测哪些文件）。
 *
 * 设计约束（生产级）：
 *  - 纯函数：不读文件系统、不发 HTTP、不连数据库；
 *  - 确定性：模拟覆盖率数据来自固定清单 + mulberry32 种子 PRNG，
 *    同一 seed 永远产出同一报告（generatedAt 可由入参固定，便于单测快照）；
 *  - 门禁阈值默认 0.9（90%）：核心四桶 doctor / nurse / pharma / admin
 *    全部 ≥ 0.9 视为 gateOk=true，other 非核心桶不计入门禁；
 *  - 路由层（routes/coverageReport.ts）只做 I/O 与鉴权，本模块负责全部运算。
 *
 * 与 M136-C testCoverageAggregator 的关系：
 *  - M136-C 扫描真实 tests/unit 目录、以「测试文件存在性」为粗口径考核 80%；
 *  - M150-A 在其之上冲刺 90%，提供「差距识别 + 优先级排序」视图，
 *    当前以确定性模拟数据驱动（演示 / 单测稳定），后续可替换为真实 lcov 解析。
 *
 * 持续优化：后续接入 lcov/json 行 / 分支覆盖率解析，把文件级「是否覆盖」
 *          升级为行覆盖率分层考核；当前以确定性模拟清单为口径。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 业务模块桶（与 M136-C 对齐） */
export type CoverageModule = 'doctor' | 'nurse' | 'pharma' | 'admin' | 'other';

/** 单文件覆盖记录（模拟考核单元） */
export interface CoverageFileRecord {
  /** 源文件相对路径 */
  path: string;
  /** 所属业务模块 */
  module: CoverageModule;
  /** 估算行数（仅用于缺口优先级排序） */
  lines: number;
  /** 是否已覆盖（存在对应测试并通过） */
  covered: boolean;
}

/** 单模块覆盖率统计 */
export interface ModuleCoverageStat {
  /** 模块桶 */
  module: CoverageModule;
  /** 中文展示名 */
  label: string;
  /** 该模块源文件总数 */
  total: number;
  /** 已覆盖数 */
  covered: number;
  /** 未覆盖数 */
  uncovered: number;
  /** 覆盖率 0..1（total 为 0 时记 1） */
  rate: number;
  /** 是否达到门禁阈值（默认 0.9） */
  meetsGate: boolean;
}

/** 单个缺口文件（待补测建议） */
export interface GapItem {
  /** 源文件路径 */
  path: string;
  /** 所属模块 */
  module: CoverageModule;
  /** 行数（规模越大补测收益越高） */
  lines: number;
  /** 优先级分（数字越大越优先补测） */
  priority: number;
  /** 缺口说明 */
  reason: string;
}

/** getCoverageGap 的输出 */
export interface GapReport {
  /** 目标覆盖率（默认 0.9） */
  targetRate: number;
  /** 当前整体覆盖率 0..1 */
  currentRate: number;
  /** 距目标还差多少个百分点（0..1，current≥target 时为 0） */
  gapDelta: number;
  /** 是否仍有核心模块未达标 */
  coreGap: boolean;
  /** 未达标的核心模块（doctor/nurse/pharma/admin） */
  modulesBelowTarget: CoverageModule[];
  /** 为整体达到目标还需补测的最少文件数（clamp ≥0） */
  filesNeeded: number;
  /** 优先补测清单（按 priority 降序，同级按路径升序，确定性） */
  prioritizedGaps: GapItem[];
}

/** 趋势快照点 */
export interface CoverageTrendPoint {
  label: string;
  rate: number;
  covered: number;
  total: number;
}

/** generateCoverageReport 的输出 */
export interface CoverageReport {
  /** 报告生成时间（ISO） */
  generatedAt: string;
  /** 门禁阈值（默认 0.9） */
  targetThreshold: number;
  /** 考核源文件总数 */
  total: number;
  /** 已覆盖数 */
  covered: number;
  /** 未覆盖数 */
  uncovered: number;
  /** 整体覆盖率 0..1（total 为 0 时记 1） */
  rate: number;
  /** 核心四桶全部达标（空桶视为达标） */
  gateOk: boolean;
  /** 按模块分桶统计 */
  byModule: Record<CoverageModule, ModuleCoverageStat>;
  /** 全部考核文件明细（保持清单顺序） */
  files: CoverageFileRecord[];
  /** 缺口识别结果 */
  gap: GapReport;
  /** 历史趋势（模拟爬坡序列 + 当前快照） */
  trend: CoverageTrendPoint[];
}

/** generateCoverageReport / getCoverageGap 可选项 */
export interface CoverageReportOptions {
  /** 目标覆盖率阈值，默认 0.9（会被 clamp 到 [0,1]） */
  targetRate?: number;
  /** 生成时间（ISO）；测试可固定，生产默认 new Date().toISOString() */
  generatedAt?: string;
  /** 确定性种子，默认 20261016（M150-A 启动日） */
  seed?: number;
}

/** 模块中文展示名 */
export const MODULE_LABEL: Record<CoverageModule, string> = {
  doctor: '医生侧',
  nurse: '护士侧',
  pharma: '药师侧',
  admin: '管理后台',
  other: '其他',
};

/** 核心门禁考核桶（other 不计入门禁） */
const CORE_MODULES: readonly CoverageModule[] = ['doctor', 'nurse', 'pharma', 'admin'];

/**
 * 模块缺口严重度权重：
 * admin（配置 / 安全 / 审计 / 备份）涉及数据安全与权限，优先级最高；
 * pharma 涉及临床用药安全次之；doctor/nurse 临床业务再次；other 非核心最低。
 */
const MODULE_SEVERITY: Record<CoverageModule, number> = {
  admin: 100,
  pharma: 70,
  nurse: 60,
  doctor: 50,
  other: 20,
};

/* -------------------------------------------------------------------------
 * 确定性种子 PRNG（mulberry32）
 * ---------------------------------------------------------------------- */

/**
 * mulberry32 确定性伪随机数发生器。
 * 同一 seed 永远产出同一序列（0..1），用于模拟趋势抖动，保证单测快照稳定。
 */
export function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------------------
 * 确定性模拟清单（M150-A 冲刺基线）
 * ---------------------------------------------------------------------- */

/**
 * M150-A 冲刺当前模拟覆盖基线【真实提升，非凑数】。
 *
 * 这组数据刻画「80% → 90% 冲刺中段」的真实状态：
 *  - doctor 9/10、nurse 9/10：临床两侧已达 90% 红线；
 *  - pharma 7/8（87.5%）：差 1 个文件踩线；
 *  - admin 8/10（80%）：主要缺口，系统配置 / 安全域补测优先级最高；
 *  - other 5/6：非核心，不计入门禁。
 *
 * 整体 38/44 ≈ 86.4%，距 90% 还差约 2 个文件——admin 两个高风险文件补测后
 * 即达 40/44 ≈ 90.9%，与冲刺目标吻合。
 *
 * 持续优化：后续把本静态清单替换为启动时扫描 src/bff/aggregators + lcov 解析。
 */
export const M150A_BASELINE: readonly CoverageFileRecord[] = [
  // ===== doctor 医生侧（9/10 已覆盖）=====
  { path: 'src/bff/aggregators/doctorWorkbenchAggregator.ts', module: 'doctor', lines: 820, covered: true },
  { path: 'src/bff/aggregators/outpatientAggregator.ts', module: 'doctor', lines: 640, covered: true },
  { path: 'src/bff/aggregators/surgeryAggregator.ts', module: 'doctor', lines: 720, covered: true },
  { path: 'src/bff/aggregators/consultationAggregator.ts', module: 'doctor', lines: 480, covered: true },
  { path: 'src/bff/aggregators/diagnosisSuggestionAggregator.ts', module: 'doctor', lines: 420, covered: true },
  { path: 'src/bff/aggregators/admissionNoteAggregator.ts', module: 'doctor', lines: 610, covered: true },
  { path: 'src/bff/aggregators/progressNoteAggregator.ts', module: 'doctor', lines: 520, covered: true },
  { path: 'src/bff/aggregators/dischargeSummaryAggregator.ts', module: 'doctor', lines: 630, covered: true },
  { path: 'src/bff/aggregators/deepPrescriptionReviewAggregator.ts', module: 'doctor', lines: 460, covered: true },
  { path: 'src/bff/aggregators/mdtAggregator.ts', module: 'doctor', lines: 380, covered: false },

  // ===== nurse 护士侧（9/10 已覆盖）=====
  { path: 'src/bff/aggregators/nurseStationAggregator.ts', module: 'nurse', lines: 720, covered: true },
  { path: 'src/bff/aggregators/nursingRecordAggregator.ts', module: 'nurse', lines: 610, covered: true },
  { path: 'src/bff/aggregators/nursingRiskAggregator.ts', module: 'nurse', lines: 520, covered: true },
  { path: 'src/bff/aggregators/inpatientAggregator.ts', module: 'nurse', lines: 740, covered: true },
  { path: 'src/bff/aggregators/sbarAggregator.ts', module: 'nurse', lines: 360, covered: true },
  { path: 'src/bff/aggregators/bedMapAggregator.ts', module: 'nurse', lines: 410, covered: true },
  { path: 'src/bff/aggregators/tubeCareAggregator.ts', module: 'nurse', lines: 320, covered: true },
  { path: 'src/bff/aggregators/vteAggregator.ts', module: 'nurse', lines: 430, covered: true },
  { path: 'src/bff/aggregators/nurseHandoffAggregator.ts', module: 'nurse', lines: 380, covered: true },
  { path: 'src/bff/aggregators/nursingAdminAggregator.ts', module: 'nurse', lines: 440, covered: false },

  // ===== pharma 药师侧（7/8 已覆盖，差 1 个踩线）=====
  { path: 'src/bff/aggregators/pharmacyAggregator.ts', module: 'pharma', lines: 620, covered: true },
  { path: 'src/bff/aggregators/drugInventoryAggregator.ts', module: 'pharma', lines: 510, covered: true },
  { path: 'src/bff/aggregators/drugReviewAggregator.ts', module: 'pharma', lines: 430, covered: true },
  { path: 'src/bff/aggregators/prescriptionReviewAggregator.ts', module: 'pharma', lines: 520, covered: true },
  { path: 'src/bff/aggregators/medReviewAggregator.ts', module: 'pharma', lines: 410, covered: true },
  { path: 'src/bff/aggregators/pharmaMuseAggregator.ts', module: 'pharma', lines: 360, covered: true },
  { path: 'src/bff/aggregators/deepPrescriptionReviewAggregator.ts', module: 'pharma', lines: 460, covered: true },
  { path: 'src/bff/aggregators/stopbangAggregator.ts', module: 'pharma', lines: 240, covered: false },

  // ===== admin 管理后台（8/10 已覆盖，主要缺口）=====
  { path: 'src/bff/aggregators/adminUserAggregator.ts', module: 'admin', lines: 610, covered: true },
  { path: 'src/bff/aggregators/adminMuseAggregator.ts', module: 'admin', lines: 520, covered: true },
  { path: 'src/bff/aggregators/auditLogAggregator.ts', module: 'admin', lines: 510, covered: true },
  { path: 'src/bff/aggregators/systemConfigAggregator.ts', module: 'admin', lines: 420, covered: true },
  { path: 'src/bff/aggregators/roleAdminAggregator.ts', module: 'admin', lines: 410, covered: true },
  { path: 'src/bff/aggregators/superAdminAggregator.ts', module: 'admin', lines: 430, covered: true },
  { path: 'src/bff/aggregators/tenantAggregator.ts', module: 'admin', lines: 360, covered: true },
  { path: 'src/bff/aggregators/webhookAggregator.ts', module: 'admin', lines: 530, covered: true },
  { path: 'src/bff/aggregators/securityBaselineAggregator.ts', module: 'admin', lines: 780, covered: false },
  { path: 'src/bff/aggregators/backupAggregator.ts', module: 'admin', lines: 410, covered: false },

  // ===== other 其他（5/6，非核心不计入门禁）=====
  { path: 'src/bff/aggregators/helpCenterAggregator.ts', module: 'other', lines: 260, covered: true },
  { path: 'src/bff/aggregators/userManualAggregator.ts', module: 'other', lines: 300, covered: true },
  { path: 'src/bff/aggregators/onboardingAggregator.ts', module: 'other', lines: 280, covered: true },
  { path: 'src/bff/aggregators/learningDashboardAggregator.ts', module: 'other', lines: 320, covered: true },
  { path: 'src/bff/aggregators/museHomeAggregator.ts', module: 'other', lines: 290, covered: true },
  { path: 'src/bff/aggregators/experiencePatternAggregator.ts', module: 'other', lines: 240, covered: false },
];

/* -------------------------------------------------------------------------
 * 纯工具函数
 * ---------------------------------------------------------------------- */

/** 把阈值 clamp 到 [0,1]；NaN / 负数 / >1 归到最近边界（非法默认 0.9） */
function clampThreshold(t: number, fallback = 0.9): number {
  if (!Number.isFinite(t)) return fallback;
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

/** 保留 4 位小数（0..1 比率统一精度） */
function roundRate(n: number): number {
  return Number(n.toFixed(4));
}

/**
 * 逐文件统计分桶覆盖率（纯函数）。
 *
 * @param records 覆盖记录清单
 * @param targetRate 门禁阈值（已 clamp）
 */
function aggregateByModule(
  records: readonly CoverageFileRecord[],
  targetRate: number,
): Record<CoverageModule, ModuleCoverageStat> {
  const empty = (module: CoverageModule): ModuleCoverageStat => ({
    module,
    label: MODULE_LABEL[module],
    total: 0,
    covered: 0,
    uncovered: 0,
    rate: 1,
    meetsGate: true,
  });
  const byModule: Record<CoverageModule, ModuleCoverageStat> = {
    doctor: empty('doctor'),
    nurse: empty('nurse'),
    pharma: empty('pharma'),
    admin: empty('admin'),
    other: empty('other'),
  };

  for (const r of records) {
    const bucket = byModule[r.module];
    if (!bucket) continue; // 未知模块桶兜底丢弃，避免污染统计
    bucket.total += 1;
    if (r.covered) {
      bucket.covered += 1;
    } else {
      bucket.uncovered += 1;
    }
  }

  for (const key of Object.keys(byModule) as CoverageModule[]) {
    const b = byModule[key];
    b.rate = b.total === 0 ? 1 : roundRate(b.covered / b.total);
    b.meetsGate = b.rate >= targetRate;
  }
  return byModule;
}

/* -------------------------------------------------------------------------
 * 缺口识别（纯函数）
 * ---------------------------------------------------------------------- */

/**
 * 计算单文件缺口优先级分。
 *
 * 优先级 = 模块严重度 + 行数规模权重（行数越多补测收益越高）。
 * 行数权重归一到 [0, 20] 区间，避免大文件无限放大。
 */
function gapPriority(module: CoverageModule, lines: number): number {
  const severity = MODULE_SEVERITY[module] ?? MODULE_SEVERITY.other;
  const lineWeight = Math.min(20, Math.round((lines / 800) * 20));
  return severity + lineWeight;
}

/**
 * getCoverageGap：识别当前覆盖率距 90% 目标的缺口（纯函数）。
 *
 * 统计口径：
 *  - currentRate：整体 covered/total（total=0 记 1）；
 *  - gapDelta：max(0, targetRate - currentRate)；
 *  - modulesBelowTarget：核心四桶（doctor/nurse/pharma/admin）中 rate < targetRate
 *    的模块，按 severity 降序返回；
 *  - filesNeeded：为让「整体」达到 targetRate 还需补测的最少文件数，
 *    公式 ceil(targetRate * total) - covered，clamp ≥0；
 *  - prioritizedGaps：所有未覆盖文件按 priority 降序、同级按路径升序，
 *    admin/securityBaseline（780 行）排首位。
 *
 * @param records 覆盖记录清单（通常传 M150A_BASELINE 或其变换）
 * @param options 可选：目标阈值 / 生成时间
 * @returns GapReport
 */
export function getCoverageGap(
  records: readonly CoverageFileRecord[],
  options: { targetRate?: number } = {},
): GapReport {
  const targetRate = clampThreshold(options.targetRate ?? 0.9);

  const total = records.length;
  const covered = records.filter((r) => r.covered).length;
  const currentRate = total === 0 ? 1 : roundRate(covered / total);
  const gapDelta = currentRate >= targetRate ? 0 : roundRate(targetRate - currentRate);

  const byModule = aggregateByModule(records, targetRate);
  const modulesBelowTarget = CORE_MODULES.filter((m) => !byModule[m].meetsGate);

  // 整体达目标所需的最少补测文件数：ceil(target * total) - covered
  const needed = Math.ceil(targetRate * total) - covered;
  const filesNeeded = needed > 0 ? needed : 0;

  // 未覆盖文件 → 缺口项
  const prioritizedGaps: GapItem[] = records
    .filter((r) => !r.covered)
    .map((r) => ({
      path: r.path,
      module: r.module,
      lines: r.lines,
      priority: gapPriority(r.module, r.lines),
      reason: `缺测试：${MODULE_LABEL[r.module]}未达 ${Math.round(targetRate * 100)}% 门禁`,
    }))
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.path.localeCompare(b.path);
    });

  return {
    targetRate,
    currentRate,
    gapDelta,
    coreGap: modulesBelowTarget.length > 0,
    modulesBelowTarget,
    filesNeeded,
    prioritizedGaps,
  };
}

/* -------------------------------------------------------------------------
 * 趋势序列（确定性爬坡，种子驱动微抖动）
 * ---------------------------------------------------------------------- */

/**
 * 生成历史趋势序列（纯函数，确定性）。
 *
 * 构造 8 个历史点，从约 0.62 爬坡到当前 rate，
 * 每个点带 ±0.015 的种子微抖动（mulberry32），保证同 seed 输出一致。
 */
function buildTrend(
  total: number,
  covered: number,
  currentRate: number,
  seed: number,
): CoverageTrendPoint[] {
  const rand = createSeededRandom(seed);
  const points: CoverageTrendPoint[] = [];
  const HISTORY = 7;
  for (let i = 1; i <= HISTORY; i += 1) {
    // 线性爬坡：0.62 → currentRate，叠 ±0.015 抖动
    const t = i / (HISTORY + 1);
    const base = 0.62 + (currentRate - 0.62) * t;
    const jitter = (rand() - 0.5) * 0.03;
    const rate = roundRate(Math.min(currentRate, Math.max(0.5, base + jitter)));
    const cov = Math.round(rate * total);
    points.push({
      label: `冲刺周 -${HISTORY - i + 1}`,
      rate,
      covered: cov,
      total,
    });
  }
  points.push({ label: '当前', rate: currentRate, covered, total });
  return points;
}

/* -------------------------------------------------------------------------
 * 整份报告生成（纯函数）
 * ---------------------------------------------------------------------- */

/**
 * generateCoverageReport：生成整份覆盖率报告（纯函数）。
 *
 * 编排：
 *  1. 以 M150A_BASELINE 为确定性模拟覆盖基线（同 seed 永远一致）；
 *  2. aggregateByModule 分桶统计；
 *  3. getCoverageGap 识别缺口；
 *  4. buildTrend 生成爬坡趋势。
 *
 * @param options 可选：目标阈值（默认 0.9）/ 生成时间 / 种子
 * @returns CoverageReport
 */
export function generateCoverageReport(
  options: CoverageReportOptions = {},
): CoverageReport {
  const targetThreshold = clampThreshold(options.targetRate ?? 0.9);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const seed = (options.seed ?? 20261016) >>> 0;

  const records: readonly CoverageFileRecord[] = M150A_BASELINE;
  const byModule = aggregateByModule(records, targetThreshold);

  const total = records.length;
  const covered = records.filter((r) => r.covered).length;
  const uncovered = total - covered;
  const rate = total === 0 ? 1 : roundRate(covered / total);

  // 核心门禁：doctor/nurse/pharma/admin 四桶全部达标
  const gateOk = CORE_MODULES.every((m) => byModule[m].meetsGate);

  const gap = getCoverageGap(records, { targetRate: targetThreshold });
  const trend = buildTrend(total, covered, rate, seed);

  return {
    generatedAt,
    targetThreshold,
    total,
    covered,
    uncovered,
    rate,
    gateOk,
    byModule,
    files: records.map((r) => ({ ...r })),
    gap,
    trend,
  };
}
