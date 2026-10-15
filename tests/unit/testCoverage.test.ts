/**
 * 健澜科技 jlmedaios - M136-C 测试覆盖率纯函数单元测试【生产就绪质量门禁】
 *
 * 覆盖：
 *  - 路径归一：normalizeSourceKey / normalizeTestKey 对 .test 后缀、
 *    Aggregator 后缀、目录前缀的处理；
 *  - 模块分类：classifyModule 对 doctor / nurse / pharma / admin / other
 *    五桶的归一判定；
 *  - 覆盖率计算：calculateTestCoverage 的整体 rate / covered / uncovered；
 *  - 模块统计：五桶 byModule 的 total / covered / rate / meetsGate；
 *  - 门禁结论：coreGateOk 在核心四桶全绿 / 任一缺口时的取值；
 *  - 趋势：options.history + 当前快照的拼接顺序；
 *  - 边界：空源文件清单 / 空测试清单 / 自定义阈值。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  calculateTestCoverage,
  classifyModule,
  CORE_AGGREGATOR_INVENTORY,
  normalizeSourceKey,
  normalizeTestKey,
  type Coverage,
  type SourceFileInput,
  type TestFileInput,
} from '../../src/bff/aggregators/testCoverageAggregator.js';

/* ===================== 路径归一 ===================== */

describe('normalizeSourceKey 源文件键归一', () => {
  it('去 .ts 扩展与 Aggregator 后缀', () => {
    expect(normalizeSourceKey('src/bff/aggregators/doctorWorkbenchAggregator.ts')).toBe(
      'doctorworkbench',
    );
  });

  it('Windows 反斜杠路径归一', () => {
    expect(normalizeSourceKey('src\\bff\\aggregators\\nurseStationAggregator.ts')).toBe(
      'nursestation',
    );
  });

  it('不带 Aggregator 后缀时仅去扩展', () => {
    expect(normalizeSourceKey('src/bff/routes/pharmacy.ts')).toBe('pharmacy');
  });
});

describe('normalizeTestKey 测试文件键归一', () => {
  it('去 tests/unit 目录、.test.ts 后缀', () => {
    expect(normalizeTestKey('tests/unit/doctorWorkbench.test.ts')).toBe('doctorworkbench');
  });

  it('去 .spec.tsx 后缀与 test- 前缀', () => {
    expect(normalizeTestKey('__tests__/test-adminUser.spec.tsx')).toBe('adminuser');
  });

  it('去 Aggregator 后缀以与源文件键对齐', () => {
    expect(normalizeTestKey('tests/unit/adminMuseAggregator.test.ts')).toBe('adminmuse');
  });
});

/* ===================== 模块分类 ===================== */

describe('classifyModule 业务模块归一', () => {
  it('doctor：医生 / 门诊 / 手术 / 诊断', () => {
    expect(classifyModule('src/bff/aggregators/doctorWorkbenchAggregator.ts')).toBe('doctor');
    expect(classifyModule('src/bff/aggregators/outpatientAggregator.ts')).toBe('doctor');
    expect(classifyModule('src/bff/aggregators/surgeryAggregator.ts')).toBe('doctor');
    expect(classifyModule('src/bff/aggregators/diagnosisSuggestionAggregator.ts')).toBe(
      'doctor',
    );
  });

  it('nurse：护士 / 住院 / 病区 / 管路', () => {
    expect(classifyModule('src/bff/aggregators/nurseStationAggregator.ts')).toBe('nurse');
    expect(classifyModule('src/bff/aggregators/inpatientAggregator.ts')).toBe('nurse');
    expect(classifyModule('src/bff/aggregators/tubeCareAggregator.ts')).toBe('nurse');
    expect(classifyModule('src/bff/aggregators/sbarAggregator.ts')).toBe('nurse');
  });

  it('pharma：药师 / 药品 / 处方', () => {
    expect(classifyModule('src/bff/aggregators/pharmacyAggregator.ts')).toBe('pharma');
    expect(classifyModule('src/bff/aggregators/drugInventoryAggregator.ts')).toBe('pharma');
    expect(classifyModule('src/bff/aggregators/prescriptionReviewAggregator.ts')).toBe('pharma');
  });

  it('admin：管理后台 / 用户 / 审计 / 配置', () => {
    expect(classifyModule('src/bff/aggregators/adminUserAggregator.ts')).toBe('admin');
    expect(classifyModule('src/bff/aggregators/auditLogAggregator.ts')).toBe('admin');
    expect(classifyModule('src/bff/aggregators/systemConfigAggregator.ts')).toBe('admin');
    expect(classifyModule('src/bff/aggregators/superAdminAggregator.ts')).toBe('admin');
  });

  it('other：患者门户 / 公共组件', () => {
    expect(classifyModule('src/bff/aggregators/patientPortalAggregator.ts')).toBe('other');
    expect(classifyModule('src/bff/aggregators/notificationAggregator.ts')).toBe('other');
  });
});

