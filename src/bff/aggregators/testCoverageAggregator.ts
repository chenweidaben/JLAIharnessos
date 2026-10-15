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

/* =========================================================================
 * M137-C 测试覆盖率冲刺：admin 管理后台聚合器覆盖率门禁
 * -------------------------------------------------------------------------
 * 本节在 calculateTestCoverage（doctor/nurse/pharma/admin 四桶粗粒度）之上，
 * 把 admin 桶进一步细化为六个子模块，作为 admin 相关 aggregator 覆盖率
 * ≥80% 的考核口径：
 *
 *   - dashboard       驾驶舱（医院 / 科室 / 高管看板）
 *   - performance     科室绩效
 *   - quality         医疗质量
 *   - userManagement  用户管理
 *   - systemConfig    系统配置
 *   - backupRestore   备份恢复
 *
 * 全部为纯函数：不读盘、不发 HTTP、不连数据库，路由层负责 I/O 与鉴权。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * =======================================================================*/

/** admin 六个子模块桶 */
export type AdminSubmodule =
  | 'dashboard'
  | 'performance'
  | 'quality'
  | 'userManagement'
  | 'systemConfig'
  | 'backupRestore'
  | 'other';

/** admin 运维角色（决定覆盖率报表可见范围） */
export type AdminCoverageRole = 'superAdmin' | 'auditor' | 'viewer';

/** 单子模块覆盖明细 */
export interface AdminSubmoduleCoverage {
  /** 子模块桶 */
  submodule: Exclude<AdminSubmodule, 'other'>;
  /** 中文展示名 */
  label: string;
  /** 该子模块源文件总数 */
  total: number;
  /** 已覆盖源文件数 */
  covered: number;
  /** 未覆盖源文件数 */
  uncovered: number;
  /** 覆盖率 0..1（total 为 0 时记 1） */
  rate: number;
  /** 是否达到门禁阈值（默认 0.8） */
  meetsGate: boolean;
}

/** 未覆盖文件明细 */
export interface AdminUncoveredFile {
  /** 源文件路径 */
  path: string;
  /** 所属子模块 */
  submodule: Exclude<AdminSubmodule, 'other'>;
  /** 缺口严重度（数字越大越优先补测） */
  severity: number;
}

/** getAdminTestCoverage 输出 */
export interface AdminTestCoverage {
  /** 报告生成时间（ISO） */
  generatedAt: string;
  /** 门禁阈值（默认 0.8） */
  gateThreshold: number;
  /** admin 考核源文件总数（不含 other） */
  total: number;
  /** 已覆盖数 */
  covered: number;
  /** 未覆盖数 */
  uncovered: number;
  /** admin 整体覆盖率 0..1（total 为 0 时记 1） */
  rate: number;
  /** 六个子模块全部达标（空桶视为达标） */
  gateOk: boolean;
  /** 按子模块分桶统计 */
  bySubmodule: Record<Exclude<AdminSubmodule, 'other'>, AdminSubmoduleCoverage>;
  /** 未覆盖文件清单（按严重度降序） */
  uncoveredFiles: AdminUncoveredFile[];
  /**
   * 缺口清单：按子模块风险排序的待补测建议，
   * backupRestore / systemConfig / userManagement 这类高风险子模块优先。
   */
  gapList: AdminUncoveredFile[];
}

/** getAdminTestCoverage 可选项 */
export interface AdminCoverageOptions {
  /** 门禁阈值，默认 0.8（会被 clamp 到 [0,1]） */
  gateThreshold?: number;
  /** 生成时间（ISO）；测试可固定 */
  generatedAt?: string;
}

/** 子模块中文展示名 */
const ADMIN_SUBMODULE_LABEL: Record<Exclude<AdminSubmodule, 'other'>, string> = {
  dashboard: '驾驶舱',
  performance: '科室绩效',
  quality: '医疗质量',
  userManagement: '用户管理',
  systemConfig: '系统配置',
  backupRestore: '备份恢复',
};

/**
 * 子模块缺口严重度权重：风险越高越优先补测。
 * 备份恢复 / 系统配置 / 用户管理涉及数据安全与权限，优先级最高。
 */
