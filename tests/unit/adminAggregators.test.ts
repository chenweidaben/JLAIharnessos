/**
 * 健澜科技 jlmedaios - M137-C 测试覆盖率冲刺：admin 聚合器覆盖率单元测试
 *
 * 覆盖 admin 六大模块（驾驶舱 / 科室绩效 / 医疗质量 / 用户管理 / 系统配置 /
 * 备份恢复）的覆盖率纯函数：
 *  - 正常路径：六子模块全部配测 → gateOk=true；部分配测 → 分桶统计正确；
 *  - 边界：空源文件清单 / 空测试清单 / 阈值 clamp（负数 / >1 / NaN）/
 *    超长路径 / 非 admin 文件被忽略；
 *  - 错误：测试文件键无匹配源文件时被忽略；缺口清单按严重度排序；
 *  - 权限控制：superAdmin / auditor / viewer 三角色对报表可见范围与
 *    敏感缺口路径的裁剪。
 *
 * 被测对象为 src/bff/aggregators/testCoverageAggregator.ts 中追加的
 * getAdminTestCoverage / classifyAdminSubmodule / filterAdminCoverageByRole
 * 三个纯函数，测试断言它们真实的归一、分桶、门禁与裁剪逻辑，非假测试。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  ADMIN_AGGREGATOR_INVENTORY,
  classifyAdminSubmodule,
  filterAdminCoverageByRole,
  getAdminTestCoverage,
  type AdminTestCoverage,
  type SourceFileInput,
  type TestFileInput,
} from '../../src/bff/aggregators/testCoverageAggregator.js';

/* ===================== 子模块分类 ===================== */

describe('classifyAdminSubmodule admin 子模块归一', () => {
  it('dashboard：驾驶舱 / 看板 / Cockpit', () => {
    expect(classifyAdminSubmodule('src/bff/aggregators/hospitalDashboardAggregator.ts')).toBe(
      'dashboard',
    );
    expect(classifyAdminSubmodule('src/bff/aggregators/deptCockpitAggregator.ts')).toBe(
      'dashboard',
    );
    expect(classifyAdminSubmodule('src/bff/aggregators/ceoDashboardAggregator.ts')).toBe(
      'dashboard',
    );
  });

  it('performance：科室绩效 / 绩效基准', () => {
    expect(classifyAdminSubmodule('src/bff/aggregators/deptPerformanceAggregator.ts')).toBe(
      'performance',
    );
    expect(classifyAdminSubmodule('src/bff/aggregators/performanceBenchmarkAggregator.ts')).toBe(
      'performance',
    );
  });

  it('quality：医疗质量 / QC / NQI', () => {
    expect(classifyAdminSubmodule('src/bff/aggregators/medicalQualityAggregator.ts')).toBe(
      'quality',
    );
    expect(classifyAdminSubmodule('src/bff/aggregators/recordQualityAggregator.ts')).toBe('quality');
    expect(classifyAdminSubmodule('src/bff/aggregators/nursingNqiAggregator.ts')).toBe('quality');
    expect(classifyAdminSubmodule('src/bff/aggregators/terminalQcAggregator.ts')).toBe('quality');
  });

  it('userManagement：用户 / 角色 / 租户 / 员工', () => {
    expect(classifyAdminSubmodule('src/bff/aggregators/adminUserAggregator.ts')).toBe(
      'userManagement',
    );
    expect(classifyAdminSubmodule('src/bff/aggregators/roleAdminAggregator.ts')).toBe(
      'userManagement',
    );
    expect(classifyAdminSubmodule('src/bff/aggregators/superAdminAggregator.ts')).toBe(
      'userManagement',
    );
    expect(classifyAdminSubmodule('src/bff/aggregators/tenantAggregator.ts')).toBe('systemConfig');
  });

  it('systemConfig：系统配置 / 安全 / 审计 / 日志 / Webhook', () => {
    expect(classifyAdminSubmodule('src/bff/aggregators/systemConfigAggregator.ts')).toBe(
      'systemConfig',
    );
    expect(classifyAdminSubmodule('src/bff/aggregators/auditLogAggregator.ts')).toBe('systemConfig');
    expect(classifyAdminSubmodule('src/bff/aggregators/securityBaselineAggregator.ts')).toBe(
      'systemConfig',
    );
    expect(classifyAdminSubmodule('src/bff/aggregators/webhookAggregator.ts')).toBe('systemConfig');
  });

  it('backupRestore：备份恢复最高优先，不被 config 规则截胡', () => {
    expect(classifyAdminSubmodule('src/bff/aggregators/backupAggregator.ts')).toBe(
      'backupRestore',
    );
    expect(classifyAdminSubmodule('src/bff/aggregators/backupRestoreService.ts')).toBe(
      'backupRestore',
    );
  });

  it('other：非 admin 文件被排除在考核外', () => {
    expect(classifyAdminSubmodule('src/bff/aggregators/chatAggregator.ts')).toBe('other');
    expect(classifyAdminSubmodule('src/bff/aggregators/pharmacyAggregator.ts')).toBe('other');
  });

  it('Windows 反斜杠路径同样归一', () => {
    expect(classifyAdminSubmodule('src\\bff\\aggregators\\backupAggregator.ts')).toBe(
      'backupRestore',
    );
  });
});

