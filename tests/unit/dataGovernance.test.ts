/**
 * 健澜科技 jlmedaios - M175-A 深度数据治理纯函数单测（质量与新场景）
 *
 * 覆盖：
 *   - buildDeepDataGovernance：四大治理域（标准/质量/安全/生命周期）子项与控制数；
 *   - runDataQualityCheck：非空/区间/枚举/引用 真检查通过率与维度映射；
 *   - generateDataQualityReport：周期得分/五维拆解/短板识别/红线建议；
 *   - identifyDataAnomaly：超区间/空值/格式/未命中等异常识别。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDeepDataGovernance,
  generateDataQualityReport,
  identifyDataAnomaly,
  runDataQualityCheck,
} from '../../src/bff/aggregators/dataGovernanceAggregator';

describe('buildDeepDataGovernance 深度治理体系', () => {
  it('四大治理域按序输出，子项数为 3/5/3/5，共 16 项', () => {
    const sys = buildDeepDataGovernance('2026-10-16T00:00:00Z');
    expect(sys.generatedAt).toBe('2026-10-16T00:00:00Z');
    expect(sys.domains.map((d) => d.code)).toEqual([
      'standard',
      'quality',
      'security',
      'lifecycle',
    ]);
    expect(sys.summary.standard).toBe(3);
    expect(sys.summary.quality).toBe(5);
    expect(sys.summary.security).toBe(3);
    expect(sys.summary.lifecycle).toBe(5);
    expect(sys.totalItems).toBe(16);
  });

  it('治理子项覆盖任务要求的全部维度', () => {
    const sys = buildDeepDataGovernance();
    const names = sys.domains.flatMap((d) => d.items.map((i) => i.name));
    // 数据标准
    for (const n of ['命名规范', '数据类型', '值域']) expect(names).toContain(n);
    // 数据质量五维
    for (const n of ['完整性', '准确性', '一致性', '及时性', '唯一性']) {
      expect(names).toContain(n);
    }
    // 数据安全
    for (const n of ['分级分类', '脱敏', '访问控制']) expect(names).toContain(n);
    // 生命周期
    for (const n of ['创建', '存储', '使用', '归档', '销毁']) expect(names).toContain(n);
  });

  it('控制措施合计 48 条，成熟度模型 5 级，内置规则 17 条', () => {
    const sys = buildDeepDataGovernance();
    expect(sys.totalControls).toBe(48);
    expect(sys.maturityModel.length).toBe(5);
    expect(sys.recommendedRuleCount).toBe(17);
  });
});

describe('runDataQualityCheck 单表单字段真检查', () => {
  it('非空检查：1 个空值 → 通过率 75%，完整性维度，状态 fail', () => {
    const r = runDataQualityCheck('clinical.patients', 'mrn', {
      checkType: 'not_null',
      severity: 'critical',
      samples: ['MRN001', 'MRN002', '', 'MRN004'],
    });
    expect(r.totalRows).toBe(4);
    expect(r.passedRows).toBe(3);
    expect(r.failedRows).toBe(1);
    expect(r.passRate).toBe(75);
    expect(r.status).toBe('fail');
    expect(r.dimension).toBe('completeness');
    expect(r.failedSample).toContain('');
  });

  it('区间检查：年龄 200 超 0-150 → 通过率 80%，准确性维度', () => {
    const r = runDataQualityCheck('clinical.patients', 'age', {
      checkType: 'range',
      severity: 'critical',
      params: { min: 0, max: 150 },
      samples: [45, 3, 200, 67, 12],
    });
    expect(r.passedRows).toBe(4);
    expect(r.failedRows).toBe(1);
    expect(r.passRate).toBe(80);
    expect(r.dimension).toBe('accuracy');
  });

  it('枚举检查：性别“保密”不在白名单 → 通过率 75%', () => {
    const r = runDataQualityCheck('clinical.patients', 'gender', {
      checkType: 'enum',
      severity: 'major',
      params: { allowed: ['男', '女', '未知', '未说明'] },
      samples: ['男', '女', '未知', '保密'],
    });
    expect(r.passedRows).toBe(3);
    expect(r.passRate).toBe(75);
  });

  it('引用一致性：P99 不在已知键集 → 一致性维度 fail', () => {
    const r = runDataQualityCheck('clinical.visits', 'patient_id', {
      checkType: 'referential',
      severity: 'critical',
      params: { allowed: ['P1', 'P2', 'P3'] },
      samples: ['P1', 'P2', 'P99', 'P3'],
    });
    expect(r.dimension).toBe('consistency');
    expect(r.failedRows).toBe(1);
  });

  it('空样本视为 100% 通过，不除零', () => {
    const r = runDataQualityCheck('t', 'f', {
      checkType: 'not_null',
      severity: 'minor',
      samples: [],
    });
    expect(r.passRate).toBe(100);
    expect(r.status).toBe('pass');
  });
});

describe('generateDataQualityReport 周期质量报告', () => {
  const checks = [
    runDataQualityCheck('clinical.patients', 'mrn', {
      checkType: 'not_null', severity: 'critical',
      samples: ['MRN001', 'MRN002', '', 'MRN004'],
    }),
    runDataQualityCheck('clinical.patients', 'age', {
      checkType: 'range', severity: 'critical',
      params: { min: 0, max: 150 }, samples: [45, 3, 200, 67, 12],
    }),
    runDataQualityCheck('clinical.patients', 'gender', {
      checkType: 'enum', severity: 'major',
      params: { allowed: ['男', '女', '未知', '未说明'] },
      samples: ['男', '女', '未知', '保密'],
    }),
    runDataQualityCheck('clinical.visits', 'patient_id', {
      checkType: 'referential', severity: 'critical',
      params: { allowed: ['P1', 'P2', 'P3'] }, samples: ['P1', 'P2', 'P99', 'P3'],
    }),
  ];

  it('汇总：4 项全 fail，整体得分 76.25', () => {
    const rep = generateDataQualityReport('2026-10', checks);
    expect(rep.period).toBe('2026-10');
    expect(rep.totalChecks).toBe(4);
    expect(rep.failedChecks).toBe(4);
    expect(rep.overallScore).toBe(76.25);
  });

  it('五维拆解：完整性 75 / 准确性 77.5 / 一致性 75 / 及时性与唯一性无样本记 100', () => {
    const rep = generateDataQualityReport('2026-10', checks);
    expect(rep.dimensionBreakdown.completeness).toBe(75);
    expect(rep.dimensionBreakdown.accuracy).toBe(77.5);
    expect(rep.dimensionBreakdown.consistency).toBe(75);
    expect(rep.dimensionBreakdown.timeliness).toBe(100);
    expect(rep.dimensionBreakdown.uniqueness).toBe(100);
  });

  it('短板识别为完整性，并产出红线处置建议', () => {
    const rep = generateDataQualityReport('2026-10', checks);
    expect(rep.weakestDimension).toBe('completeness');
    // 1 条短板建议 + 3 条 critical 红线建议
    expect(rep.recommendations.length).toBe(4);
    expect(rep.recommendations.some((r) => r.startsWith('[红线]'))).toBe(true);
  });

  it('空检查集输出满分空盘，不造假数据', () => {
    const rep = generateDataQualityReport('2026-10', []);
    expect(rep.overallScore).toBe(100);
    expect(rep.weakestDimension).toBeNull();
    expect(rep.recommendations).toEqual([]);
  });
});

describe('identifyDataAnomaly 数据异常识别', () => {
  it('年龄 200 超出 0-150 → critical 异常', () => {
    const a = identifyDataAnomaly('clinical.patients', 'age', 200);
    expect(a.isAnomaly).toBe(true);
    expect(a.level).toBe('critical');
    expect(a.expected).toBe('0-150 岁');
  });

  it('体重 72.5 在区间内 → 正常放行', () => {
    const a = identifyDataAnomaly('clinical.patients', 'weight_kg', 72.5);
    expect(a.isAnomaly).toBe(false);
    expect(a.level).toBe('ok');
  });

  it('收缩压 180 在 40-250 内 → 正常', () => {
    const a = identifyDataAnomaly('clinical.observations', 'sbp', 180);
    expect(a.isAnomaly).toBe(false);
  });

  it('MRN 空值 → critical（必填为空）', () => {
    const a = identifyDataAnomaly('clinical.patients', 'mrn', '');
    expect(a.isAnomaly).toBe(true);
    expect(a.level).toBe('critical');
  });

  it('手机号 13800001111 格式合规 → 正常', () => {
    const a = identifyDataAnomaly('clinical.patients', 'mobile', '13800001111');
    expect(a.isAnomaly).toBe(false);
  });

  it('性别“保密”不在受控字典 → warning', () => {
    const a = identifyDataAnomaly('clinical.patients', 'gender', '保密');
    expect(a.isAnomaly).toBe(true);
    expect(a.level).toBe('warning');
  });

  it('未命中规则的非空值放行，空值记 warning', () => {
    expect(identifyDataAnomaly('t', 'lucky_no', 'X1').isAnomaly).toBe(false);
    const empty = identifyDataAnomaly('t', 'lucky_no', '');
    expect(empty.isAnomaly).toBe(true);
    expect(empty.level).toBe('warning');
  });
});