const ADMIN_SUBMODULE_SEVERITY: Record<Exclude<AdminSubmodule, 'other'>, number> = {
  backupRestore: 100,
  systemConfig: 90,
  userManagement: 80,
  quality: 60,
  performance: 40,
  dashboard: 20,
};

/**
 * 把源文件路径归一到 admin 子模块桶（纯函数）。
 *
 * 判定优先级（命中即返回，顺序经过刻意安排以避免误分）：
 *  1. backupRestore：备份恢复（最高优先，避免被 config 等规则截胡）
 *  2. systemConfig：系统配置 / 安全 / 审计 / 日志 / 迁移 / MFA / Webhook
 *  3. userManagement：用户 / 角色 / 租户 / 员工
 *  4. quality：医疗质量 / QC / NQI / 质控
 *  5. performance：科室绩效 / 绩效基准 / 性能监控
 *  6. dashboard：驾驶舱 / 看板 / Cockpit / 首页
 *  7. other：其余（不计入 admin 门禁）
 */
export function classifyAdminSubmodule(path: string): AdminSubmodule {
  const s = normalizeSeparators(path).toLowerCase();
  const base = s.split('/').pop() ?? s;

  // 1. 备份恢复
  if (/(^|\/)(backup|restore)/.test(base) || /backuprestor/.test(base)) {
    return 'backupRestore';
  }

  // 2. 系统配置 / 安全 / 审计 / 日志
  if (
    /(systemconfig|migrationstatus|webhook|mfa|securitybaseline|datamasking|systemlog|auditlog|loginlog|thirdpartyapi|systemerror|systemintelligence|tenant)/.test(
      base,
    )
  ) {
    return 'systemConfig';
  }

  // 3. 用户管理
  if (/(adminuser|adminmuse|roleadmin|superadmin|staffmuse|realname|usersettings)/.test(base)) {
    return 'userManagement';
  }

  // 4. 医疗质量
  if (
    /(medicalquality|nursingnqi|recordquality|medicalqc|terminalqc|qcrectification|rectification|bloodquality|improvementoutcome|improvementtask)/.test(
      base,
    )
  ) {
    return 'quality';
  }

  // 5. 科室绩效（performance* 但排除 performanceOptimization / performanceMonitor 这类性能监控基础设施，归 dashboard 运维视图）
  if (/(deptperformance|performancebenchmark)/.test(base)) {
    return 'performance';
  }

  // 6. 驾驶舱 / 看板
  if (/(dashboard|cockpit|frontpage|hospitaltrend|operationalinsight|amdashboard|systemhealthdashboard|infectiondashboard)/.test(base)) {
    return 'dashboard';
  }

  return 'other';
}

/**
 * admin 核心 aggregator 静态清单【测试覆盖率冲刺 M137-C】。
 *
 * 六个子模块各自的考核范围；新增 admin 核心 aggregator 时需同步加入，
 * 否则不纳入 admin 覆盖率门禁。lines 为估算规模，仅用于展示排序。
 */
