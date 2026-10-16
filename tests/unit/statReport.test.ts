/**
 * 健澜科技 jlmedaios - 医院统计上报纯函数单测（M177-B）
 * 覆盖：数据采集 / 数据校验 / 上报提交（国家口径，不凑数）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDeepStatReport,
  collectStatData,
  REPORT_SCHEMAS,
  StatReportError,
  submitStatReport,
  validateStatData,
  type ReportType,
} from '../../src/bff/aggregators/statReportAggregator';

describe('statReport 深度上报体系', () => {
  it('buildDeepStatReport 覆盖四大国家口径上报类型', () => {
    const sys = buildDeepStatReport();
    expect(sys.reportTypes.map((t) => t.code).sort()).toEqual(
      (['hospital_annual', 'infection', 'national_qc', 'performance'] as ReportType[]).sort(),
    );
    expect(sys.guardrails.length).toBeGreaterThan(0);
  });
});

describe('statReport 数据采集 collectStatData', () => {
  it('不传 source 时按国家口径产出确定性样例且覆盖 schema 字段', () => {
    const d = collectStatData('national_qc', '2026-08');
    for (const f of REPORT_SCHEMAS.national_qc) {
      expect(d[f.key]).toBeDefined();
    }
    expect(d._period).toBe('2026-08');
    expect(d.homepageCompletenessRate).toBeGreaterThan(0);
  });

  it('performance 国考口径采集齐 20 项指标', () => {
    const d = collectStatData('performance', '2026');
    for (let i = 1; i <= 20; i++) {
      expect(d[`nqe_${String(i).padStart(2, '0')}`]).toBeDefined();
    }
  });

  it('传入 source 时按 schema 归一为数值', () => {
    const d = collectStatData('infection', '2026-W33', {
      infectionCases: '310', inpatientDays: 496000, infectionRate: 3.85,
      surgicalSiteInfectionRate: 1.12, outbreakEvents: 2, outbreakHandled: 2,
    });
    expect(typeof d.infectionCases).toBe('number');
    expect(d.infectionCases).toBe(310);
  });
});

describe('statReport 数据校验 validateStatData', () => {
  it('缺必填项 -> invalid 且给出错误', () => {
    const r = validateStatData({ homepageCount: 1 }, REPORT_SCHEMAS.national_qc);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('越界数值 -> error；命中国家目标线 -> warning 不阻断', () => {
    const r = validateStatData(
      { homepageCount: 12000, homepageCompletenessRate: 96.8, mainDxAccuracy: 92.4,
        drgCases: 9800, dipCases: 7600, singleDiseaseCases: 1450 },
      REPORT_SCHEMAS.national_qc,
    );
    expect(r.valid).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('病案首页完整率写成 120（越界）-> invalid', () => {
    const r = validateStatData(
      { homepageCount: 1, homepageCompletenessRate: 120, mainDxAccuracy: 90,
        drgCases: 1, dipCases: 1, singleDiseaseCases: 1 },
      REPORT_SCHEMAS.national_qc,
    );
    expect(r.valid).toBe(false);
  });
});

describe('statReport 上报提交 submitStatReport', () => {
  it('国家口径校验通过 -> 生成确定性批次回执', () => {
    const data = collectStatData('hospital_annual', '2026');
    const receipt = submitStatReport('hospital_annual', '2026', data);
    expect(receipt.status).toBe('submitted');
    expect(receipt.batchNo).toMatch(/^SR-hospital_annual-2026-/);
    expect(receipt.caliberVersion).toBe('national-2026');
  });

  it('校验不过（凑数）-> 抛 CALIBER_MISMATCH 拒绝', () => {
    expect(() => submitStatReport('national_qc', '2026', { homepageCount: 1 }))
      .toThrow(StatReportError);
  });

  it('period 格式错误 -> 抛 BAD_PERIOD', () => {
    const data = collectStatData('infection', '2026-W33');
    expect(() => submitStatReport('infection', 'bad-period', data)).toThrow(/period/);
  });

  it('院感暴发未全部处置不阻断提交，但数据如实上报', () => {
    const data = collectStatData('infection', '2026-W33', {
      infectionCases: 310, inpatientDays: 496000, infectionRate: 3.85,
      surgicalSiteInfectionRate: 1.12, outbreakEvents: 3, outbreakHandled: 1,
    });
    const receipt = submitStatReport('infection', '2026-W33', data);
    expect(receipt.data.outbreakEvents).toBe(3);
  });

  it.each(['national_qc', 'hospital_annual', 'performance', 'infection'] as ReportType[])(
    '四类上报均可走通提交：%s',
    (t) => {
      const data = collectStatData(t, t === 'hospital_annual' || t === 'performance' ? '2026' : '2026-08');
      const receipt = submitStatReport(t, t === 'hospital_annual' || t === 'performance' ? '2026' : '2026-08', data);
      expect(receipt.validation.valid).toBe(true);
    },
  );
});
