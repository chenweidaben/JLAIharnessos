/**
 * 健澜科技 jlmedaios - M136-C 测试覆盖率聚合器【生产就绪质量门禁】
 *
 * 本模块仅提供纯函数与静态清单：
 *  - calculateTestCoverage(sourceFiles, testFiles, options?)：
 *    按「源文件 ↔ 测试文件」命名约定匹配，计算整体覆盖率、按业务模块分桶
 *    （doctor / nurse / pharma / admin / other）的覆盖率、未覆盖明细与趋势；
 *  - classifyModule(path)：把源文件路径归一到业务模块桶；
 *  - normalizeTestKey(path) / normalizeSourceKey(path)：把测试 / 源文件路径
 *    归一为可匹配的键（去扩展、去 .test/.spec 后缀、去 Aggregator 等常见后缀）；
 *  - CORE_AGGREGATOR_INVENTORY：核心业务 aggregator 静态清单（doctor / nurse /
 *    pharma / admin 四桶），作为覆盖率质量门禁的考核范围。
 *
 * 设计约束：
 *  - 纯函数：不读文件系统、不发 HTTP、不连数据库；
 *  - 门禁阈值默认 80%（核心业务模块 doctor/nurse/pharma/admin 全部 ≥ 80% 视为
 *    coreGateOk=true），可通过 options.gateThreshold 覆盖；
 *  - 趋势由入参 options.history 派生：把当前快照追加到历史点序列尾部；
 *  - 路由层（routes/testCoverage.ts）负责 I/O（扫描 tests/unit 目录）与鉴权，
 *    本模块只负责确定性运算，便于单测与 BFF 路由层复用。
 *
 * 持续优化：后续可接入 V8 覆盖率（lcov/json）解析，把「是否存在对应测试文件」
 * 的粗粒度覆盖升级为行 / 分支覆盖率；当前以「测试文件存在性」为考核口径。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 业务模块桶（与核心业务 aggregator 对齐） */
export type CoverageModule = 'doctor' | 'nurse' | 'pharma' | 'admin' | 'other';

/** 源文件入参（覆盖率考核单元） */
export interface SourceFileInput {
  /** 源文件相对路径，如 src/bff/aggregators/doctorWorkbenchAggregator.ts */
  path: string;
  /** 源文件估算 / 实际总行数（可选，用于规模加权展示） */
  lines?: number;
}

/** 测试文件入参 */
export interface TestFileInput {
  /** 测试文件相对路径，如 tests/unit/doctorWorkbench.test.ts */
  path: string;
}

/** 单模块覆盖率统计 */
export interface ModuleCoverage {
  /** 模块桶 */
  module: CoverageModule;
  /** 该模块源文件总数 */
  total: number;
  /** 已覆盖（存在对应测试）源文件数 */
  covered: number;
  /** 未覆盖源文件数 */
  uncovered: number;
  /** 覆盖率 0..1（total 为 0 时记 1，空桶视为达标） */
  rate: number;
  /** 是否达到门禁阈值（默认 0.8） */
  meetsGate: boolean;
}

/** 单文件覆盖明细 */
export interface FileCoverage {
  /** 源文件路径 */
  path: string;
  /** 匹配到的测试文件路径（无则 undefined） */
  testPath?: string;
  /** 是否已覆盖 */
  covered: boolean;
  /** 所属业务模块 */
  module: CoverageModule;
  /** 源文件行数（无则 0） */
  lines: number;
}

/** 趋势快照点 */
export interface CoverageTrendPoint {
  /** 标签（通常为日期 ISO） */
  label: string;
  /** 整体覆盖率 0..1 */
  rate: number;
  /** 被覆盖源文件数 */
  covered: number;
  /** 源文件总数 */
  total: number;
}

/** 整份覆盖率报告（calculateTestCoverage 的输出） */
export interface Coverage {
  /** 报告生成时间（ISO） */
  generatedAt: string;
  /** 门禁阈值（默认 0.8） */
  gateThreshold: number;
  /** 源文件总数 */
  total: number;
  /** 已覆盖源文件数 */
  covered: number;
  /** 未覆盖源文件数 */
  uncovered: number;
  /** 整体覆盖率 0..1 */
  rate: number;
  /**
   * 核心业务模块门禁结论：
   * doctor / nurse / pharma / admin 四桶全部 ≥ gateThreshold 即为 true。
   * other 桶不计入门禁（非核心）。
   */
  coreGateOk: boolean;
  /** 按业务模块分桶统计 */
  byModule: Record<CoverageModule, ModuleCoverage>;
  /** 全部源文件覆盖明细（保持入参顺序） */
  files: FileCoverage[];
  /** 未覆盖源文件清单（保持入参顺序） */
  uncoveredFiles: FileCoverage[];
  /** 趋势序列（历史 + 当前快照，按时间正序） */
  trend: CoverageTrendPoint[];
}