export const ADMIN_AGGREGATOR_INVENTORY: readonly SourceFileInput[] = [
  // ===== dashboard 驾驶舱 =====
  { path: 'src/bff/aggregators/dashboardAggregator.ts', lines: 300 },
  { path: 'src/bff/aggregators/hospitalDashboardAggregator.ts', lines: 620 },
  { path: 'src/bff/aggregators/ceoDashboardAggregator.ts', lines: 560 },
  { path: 'src/bff/aggregators/deptCockpitAggregator.ts', lines: 630 },
  { path: 'src/bff/aggregators/systemHealthDashboardAggregator.ts', lines: 300 },

  // ===== performance 科室绩效 =====
  { path: 'src/bff/aggregators/deptPerformanceAggregator.ts', lines: 510 },
  { path: 'src/bff/aggregators/performanceBenchmarkAggregator.ts', lines: 670 },

  // ===== quality 医疗质量 =====
  { path: 'src/bff/aggregators/medicalQualityAggregator.ts', lines: 380 },
  { path: 'src/bff/aggregators/recordQualityAggregator.ts', lines: 740 },
  { path: 'src/bff/aggregators/nursingNqiAggregator.ts', lines: 310 },
  { path: 'src/bff/aggregators/terminalQcAggregator.ts', lines: 380 },

  // ===== userManagement 用户管理 =====
  { path: 'src/bff/aggregators/adminUserAggregator.ts', lines: 610 },
  { path: 'src/bff/aggregators/adminMuseAggregator.ts', lines: 580 },
  { path: 'src/bff/aggregators/roleAdminAggregator.ts', lines: 230 },
  { path: 'src/bff/aggregators/superAdminAggregator.ts', lines: 400 },
  { path: 'src/bff/aggregators/tenantAggregator.ts', lines: 360 },

  // ===== systemConfig 系统配置 =====
  { path: 'src/bff/aggregators/systemConfigAggregator.ts', lines: 200 },
  { path: 'src/bff/aggregators/auditLogAggregator.ts', lines: 310 },
  { path: 'src/bff/aggregators/mfaAggregator.ts', lines: 140 },
  { path: 'src/bff/aggregators/migrationStatusAggregator.ts', lines: 370 },
  { path: 'src/bff/aggregators/webhookAggregator.ts', lines: 530 },
  { path: 'src/bff/aggregators/securityBaselineAggregator.ts', lines: 780 },
  { path: 'src/bff/aggregators/dataMaskingAggregator.ts', lines: 510 },
  { path: 'src/bff/aggregators/systemLogAggregator.ts', lines: 440 },

  // ===== backupRestore 备份恢复 =====
  { path: 'src/bff/aggregators/backupAggregator.ts', lines: 410 },
];

/** 六个 admin 子模块键（用于遍历） */
const ADMIN_SUBMODULE_KEYS: readonly Exclude<AdminSubmodule, 'other'>[] = [
  'dashboard',
  'performance',
  'quality',
  'userManagement',
  'systemConfig',
  'backupRestore',
];

/** 把阈值 clamp 到 [0,1]，非法值（NaN/负数/>1）归到最近边界 */
function clampThreshold(t: number): number {
  if (!Number.isFinite(t)) return 0.8;
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

/**
 * 计算 admin 管理后台聚合器覆盖率（纯函数）【测试覆盖率冲刺 M137-C】。
 *
 * 匹配口径与 calculateTestCoverage 一致：源文件键 == 测试文件键 视为已覆盖。
 * 仅考核 classifyAdminSubmodule 归类为六个 admin 子模块的源文件；
 * 归类为 'other' 的文件不计入 total / gateOk，仅在内部丢弃（避免污染 admin 门禁）。
 *
 * @param sourceFiles 待考核的 admin 源文件清单（通常传 ADMIN_AGGREGATOR_INVENTORY）
 * @param testFiles 已发现的测试文件清单
 * @param options 可选：门禁阈值 / 生成时间
 * @returns admin 覆盖率报告（含六子模块分桶、缺口清单、门禁结论）
 */
export function getAdminTestCoverage(
  sourceFiles: readonly SourceFileInput[],
  testFiles: readonly TestFileInput[],
  options: AdminCoverageOptions = {},
): AdminTestCoverage {
  const gateThreshold = clampThreshold(options.gateThreshold ?? 0.8);
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  // 测试键映射（与 calculateTestCoverage 同口径，多测一源取首个）
  const testKeyMap = new Map<string, string>();
  for (const tf of testFiles) {
    const k = normalizeTestKey(tf.path);
    if (k && !testKeyMap.has(k)) testKeyMap.set(k, tf.path);
  }

  // 初始化六桶
  const bySubmodule = {} as Record<Exclude<AdminSubmodule, 'other'>, AdminSubmoduleCoverage>;
  for (const key of ADMIN_SUBMODULE_KEYS) {
    bySubmodule[key] = {
      submodule: key,
      label: ADMIN_SUBMODULE_LABEL[key],
      total: 0,
      covered: 0,
      uncovered: 0,
      rate: 1,
      meetsGate: true,
    };
  }

  const uncoveredFiles: AdminUncoveredFile[] = [];
  let covered = 0;

  for (const sf of sourceFiles) {
    const sub = classifyAdminSubmodule(sf.path);
    if (sub === 'other') continue; // 非 admin 考核范围
    const bucket = bySubmodule[sub];
    bucket.total += 1;
    const hit = testKeyMap.has(normalizeSourceKey(sf.path));
    if (hit) {
      bucket.covered += 1;
      covered += 1;
    } else {
      bucket.uncovered += 1;
      uncoveredFiles.push({
        path: sf.path,
        submodule: sub,
        severity: ADMIN_SUBMODULE_SEVERITY[sub],
      });
    }
  }

  // 计算每桶 rate / meetsGate
  for (const key of ADMIN_SUBMODULE_KEYS) {
    const b = bySubmodule[key];
    b.rate = b.total === 0 ? 1 : Number((b.covered / b.total).toFixed(4));
    b.meetsGate = b.rate >= gateThreshold;
  }

  const total = ADMIN_SUBMODULE_KEYS.reduce((n, k) => n + bySubmodule[k].total, 0);
  const rate = total === 0 ? 1 : Number((covered / total).toFixed(4));
  const gateOk = ADMIN_SUBMODULE_KEYS.every((k) => bySubmodule[k].meetsGate);

  // 缺口清单：先按严重度降序，同级按路径升序保证确定性
  const gapList = [...uncoveredFiles].sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return a.path.localeCompare(b.path);
  });

  return {
    generatedAt,
    gateThreshold,
    total,
    covered,
    uncovered: uncoveredFiles.length,
    rate,
    gateOk,
    bySubmodule,
    uncoveredFiles,
    gapList,
  };
}