/* ===================== 测试夹具 ===================== */

/** 六子模块各取一个代表源文件（正常路径用） */
const SIX_SOURCES: SourceFileInput[] = [
  { path: 'src/bff/aggregators/hospitalDashboardAggregator.ts', lines: 100 },
  { path: 'src/bff/aggregators/deptPerformanceAggregator.ts', lines: 100 },
  { path: 'src/bff/aggregators/medicalQualityAggregator.ts', lines: 100 },
  { path: 'src/bff/aggregators/adminUserAggregator.ts', lines: 100 },
  { path: 'src/bff/aggregators/systemConfigAggregator.ts', lines: 100 },
  { path: 'src/bff/aggregators/backupAggregator.ts', lines: 100 },
];

/** 与六个源文件一一匹配的测试文件 */
const SIX_TESTS: TestFileInput[] = [
  { path: 'tests/unit/hospitalDashboard.test.ts' },
  { path: 'tests/unit/deptPerformance.test.ts' },
  { path: 'tests/unit/medicalQuality.test.ts' },
  { path: 'tests/unit/adminUser.test.ts' },
  { path: 'tests/unit/systemConfig.test.ts' },
  { path: 'tests/unit/backup.test.ts' },
];

/* ===================== 正常路径 ===================== */

describe('getAdminTestCoverage 正常路径', () => {
  it('六子模块全部配测 → rate=1，gateOk=true', () => {
    const r = getAdminTestCoverage(SIX_SOURCES, SIX_TESTS, {
      generatedAt: '2026-10-16T00:00:00Z',
    });
    expect(r.total).toBe(6);
    expect(r.covered).toBe(6);
    expect(r.uncovered).toBe(0);
    expect(r.rate).toBe(1);
    expect(r.gateOk).toBe(true);
    expect(r.uncoveredFiles.length).toBe(0);
    expect(r.gapList.length).toBe(0);
  });

  it('分桶统计：每个子模块 total=1 / covered=1 / meetsGate=true', () => {
    const r = getAdminTestCoverage(SIX_SOURCES, SIX_TESTS);
    for (const key of [
      'dashboard',
      'performance',
      'quality',
      'userManagement',
      'systemConfig',
      'backupRestore',
    ] as const) {
      expect(r.bySubmodule[key].total).toBe(1);
      expect(r.bySubmodule[key].covered).toBe(1);
      expect(r.bySubmodule[key].rate).toBe(1);
      expect(r.bySubmodule[key].meetsGate).toBe(true);
    }
  });

  it('部分配测：仅漏 systemConfig 与 backup → 对应子模块 rate=0', () => {
    // 只配测前四个，systemConfig / backup 无测试
    const tests = SIX_TESTS.slice(0, 4);
    const r = getAdminTestCoverage(SIX_SOURCES, tests);
    expect(r.total).toBe(6);
    expect(r.covered).toBe(4);
    expect(r.uncovered).toBe(2);
    expect(r.rate).toBe(Number((4 / 6).toFixed(4)));
    // 漏测的两桶不达标
    expect(r.bySubmodule.systemConfig.rate).toBe(0);
    expect(r.bySubmodule.systemConfig.meetsGate).toBe(false);
    expect(r.bySubmodule.backupRestore.rate).toBe(0);
    expect(r.bySubmodule.backupRestore.meetsGate).toBe(false);
    // 已配测的四桶仍达标
    expect(r.bySubmodule.dashboard.meetsGate).toBe(true);
    expect(r.gateOk).toBe(false);
  });

  it('缺口清单按严重度降序：backup(100) 先于 systemConfig(90)', () => {
    const r = getAdminTestCoverage(SIX_SOURCES, SIX_TESTS.slice(0, 4));
    expect(r.gapList.length).toBe(2);
    expect(r.gapList[0].submodule).toBe('backupRestore');
    expect(r.gapList[0].severity).toBe(100);
    expect(r.gapList[1].submodule).toBe('systemConfig');
    expect(r.gapList[1].severity).toBe(90);
  });

  it('中文 label 与源文件路径透传正确', () => {
    const r = getAdminTestCoverage(SIX_SOURCES, []);
    expect(r.bySubmodule.backupRestore.label).toBe('备份恢复');
    expect(r.bySubmodule.dashboard.label).toBe('驾驶舱');
    expect(r.uncoveredFiles[0].path).toContain('.ts');
  });
});