/** calculateTestCoverage 可选项 */
export interface CoverageOptions {
  /** 门禁阈值，默认 0.8（核心业务模块 ≥ 80%） */
  gateThreshold?: number;
  /** 生成时间（ISO）；测试可固定，生产默认 new Date().toISOString() */
  generatedAt?: string;
  /** 历史趋势点（当前快照会被追加到尾部） */
  history?: readonly CoverageTrendPoint[];
}

/* -------------------------------------------------------------------------
 * 路径归一与模块分类（纯函数）
 * ---------------------------------------------------------------------- */

/** 把路径分隔符统一为正斜杠 */
function normalizeSeparators(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * 从源文件路径提取可匹配键。
 *
 * 规则：
 *  - 取最后一段文件名（不含目录）；
 *  - 去 .ts / .tsx / .js / .jsx 扩展；
 *  - 去尾部 Aggregator / Route / Routes / Service / Store / Hook 等常见后缀，
 *    以便 `doctorWorkbenchAggregator.ts` 与 `doctorWorkbench.test.ts` 命中；
 *  - 全小写。
 *
 * @example
 * normalizeSourceKey('src/bff/aggregators/DoctorWorkbenchAggregator.ts');
 * // 'doctorworkbench'
 */
export function normalizeSourceKey(path: string): string {
  const s = normalizeSeparators(path);
  let base = s.split('/').pop() ?? s;
  base = base.replace(/\.(ts|tsx|js|jsx|mts|cts)$/i, '');
  // 去常见分层后缀，按长度从长到短避免误删
  base = base.replace(/(Aggregators?|Routes?|Services?|Stores?|Hooks?|Controller)$/i, '');
  return base.toLowerCase();
}

/**
 * 从测试文件路径提取可匹配键。
 *
 * 规则：
 *  - 去 tests/unit/、tests/bff/、__tests__/ 等目录前缀不影响（只取最后一段）；
 *  - 去 .test.ts / .spec.ts / .test.tsx / .spec.tsx 等测试后缀；
 *  - 去尾部 .ts / .tsx；
 *  - 去开头 test- 前缀；
 *  - 去尾部 Aggregator / Routes 等后缀（与源文件键对齐）；
 *  - 全小写。
 *
 * @example
 * normalizeTestKey('tests/unit/doctorWorkbench.test.ts'); // 'doctorworkbench'
 * normalizeTestKey('tests/unit/AdminUserRoutes.test.ts');  // 'adminuser'
 */
export function normalizeTestKey(path: string): string {
  const s = normalizeSeparators(path);
  let base = s.split('/').pop() ?? s;
  base = base.replace(/\.(test|spec)\.(ts|tsx|js|jsx|mts|cts)$/i, '');
  base = base.replace(/\.(ts|tsx|js|jsx|mts|cts)$/i, '');
  base = base.replace(/^test[-_]/i, '');
  base = base.replace(/(Aggregators?|Routes?|Services?|Stores?|Hooks?|Controller)$/i, '');
  return base.toLowerCase();
}

/**
 * 把源文件路径归一到业务模块桶。
 *
 * 判定优先级（命中即返回）：
 *  1. doctor：医生 / 门诊 / 手术 / 诊断 / 病程 / 出院小结等
 *  2. nurse：护士 / 住院 / 病区 / 床位 / 交接 / 管路 / VTE / ICU 镇静等
 *  3. pharma：药师 / 药房 / 库存 / 处方审核 / 用药 / 营养评估等
 *  4. admin：管理后台 / 用户 / 角色 / 租户 / 审计 / 配置 / 安全 / 备份等
 *  5. other：其余（患者门户 / 智能体 / 公共组件等，不计入核心门禁）
 *
 * 纯函数：仅依据路径字符串判定，不读取运行时上下文。
 */
export function classifyModule(path: string): CoverageModule {
  const s = normalizeSeparators(path).toLowerCase();

  // doctor：医生侧临床业务
  if (
    /(doctor|outpatient|opd|surgery|surgeon|mdt|consult|diagnos|admission|progress|discharge|deep.*prescription|physician|ambulatory)/.test(
      s,
    )
  ) {
    return 'doctor';
  }

  // nurse：护士侧 / 住院护理
  if (
    /(nurse|nursing|inpatient|ward|bed|sbar|handoff|tube|picc|vte|icu|sedation|medadmin|chemo|io.*balance|event.*review|medication.*admin)/.test(
      s,
    )
  ) {
    return 'nurse';
  }

  // pharma：药师 / 药品 / 处方
  if (
    /(pharma|pharmacy|drug|prescription|dispense|inventory|stopbang|nutrition|medreview|med-?review)/.test(
      s,
    )
  ) {
    return 'pharma';
  }

  // admin：系统管理 / 权限 / 审计
  if (
    /(admin|superadmin|super-admin|role|user|tenant|audit|login|permission|config|backup|webhook|migration|security|mfa|log)/.test(
      s,
    )
  ) {
    return 'admin';
  }

  return 'other';
}

/* -------------------------------------------------------------------------
 * 核心 aggregator 静态清单（覆盖率质量门禁考核范围）
 * ---------------------------------------------------------------------- */

/**
 * 核心业务 aggregator 静态清单【生产就绪质量门禁】。
 *
 * 覆盖四桶关键 aggregator（doctor / nurse / pharma / admin）：
 *  - 新增核心 aggregator 时需同步加入本清单，否则不纳入门禁考核；
 *  - lines 字段为估算规模，仅用于前端展示排序，不参与覆盖率计算；
 *  - 路由层（routes/testCoverage.ts）以此清单为考核范围，扫描 tests/unit
 *    目录与归一键匹配，得出真实覆盖率。
 *
 * 持续优化：后续可改为启动时扫描 src/bff/aggregators/*.ts 动态生成。
 */
export const CORE_AGGREGATOR_INVENTORY: readonly SourceFileInput[] = [
  // ===== doctor 医生侧 =====
  { path: 'src/bff/aggregators/doctorWorkbenchAggregator.ts', lines: 820 },
  { path: 'src/bff/aggregators/outpatientAggregator.ts', lines: 640 },
  { path: 'src/bff/aggregators/surgeryAggregator.ts', lines: 720 },
  { path: 'src/bff/aggregators/consultationAggregator.ts', lines: 480 },
  { path: 'src/bff/aggregators/diagnosisSuggestionAggregator.ts', lines: 420 },
  { path: 'src/bff/aggregators/admissionNoteAggregator.ts', lines: 610 },
  { path: 'src/bff/aggregators/progressNoteAggregator.ts', lines: 520 },
  { path: 'src/bff/aggregators/dischargeSummaryAggregator.ts', lines: 630 },
  { path: 'src/bff/aggregators/deepPrescriptionReviewAggregator.ts', lines: 460 },
  { path: 'src/bff/aggregators/mdtAggregator.ts', lines: 380 },

  // ===== nurse 护士侧 =====
  { path: 'src/bff/aggregators/nurseStationAggregator.ts', lines: 720 },
  { path: 'src/bff/aggregators/nursingRecordAggregator.ts', lines: 610 },
  { path: 'src/bff/aggregators/nursingRiskAggregator.ts', lines: 520 },
  { path: 'src/bff/aggregators/inpatientAggregator.ts', lines: 740 },
  { path: 'src/bff/aggregators/sbarAggregator.ts', lines: 360 },
  { path: 'src/bff/aggregators/bedMapAggregator.ts', lines: 410 },
  { path: 'src/bff/aggregators/tubeCareAggregator.ts', lines: 320 },
  { path: 'src/bff/aggregators/vteAggregator.ts', lines: 430 },
  { path: 'src/bff/aggregators/nurseHandoffAggregator.ts', lines: 380 },
  { path: 'src/bff/aggregators/nursingAdminAggregator.ts', lines: 440 },

  // ===== pharma 药师侧 =====
  { path: 'src/bff/aggregators/pharmacyAggregator.ts', lines: 620 },
  { path: 'src/bff/aggregators/drugInventoryAggregator.ts', lines: 510 },
  { path: 'src/bff/aggregators/drugReviewAggregator.ts', lines: 430 },
  { path: 'src/bff/aggregators/prescriptionReviewAggregator.ts', lines: 520 },
  { path: 'src/bff/aggregators/medReviewAggregator.ts', lines: 410 },
  { path: 'src/bff/aggregators/pharmaMuseAggregator.ts', lines: 360 },

  // ===== admin 管理后台 =====
  { path: 'src/bff/aggregators/adminUserAggregator.ts', lines: 610 },
  { path: 'src/bff/aggregators/adminMuseAggregator.ts', lines: 520 },
  { path: 'src/bff/aggregators/auditLogAggregator.ts', lines: 510 },
  { path: 'src/bff/aggregators/systemConfigAggregator.ts', lines: 420 },
  { path: 'src/bff/aggregators/roleAdminAggregator.ts', lines: 410 },
  { path: 'src/bff/aggregators/superAdminAggregator.ts', lines: 430 },
];

/* -------------------------------------------------------------------------
 * 核心纯函数
 * ---------------------------------------------------------------------- */

/**
 * 计算测试覆盖率（纯函数）。
 *
 * 匹配口径：
 *  - 每个源文件通过 normalizeSourceKey 得到键；
 *  - 每个测试文件通过 normalizeTestKey 得到键；
 *  - 源文件键 == 测试文件键 视为「已覆盖」（covered=true）；
 *  - 多测一源时取第一个命中的测试文件路径展示。
 *
 * 统计口径：
 *  - total / covered / uncovered：源文件计数；
 *  - rate = covered / total，total 为 0 时记 1（空清单视为达标）；
 *  - byModule：doctor / nurse / pharma / admin / other 五桶各自 total /
 *    covered / uncovered / rate / meetsGate；
 *  - coreGateOk：doctor / nurse / pharma / admin 四桶 rate 全部 ≥ gateThreshold
 *    （空桶视为达标）；other 桶不计入门禁；
 *  - trend：把当前快照（{ label: generatedAt, rate, covered, total }）追加到
 *    options.history 尾部，按入参顺序返回。
 *
 * @param sourceFiles 源文件清单（考核范围）
 * @param testFiles 测试文件清单（已发现的 .test.ts 文件）
 * @param options 可选：门禁阈值 / 生成时间 / 历史趋势
 * @returns 整份覆盖率报告
 *
 * @example
 * calculateTestCoverage(
 *   [{ path: 'src/bff/aggregators/doctorWorkbenchAggregator.ts' }],
 *   [{ path: 'tests/unit/doctorWorkbench.test.ts' }],
 * );
 * // rate = 1, coreGateOk = true
 */
export function calculateTestCoverage(
  sourceFiles: readonly SourceFileInput[],
  testFiles: readonly TestFileInput[],
  options: CoverageOptions = {},
): Coverage {
  const gateThreshold = options.gateThreshold ?? 0.8;
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  // 构建测试键 → 测试文件路径映射（多测一源取首个）
  const testKeyMap = new Map<string, string>();
  for (const tf of testFiles) {
    const k = normalizeTestKey(tf.path);
    if (k && !testKeyMap.has(k)) {
      testKeyMap.set(k, tf.path);
    }
  }

  // 逐源文件判定覆盖
  const files: FileCoverage[] = sourceFiles.map((sf) => {
    const key = normalizeSourceKey(sf.path);
    const testPath = testKeyMap.get(key);
    return {
      path: sf.path,
      testPath,
      covered: testPath !== undefined,
      module: classifyModule(sf.path),
      lines: sf.lines ?? 0,
    };
  });

  // 分桶初始化
  const emptyModule = (module: CoverageModule): ModuleCoverage => ({
    module,
    total: 0,
    covered: 0,
    uncovered: 0,
    rate: 1,
    meetsGate: true,
  });
  const byModule: Record<CoverageModule, ModuleCoverage> = {
    doctor: emptyModule('doctor'),
    nurse: emptyModule('nurse'),
    pharma: emptyModule('pharma'),
    admin: emptyModule('admin'),
    other: emptyModule('other'),
  };

  let covered = 0;
  const uncoveredFiles: FileCoverage[] = [];

  for (const f of files) {
    const bucket = byModule[f.module];
    bucket.total += 1;
    if (f.covered) {
      bucket.covered += 1;
      covered += 1;
    } else {
      bucket.uncovered += 1;
      uncoveredFiles.push(f);
    }
  }

  // 计算每桶 rate 与 meetsGate
  for (const bucket of [byModule.doctor, byModule.nurse, byModule.pharma, byModule.admin, byModule.other]) {
    bucket.rate = bucket.total === 0 ? 1 : Number((bucket.covered / bucket.total).toFixed(4));
    bucket.meetsGate = bucket.rate >= gateThreshold;
  }

  const total = sourceFiles.length;
  const rate = total === 0 ? 1 : Number((covered / total).toFixed(4));

  // 核心门禁：doctor / nurse / pharma / admin 四桶全部达标
  const coreGateOk =
    byModule.doctor.meetsGate &&
    byModule.nurse.meetsGate &&
    byModule.pharma.meetsGate &&
    byModule.admin.meetsGate;

  // 趋势：历史 + 当前快照
  const currentPoint: CoverageTrendPoint = { label: generatedAt, rate, covered, total };
  const trend: CoverageTrendPoint[] = [...(options.history ?? []), currentPoint];

  return {
    generatedAt,
    gateThreshold,
    total,
    covered,
    uncovered: uncoveredFiles.length,
    rate,
    coreGateOk,
    byModule,
    files,
    uncoveredFiles,
    trend,
  };
}