/** 角色可见的子模块范围 */
const ROLE_VISIBLE_SUBMODULES: Record<AdminCoverageRole, readonly Exclude<AdminSubmodule, 'other'>[]> = {
  superAdmin: ADMIN_SUBMODULE_KEYS, // 全见
  auditor: ['dashboard', 'performance', 'quality', 'userManagement'], // 审计可见业务四域，不见配置/备份敏感细节
  viewer: ['dashboard'], // 只读访客只见驾驶舱汇总
};

/** 角色视图输出（权限控制） */
export interface AdminCoverageView {
  /** 查看角色 */
  role: AdminCoverageRole;
  /** 角色可见的子模块 */
  visibleSubmodules: readonly Exclude<AdminSubmodule, 'other'>[];
  /** 是否脱敏（隐藏未覆盖文件原始路径） */
  masked: boolean;
  /** 整体覆盖率（始终可见） */
  rate: number;
  /** 门禁结论（始终可见） */
  gateOk: boolean;
  /** 按可见子模块过滤后的分桶统计 */
  bySubmodule: Partial<Record<Exclude<AdminSubmodule, 'other'>, AdminSubmoduleCoverage>>;
  /** 未覆盖文件：viewer 脱敏（仅计数不返回路径），其余按可见子模块过滤 */
  uncoveredFiles: AdminUncoveredFile[];
}

/**
 * 按角色裁剪 admin 覆盖率报表（纯函数，权限控制）。
 *
 * 规则：
 *  - superAdmin：六子模块全见，保留未覆盖文件原始路径；
 *  - auditor：只见 dashboard / performance / quality / userManagement，
 *    systemConfig / backupRestore 属敏感配置域，对审计角色隐藏原始缺口路径；
 *  - viewer：只见 dashboard 汇总，bySubmodule 仅留 dashboard，
 *    uncoveredFiles 被清空（masked=true），避免泄露内部文件结构。
 *
 * 路由层在鉴权后调用本函数，确保越权角色拿不到敏感子模块明细。
 */