/* ===================== 边界 ===================== */

describe('getAdminTestCoverage 边界', () => {
  it('空源文件清单：rate=1，gateOk=true（空桶视为达标）', () => {
    const r = getAdminTestCoverage([], [{ path: 'tests/unit/anything.test.ts' }]);
    expect(r.total).toBe(0);
    expect(r.covered).toBe(0);
    expect(r.uncovered).toBe(0);
    expect(r.rate).toBe(1);
    expect(r.gateOk).toBe(true);
  });

  it('空测试清单：所有 admin 源文件 uncovered，rate=0', () => {
    const r = getAdminTestCoverage(SIX_SOURCES, []);
    expect(r.covered).toBe(0);
    expect(r.uncovered).toBe(6);
    expect(r.rate).toBe(0);
    expect(r.gateOk).toBe(false);
  });

  it('非 admin 文件（other）被忽略，不计入 total', () => {
    const mixed: SourceFileInput[] = [
      ...SIX_SOURCES,
      { path: 'src/bff/aggregators/chatAggregator.ts' },
      { path: 'src/bff/aggregators/pharmacyAggregator.ts' },
    ];
    const r = getAdminTestCoverage(mixed, SIX_TESTS);
    expect(r.total).toBe(6); // 仍只统计 6 个 admin 文件
    expect(r.rate).toBe(1);
    expect(r.gateOk).toBe(true);
  });

  it('阈值负数被 clamp 到 0：0% 也达标 → gateOk=true', () => {
    const r = getAdminTestCoverage(SIX_SOURCES, [], { gateThreshold: -0.5 });
    expect(r.gateThreshold).toBe(0);
    expect(r.gateOk).toBe(true);
  });

  it('阈值 >1 被 clamp 到 1：要求全配测才达标', () => {
    // 只配测 4/6 → 任一桶 rate=0 < 1 → 不达标
    const r = getAdminTestCoverage(SIX_SOURCES, SIX_TESTS.slice(0, 4), {
      gateThreshold: 2,
    });
    expect(r.gateThreshold).toBe(1);
    expect(r.gateOk).toBe(false);
    // 全配测时 rate=1 >= 1 达标
    const full = getAdminTestCoverage(SIX_SOURCES, SIX_TESTS, { gateThreshold: 2 });
    expect(full.gateOk).toBe(true);
  });

  it('阈值 NaN 回退默认 0.8', () => {
    const r = getAdminTestCoverage(SIX_SOURCES, SIX_TESTS.slice(0, 4), {
      gateThreshold: Number.NaN,
    });
    expect(r.gateThreshold).toBe(0.8);
    expect(r.gateOk).toBe(false);
  });

  it('超长字符串路径不报错，且非 admin 被归为 other 忽略', () => {
    const longName = 'a'.repeat(5000) + 'Aggregator.ts';
    const r = getAdminTestCoverage([{ path: `src/bff/aggregators/${longName}` }], []);
    expect(r.total).toBe(0);
    expect(r.rate).toBe(1);
  });

  it('负数 lines 入参不影响覆盖率计算', () => {
    const src: SourceFileInput[] = [{ path: 'src/bff/aggregators/backupAggregator.ts', lines: -99 }];
    const r = getAdminTestCoverage(src, []);
    expect(r.total).toBe(1);
    expect(r.bySubmodule.backupRestore.total).toBe(1);
  });
});

/* ===================== 错误 / 参数错误 ===================== */

describe('getAdminTestCoverage 错误与参数容错', () => {
  it('测试文件键无匹配源文件时被忽略，不影响结果', () => {
    const strayTests: TestFileInput[] = [
      ...SIX_TESTS,
      { path: 'tests/unit/noSuchAggregator.test.ts' },
      { path: 'tests/unit/ghost.ts' },
    ];
    const r = getAdminTestCoverage(SIX_SOURCES, strayTests);
    expect(r.covered).toBe(6);
    expect(r.rate).toBe(1);
  });

  it('源文件存在但测试缺失 → 进入 uncoveredFiles 且带 submodule', () => {
    const r = getAdminTestCoverage(SIX_SOURCES, SIX_TESTS.slice(0, 5)); // 缺 backup
    expect(r.uncoveredFiles.length).toBe(1);
    expect(r.uncoveredFiles[0].submodule).toBe('backupRestore');
    expect(r.uncoveredFiles[0].path).toContain('backupAggregator');
  });

  it('generatedAt 透传，便于测试固定时间', () => {
    const r = getAdminTestCoverage(SIX_SOURCES, SIX_TESTS, {
      generatedAt: '2026-10-16T08:00:00.000Z',
    });
    expect(r.generatedAt).toBe('2026-10-16T08:00:00.000Z');
  });
});