/* ===================== 覆盖率计算 ===================== */

describe('calculateTestCoverage 覆盖率计算', () => {
  const sources: SourceFileInput[] = [
    { path: 'src/bff/aggregators/doctorWorkbenchAggregator.ts', lines: 100 },
    { path: 'src/bff/aggregators/nurseStationAggregator.ts', lines: 200 },
    { path: 'src/bff/aggregators/pharmacyAggregator.ts', lines: 150 },
    { path: 'src/bff/aggregators/adminUserAggregator.ts', lines: 120 },
  ];
  const tests: TestFileInput[] = [
    { path: 'tests/unit/doctorWorkbench.test.ts' },
    { path: 'tests/unit/nurseStation.test.ts' },
    { path: 'tests/unit/pharmacy.test.ts' },
    // adminUser 故意无对应测试
  ];

  it('整体 rate = covered / total', () => {
    const r = calculateTestCoverage(sources, tests, { generatedAt: '2026-10-16T00:00:00Z' });
    expect(r.total).toBe(4);
    expect(r.covered).toBe(3);
    expect(r.uncovered).toBe(1);
    expect(r.rate).toBe(0.75);
  });

  it('byModule 五桶独立统计', () => {
    const r = calculateTestCoverage(sources, tests);
    expect(r.byModule.doctor.total).toBe(1);
    expect(r.byModule.doctor.covered).toBe(1);
    expect(r.byModule.nurse.total).toBe(1);
    expect(r.byModule.nurse.covered).toBe(1);
    expect(r.byModule.pharma.total).toBe(1);
    expect(r.byModule.pharma.covered).toBe(1);
    expect(r.byModule.admin.total).toBe(1);
    expect(r.byModule.admin.covered).toBe(0);
    expect(r.byModule.admin.rate).toBe(0);
    expect(r.byModule.admin.meetsGate).toBe(false);
  });

  it('coreGateOk：admin 桶 0% < 80% 阈值 → false', () => {
    const r = calculateTestCoverage(sources, tests);
    expect(r.coreGateOk).toBe(false);
  });

  it('files 明细带 testPath 与 module 标注', () => {
    const r = calculateTestCoverage(sources, tests);
    const adminFile = r.files.find((f) => f.path.includes('adminUser'))!;
    expect(adminFile.covered).toBe(false);
    expect(adminFile.testPath).toBeUndefined();
    expect(adminFile.module).toBe('admin');
    expect(adminFile.lines).toBe(120);

    const doctorFile = r.files.find((f) => f.path.includes('doctorWorkbench'))!;
    expect(doctorFile.covered).toBe(true);
    expect(doctorFile.testPath).toBe('tests/unit/doctorWorkbench.test.ts');
  });

  it('uncoveredFiles 仅含未覆盖项', () => {
    const r = calculateTestCoverage(sources, tests);
    expect(r.uncoveredFiles.length).toBe(1);
    expect(r.uncoveredFiles[0].path).toContain('adminUser');
  });
});

describe('calculateTestCoverage 全绿门禁', () => {
  const sources: SourceFileInput[] = [
    { path: 'src/bff/aggregators/doctorWorkbenchAggregator.ts' },
    { path: 'src/bff/aggregators/nurseStationAggregator.ts' },
    { path: 'src/bff/aggregators/pharmacyAggregator.ts' },
    { path: 'src/bff/aggregators/adminUserAggregator.ts' },
  ];
  const tests: TestFileInput[] = [
    { path: 'tests/unit/doctorWorkbench.test.ts' },
    { path: 'tests/unit/nurseStation.test.ts' },
    { path: 'tests/unit/pharmacy.test.ts' },
    { path: 'tests/unit/adminUser.test.ts' },
  ];

  it('四桶全绿时 coreGateOk = true', () => {
    const r = calculateTestCoverage(sources, tests);
    expect(r.rate).toBe(1);
    expect(r.coreGateOk).toBe(true);
    for (const k of ['doctor', 'nurse', 'pharma', 'admin'] as const) {
      expect(r.byModule[k].meetsGate).toBe(true);
    }
  });
});