export function filterAdminCoverageByRole(
  report: AdminTestCoverage,
  role: AdminCoverageRole,
): AdminCoverageView {
  const visible = ROLE_VISIBLE_SUBMODULES[role] ?? ROLE_VISIBLE_SUBMODULES.viewer;
  const visibleSet = new Set(visible);
  const masked = role === 'viewer';

  const bySubmodule: AdminCoverageView['bySubmodule'] = {};
  for (const key of ADMIN_SUBMODULE_KEYS) {
    if (visibleSet.has(key)) bySubmodule[key] = report.bySubmodule[key];
  }

  const uncoveredFiles = masked
    ? []
    : report.uncoveredFiles.filter((f) => visibleSet.has(f.submodule));

  return {
    role,
    visibleSubmodules: visible,
    masked,
    rate: report.rate,
    gateOk: report.gateOk,
    bySubmodule,
    uncoveredFiles,
  };
}

/* =========================================================================
 * M137-A 测试覆盖率冲刺：doctor 临床五域聚合器覆盖率门禁
 * -------------------------------------------------------------------------
 * 【测试覆盖率冲刺】
 * 在 calculateTestCoverage（doctor/nurse/pharma/admin 四桶粗粒度）之上，
 * 把医生侧临床工作流拆为五个子域，作为 doctor 相关 aggregator 覆盖率
 * ≥80% 的考核口径：
 *
 *   - outpatient    门诊（候诊队列 / 就诊快照 / ICD 搜索 / 门诊统计）
 *   - inpatient     住院（ADT 状态机 / 床位图 / 在院列表）
 *   - prescription  处方（处方审方 / 处方点评 / 合理用药）
 *   - medicalRecord 病历（病历草稿 / 病程 / 出院小结 / 病历质控）
 *   - followUp      随访（术后 / 慢病 / 出院复诊随访计划与提醒）
 *
 * 全部为纯函数：不读盘、不发 HTTP、不连数据库，路由层负责 I/O 与鉴权。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * =======================================================================*/

/** doctor 临床五域桶 */
export type DoctorSubdomain =
  | 'outpatient'
  | 'inpatient'
  | 'prescription'
  | 'medicalRecord'
  | 'followUp';

/** 单子域覆盖明细 */
export interface DoctorSubdomainCoverage {
  /** 子域标识 */
  subdomain: DoctorSubdomain;
  /** 中文展示名 */
  label: string;
  /** 该子域源文件总数 */
  total: number;
  /** 已覆盖（存在对应测试键）源文件数 */
  covered: number;
  /** 未覆盖源文件数 */
  uncovered: number;
  /** 覆盖率 0..1（total 为 0 时记 1） */
  rate: number;
  /** 是否达到门禁阈值（默认 0.8） */
  meetsGate: boolean;
}

/** getDoctorTestCoverage 输出 */
export interface DoctorTestCoverage {
  /** 报告生成时间（ISO） */
  generatedAt: string;
  /** 门禁阈值（默认 0.8，会被 clamp 到 [0,1]） */
  gateThreshold: number;
  /** doctor 五域考核源文件总数 */
  total: number;
  /** 已覆盖数 */
  covered: number;
  /** 未覆盖数 */
  uncovered: number;
  /** doctor 整体覆盖率 0..1（total 为 0 时记 1） */
  rate: number;
  /** 五子域全部达标（空桶视为达标） */
  gateOk: boolean;
  /** 按子域分桶统计 */
  bySubdomain: Record<DoctorSubdomain, DoctorSubdomainCoverage>;
  /** 未覆盖源文件清单（保持入参顺序） */
  uncoveredFiles: Array<{ path: string; subdomain: DoctorSubdomain }>;
}

/** doctor 五域键（用于遍历） */
export const DOCTOR_SUBDOMAIN_KEYS: readonly DoctorSubdomain[] = [
  'outpatient',
  'inpatient',
  'prescription',
  'medicalRecord',
  'followUp',
];

/** 子域中文展示名 */
const DOCTOR_SUBDOMAIN_LABEL: Record<DoctorSubdomain, string> = {
  outpatient: '门诊',
  inpatient: '住院',
  prescription: '处方',
  medicalRecord: '病历',
  followUp: '随访',
};