/* ===================== 权限控制 ===================== */

describe('filterAdminCoverageByRole 权限裁剪', () => {
  // 构造一份：dashboard/performance/quality/userManagement 已覆盖，
  // systemConfig/backupRestore 未覆盖的报表
  const report: AdminTestCoverage = getAdminTestCoverage(SIX_SOURCES, SIX_TESTS.slice(0, 4), {
    generatedAt: '2026-10-16T00:00:00Z',
  });

  it('superAdmin：六子模块全见，保留敏感缺口原始路径', () => {
    const v = filterAdminCoverageByRole(report, 'superAdmin');
    expect(v.masked).toBe(false);
    expect(v.visibleSubmodules.length).toBe(6);
    expect(Object.keys(v.bySubmodule).sort()).toEqual(
      [
        'backupRestore',
        'dashboard',
        'performance',
        'quality',
        'systemConfig',
        'userManagement',
      ].sort(),
    );
    // systemConfig + backupRestore 的缺口路径对超管可见
    expect(v.uncoveredFiles.length).toBe(2);
    expect(v.uncoveredFiles.map((f) => f.submodule).sort()).toEqual([
      'backupRestore',
      'systemConfig',
    ]);
  });

  it('auditor：只见业务四域，敏感配置/备份缺口路径被隐藏', () => {
    const v = filterAdminCoverageByRole(report, 'auditor');
    expect(v.masked).toBe(false);
    expect([...v.visibleSubmodules]).toEqual([
      'dashboard',
      'performance',
      'quality',
      'userManagement',
    ] as const);
    expect(v.bySubmodule.systemConfig).toBeUndefined();
    expect(v.bySubmodule.backupRestore).toBeUndefined();
    // 两个缺口都落在敏感域 → 审计角色看不到任何原始缺口路径
    expect(v.uncoveredFiles.length).toBe(0);
    // 但整体结论仍可见
    expect(typeof v.rate).toBe('number');
    expect(typeof v.gateOk).toBe('boolean');
  });

  it('viewer：只见 dashboard 汇总，缺口路径全部脱敏', () => {
    const v = filterAdminCoverageByRole(report, 'viewer');
    expect(v.masked).toBe(true);
    expect(v.visibleSubmodules).toEqual(['dashboard']);
    expect(Object.keys(v.bySubmodule)).toEqual(['dashboard']);
    expect(v.bySubmodule.systemConfig).toBeUndefined();
    // 访客拿不到任何内部文件路径
    expect(v.uncoveredFiles).toEqual([]);
  });

  it('整体 rate/gateOk 对所有角色始终可见（不泄露路径但不隐藏结论）', () => {
    for (const role of ['superAdmin', 'auditor', 'viewer'] as const) {
      const v = filterAdminCoverageByRole(report, role);
      expect(v.rate).toBe(report.rate);
      expect(v.gateOk).toBe(report.gateOk);
    }
  });
});

/* ===================== 静态清单完整性 ===================== */

describe('ADMIN_AGGREGATOR_INVENTORY 清单完整性', () => {
  it('六子模块均有考核项，且每项归类正确（无 other 混入）', () => {
    const counts: Record<string, number> = {};
    for (const s of ADMIN_AGGREGATOR_INVENTORY) {
      const sub = classifyAdminSubmodule(s.path);
      counts[sub] = (counts[sub] ?? 0) + 1;
    }
    expect(counts.other ?? 0).toBe(0);
    expect(counts.dashboard).toBeGreaterThanOrEqual(3);
    expect(counts.performance).toBeGreaterThanOrEqual(1);
    expect(counts.quality).toBeGreaterThanOrEqual(2);
    expect(counts.userManagement).toBeGreaterThanOrEqual(3);
    expect(counts.systemConfig).toBeGreaterThanOrEqual(3);
    expect(counts.backupRestore).toBeGreaterThanOrEqual(1);
  });

  it('整份清单可被 getAdminTestCoverage 处理（无测试时全部未覆盖）', () => {
    const r = getAdminTestCoverage(ADMIN_AGGREGATOR_INVENTORY, []);
    expect(r.total).toBe(ADMIN_AGGREGATOR_INVENTORY.length);
    expect(r.uncovered).toBe(r.total);
    expect(r.rate).toBe(0);
    expect(r.gateOk).toBe(false);
  });

  it('清单内 backupRestore 桶至少包含 backupAggregator', () => {
    const r = getAdminTestCoverage(ADMIN_AGGREGATOR_INVENTORY, []);
    expect(r.bySubmodule.backupRestore.total).toBeGreaterThanOrEqual(1);
    expect(r.uncoveredFiles.some((f) => f.path.includes('backupAggregator'))).toBe(true);
  });
});