/* ===================== 趋势 ===================== */

describe('calculateTestCoverage 趋势拼接', () => {
  it('options.history 被前置，当前快照追加到尾部', () => {
    const history = [
      { label: '2026-10-14', rate: 0.5, covered: 5, total: 10 },
      { label: '2026-10-15', rate: 0.6, covered: 6, total: 10 },
    ];
    const sources: SourceFileInput[] = [
      { path: 'src/bff/aggregators/doctorWorkbenchAggregator.ts' },
    ];
    const tests: TestFileInput[] = [{ path: 'tests/unit/doctorWorkbench.test.ts' }];

    const r = calculateTestCoverage(sources, tests, {
      history,
      generatedAt: '2026-10-16T00:00:00Z',
    });

    expect(r.trend.length).toBe(3);
    expect(r.trend[0].label).toBe('2026-10-14');
    expect(r.trend[1].label).toBe('2026-10-15');
    expect(r.trend[2].label).toBe('2026-10-16T00:00:00Z');
    expect(r.trend[2].rate).toBe(1);
    expect(r.trend[2].covered).toBe(1);
    expect(r.trend[2].total).toBe(1);
  });

  it('无 history 时 trend 仅含当前快照', () => {
    const r = calculateTestCoverage([], []);
    expect(r.trend.length).toBe(1);
  });
});

/* ===================== 边界 ===================== */

describe('calculateTestCoverage 边界', () => {
  it('空源文件清单：rate=1，coreGateOk=true（空桶视为达标）', () => {
    const r = calculateTestCoverage([], [{ path: 'tests/unit/anything.test.ts' }]);
    expect(r.total).toBe(0);
    expect(r.rate).toBe(1);
    expect(r.coreGateOk).toBe(true);
  });

  it('空测试清单：所有源文件 uncovered，rate=0', () => {
    const sources: SourceFileInput[] = [
      { path: 'src/bff/aggregators/doctorWorkbenchAggregator.ts' },
      { path: 'src/bff/aggregators/adminUserAggregator.ts' },
    ];
    const r = calculateTestCoverage(sources, []);
    expect(r.covered).toBe(0);
    expect(r.uncovered).toBe(2);
    expect(r.rate).toBe(0);
    expect(r.coreGateOk).toBe(false);
  });

  it('自定义门禁阈值 gateThreshold 生效', () => {
    const sources: SourceFileInput[] = [
      { path: 'src/bff/aggregators/doctorWorkbenchAggregator.ts' },
      { path: 'src/bff/aggregators/adminUserAggregator.ts' },
    ];
    const tests: TestFileInput[] = [{ path: 'tests/unit/doctorWorkbench.test.ts' }];
    // 阈值 0.5：doctor 100% 达标，admin 0% 不达标 → coreGateOk=false
    const r = calculateTestCoverage(sources, tests, { gateThreshold: 0.5 });
    expect(r.gateThreshold).toBe(0.5);
    expect(r.byModule.doctor.meetsGate).toBe(true);
    expect(r.byModule.admin.meetsGate).toBe(false);
    expect(r.coreGateOk).toBe(false);
  });
});

/* ===================== 核心清单完整性 ===================== */

describe('CORE_AGGREGATOR_INVENTORY 静态清单完整性', () => {
  it('覆盖 doctor / nurse / pharma / admin 四桶且每桶 ≥ 5 项', () => {
    const buckets = { doctor: 0, nurse: 0, pharma: 0, admin: 0, other: 0 };
    for (const s of CORE_AGGREGATOR_INVENTORY) {
      buckets[classifyModule(s.path)] += 1;
    }
    expect(buckets.doctor).toBeGreaterThanOrEqual(5);
    expect(buckets.nurse).toBeGreaterThanOrEqual(5);
    expect(buckets.pharma).toBeGreaterThanOrEqual(3);
    expect(buckets.admin).toBeGreaterThanOrEqual(3);
    expect(buckets.other).toBe(0); // 核心清单不应混入 other
  });

  it('清单内每项都能被 calculateTestCoverage 正常处理', () => {
    const r: Coverage = calculateTestCoverage(CORE_AGGREGATOR_INVENTORY, []);
    expect(r.total).toBe(CORE_AGGREGATOR_INVENTORY.length);
    expect(r.uncovered).toBe(CORE_AGGREGATOR_INVENTORY.length);
    expect(r.rate).toBe(0);
  });
});