/**
 * 把源文件路径归一到 doctor 临床子域桶（纯函数）。
 *
 * 判定优先级（命中即返回，顺序经过刻意安排以避免处方/病历等关键词串桶）：
 *  1. followUp      随访（followUp / followupAppt / postopFollowup）
 *  2. medicalRecord 病历（medicalRecord / recordQuality / EMR / 病程 / 出院小结）
 *  3. prescription  处方（prescription / pharmacy / drug / medReview）
 *  4. inpatient      住院（inpatient / ward / bed / ADT / 护理）
 *  5. outpatient     门诊（兜底桶：其余医生侧聚合器）
 */
export function classifyDoctorSubdomain(path: string): DoctorSubdomain {
  const s = normalizeSeparators(path).toLowerCase();
  const base = s.split('/').pop() ?? s;

  // 1. 随访
  if (/(followup|follow_up|followupappt|postopfollowup)/.test(base)) return 'followUp';

  // 2. 病历
  if (
    /(medicalrecord|recordquality|recorddraft|medicalrecorddraft|emr|progressnote|dischargesummary|admissionnote|medicalarchive|medicalcopy|medicalqc|medicalquality|emrtemplate|recordquality)/.test(
      base,
    )
  ) {
    return 'medicalRecord';
  }

  // 3. 处方 / 药师
  if (/(prescription|pharmacy|pharma|drug|medreview|deep.*prescription)/.test(base)) return 'prescription';

  // 4. 住院
  if (/(inpatient|ward|bed|sbar|handoff|tube|picc|vte|icu|medadmin|chemo)/.test(base)) return 'inpatient';

  // 5. 门诊（兜底）
  return 'outpatient';
}

/**
 * doctor 五域核心 aggregator 静态清单【测试覆盖率冲刺 M137-A】。
 *
 * 五个子域各自的考核范围；新增 doctor 核心 aggregator 时需同步加入，
 * 否则不纳入 doctor 覆盖率门禁。lines 为估算规模，仅用于展示排序。
 */
export const DOCTOR_AGGREGATOR_INVENTORY: readonly SourceFileInput[] = [
  // ===== outpatient 门诊 =====
  { path: 'src/bff/aggregators/outpatientAggregator.ts', lines: 640 },
  { path: 'src/bff/aggregators/opdWorkstationAggregator.ts', lines: 260 },
  { path: 'src/bff/aggregators/outpatientAssistantAggregator.ts', lines: 420 },
  { path: 'src/bff/aggregators/consultationAggregator.ts', lines: 480 },
  { path: 'src/bff/aggregators/surgeryAggregator.ts', lines: 720 },

  // ===== inpatient 住院 =====
  { path: 'src/bff/aggregators/inpatientAggregator.ts', lines: 740 },
  { path: 'src/bff/aggregators/inpatientAssistantAggregator.ts', lines: 560 },
  { path: 'src/bff/aggregators/inpatientCareAggregator.ts', lines: 620 },
  { path: 'src/bff/aggregators/inpatientInsightAggregator.ts', lines: 480 },

  // ===== prescription 处方 =====
  { path: 'src/bff/aggregators/prescriptionReviewAggregator.ts', lines: 200 },
  { path: 'src/bff/aggregators/deepPrescriptionReviewAggregator.ts', lines: 460 },
  { path: 'src/bff/aggregators/drugReviewAggregator.ts', lines: 320 },
  { path: 'src/bff/aggregators/pharmacyAggregator.ts', lines: 620 },

  // ===== medicalRecord 病历 =====
  { path: 'src/bff/aggregators/medicalRecordDraftAggregator.ts', lines: 240 },
  { path: 'src/bff/aggregators/progressNoteAggregator.ts', lines: 160 },
  { path: 'src/bff/aggregators/dischargeSummaryAggregator.ts', lines: 180 },
  { path: 'src/bff/aggregators/admissionNoteAggregator.ts', lines: 180 },
  { path: 'src/bff/aggregators/recordQualityAggregator.ts', lines: 740 },

  // ===== followUp 随访 =====
  { path: 'src/bff/aggregators/followUpAggregator.ts', lines: 280 },
  { path: 'src/bff/aggregators/followupApptAggregator.ts', lines: 160 },
  { path: 'src/bff/aggregators/postopFollowupAggregator.ts', lines: 140 },
];

/**
 * 计算 doctor 临床五域聚合器覆盖率（纯函数）【测试覆盖率冲刺 M137-A】。
 *
 * 匹配口径与 calculateTestCoverage 一致：源文件键 == 测试文件键 视为已覆盖。
 * 仅考核 classifyDoctorSubdomain 归类为五子域的源文件。
 *
 * @param sourceFiles 待考核的 doctor 源文件清单（通常传 DOCTOR_AGGREGATOR_INVENTORY）
 * @param testFiles 已发现的测试文件清单
 * @param options 可选：门禁阈值 / 生成时间
 * @returns doctor 五域覆盖率报告（含五子域分桶、门禁结论）
 */
export function getDoctorTestCoverage(
  sourceFiles: readonly SourceFileInput[],
  testFiles: readonly TestFileInput[],
  options: { gateThreshold?: number; generatedAt?: string } = {},
): DoctorTestCoverage {
  const gateThreshold = clampThreshold(options.gateThreshold ?? 0.8);
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  // 测试键映射（与 calculateTestCoverage 同口径，多测一源取首个）
  const testKeyMap = new Map<string, string>();
  for (const tf of testFiles) {
    const k = normalizeTestKey(tf.path);
    if (k && !testKeyMap.has(k)) testKeyMap.set(k, tf.path);
  }

  // 初始化五桶
  const bySubdomain = {} as Record<DoctorSubdomain, DoctorSubdomainCoverage>;
  for (const key of DOCTOR_SUBDOMAIN_KEYS) {
    bySubdomain[key] = {
      subdomain: key,
      label: DOCTOR_SUBDOMAIN_LABEL[key],
      total: 0,
      covered: 0,
      uncovered: 0,
      rate: 1,
      meetsGate: true,
    };
  }

  const uncoveredFiles: Array<{ path: string; subdomain: DoctorSubdomain }> = [];
  let covered = 0;

  for (const sf of sourceFiles) {
    const sub = classifyDoctorSubdomain(sf.path);
    const bucket = bySubdomain[sub];
    bucket.total += 1;
    const hit = testKeyMap.has(normalizeSourceKey(sf.path));
    if (hit) {
      bucket.covered += 1;
      covered += 1;
    } else {
      bucket.uncovered += 1;
      uncoveredFiles.push({ path: sf.path, subdomain: sub });
    }
  }

  // 计算每桶 rate / meetsGate
  for (const key of DOCTOR_SUBDOMAIN_KEYS) {
    const b = bySubdomain[key];
    b.rate = b.total === 0 ? 1 : Number((b.covered / b.total).toFixed(4));
    b.meetsGate = b.rate >= gateThreshold;
  }

  const total = DOCTOR_SUBDOMAIN_KEYS.reduce((n, k) => n + bySubdomain[k].total, 0);
  const rate = total === 0 ? 1 : Number((covered / total).toFixed(4));
  const gateOk = DOCTOR_SUBDOMAIN_KEYS.every((k) => bySubdomain[k].meetsGate);

  return {
    generatedAt,
    gateThreshold,
    total,
    covered,
    uncovered: uncoveredFiles.length,
    rate,
    gateOk,
    bySubdomain,
    uncoveredFiles,
  };
}

/* =========================================================================
 * M137-B 测试覆盖率冲刺：nurse + pharma 聚合器覆盖率门禁
 * -------------------------------------------------------------------------
 * 【测试覆盖率冲刺】
 * 在 calculateTestCoverage（doctor/nurse/pharma/admin 四桶粗粒度）之上，
 * 把护士侧（nurse）与药师侧（pharma）两桶合并为一个专项看板，
 * 作为 M137-B 覆盖率冲刺的考核口径：
 *
 *   - nurse：交接班 / 护理风险 / 护理计划 / 在院护理 / 管路 / VTE 等
 *   - pharma：处方点评 / 合理用药（相互作用）/ 药品库存 / 药事管理等
 *
 * 全部为纯函数：不读盘、不发 HTTP、不连数据库，路由层负责 I/O 与鉴权。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * =======================================================================*/

/** nurse + pharma 专项输出 */
export interface NursePharmaCoverage {
  /** 报告生成时间（ISO） */
  generatedAt: string;
  /** 门禁阈值（默认 0.8，会被 clamp 到 [0,1]） */
  gateThreshold: number;
  /** nurse 桶 total/covered/rate/meetsGate */
  nurse: ModuleCoverage;
  /** pharma 桶 total/covered/rate/meetsGate */
  pharma: ModuleCoverage;
  /** nurse 桶是否达标（≥ gateThreshold） */
  nurseGateOk: boolean;
  /** pharma 桶是否达标（≥ gateThreshold） */
  pharmaGateOk: boolean;
  /** 两桶同时达标（空桶视为达标） */
  nursePharmaGateOk: boolean;
  /** 合并后源文件总数 */
  total: number;
  /** 合并后已覆盖源文件数 */
  covered: number;
  /** 合并后整体覆盖率 0..1（total 为 0 时记 1） */
  totalRate: number;
  /** 未覆盖源文件清单（保持入参顺序） */
  uncoveredFiles: FileCoverage[];
}

/**
 * 计算 nurse + pharma 专项聚合器覆盖率（纯函数）【测试覆盖率冲刺 M137-B】。
 *
 * 匹配口径与 calculateTestCoverage 一致：源文件键 == 测试文件键 视为已覆盖。
 * 仅考核 classifyModule 归为 'nurse' 或 'pharma' 的源文件；
 * doctor / admin / other 桶不纳入本专项。
 *
 * @param sourceFiles 待考核源文件清单（通常传 CORE_AGGREGATOR_INVENTORY）
 * @param testFiles   已发现的测试文件清单
 * @param options     可选：门禁阈值 / 生成时间
 * @returns nurse + pharma 专项覆盖率报告
 */
export function getNursePharmaTestCoverage(
  sourceFiles: readonly SourceFileInput[],
  testFiles: readonly TestFileInput[],
  options: { gateThreshold?: number; generatedAt?: string } = {},
): NursePharmaCoverage {
  const gateThreshold = clampThreshold(options.gateThreshold ?? 0.8);
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  // 测试键映射（与 calculateTestCoverage 同口径，多测一源取首个）
  const testKeyMap = new Map<string, string>();
  for (const tf of testFiles) {
    const k = normalizeTestKey(tf.path);
    if (k && !testKeyMap.has(k)) testKeyMap.set(k, tf.path);
  }

  const emptyBucket = (module: CoverageModule): ModuleCoverage => ({
    module,
    total: 0,
    covered: 0,
    uncovered: 0,
    rate: 1,
    meetsGate: true,
  });
  const nurse = emptyBucket('nurse');
  const pharma = emptyBucket('pharma');

  const uncoveredFiles: FileCoverage[] = [];

  for (const sf of sourceFiles) {
    const module = classifyModule(sf.path);
    if (module !== 'nurse' && module !== 'pharma') continue; // 仅考核 nurse+pharma
    const bucket = module === 'nurse' ? nurse : pharma;
    bucket.total += 1;
    const key = normalizeSourceKey(sf.path);
    const testPath = testKeyMap.get(key);
    const covered = testPath !== undefined;
    if (covered) {
      bucket.covered += 1;
    } else {
      bucket.uncovered += 1;
      uncoveredFiles.push({
        path: sf.path,
        covered: false,
        module,
        lines: sf.lines ?? 0,
      });
    }
  }

  // 计算每桶 rate / meetsGate
  for (const b of [nurse, pharma]) {
    b.rate = b.total === 0 ? 1 : Number((b.covered / b.total).toFixed(4));
    b.meetsGate = b.rate >= gateThreshold;
  }

  const total = nurse.total + pharma.total;
  const covered = nurse.covered + pharma.covered;
  const totalRate = total === 0 ? 1 : Number((covered / total).toFixed(4));

  return {
    generatedAt,
    gateThreshold,
    nurse,
    pharma,
    nurseGateOk: nurse.meetsGate,
    pharmaGateOk: pharma.meetsGate,
    nursePharmaGateOk: nurse.meetsGate && pharma.meetsGate,
    total,
    covered,
    totalRate,
    uncoveredFiles,
  };
}

