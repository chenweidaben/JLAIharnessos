/**
 * 健澜科技 jlmedaios - 个人绩效考核纯函数单测（医院管理深化 M140-A）
 *
 * 覆盖：五维权重自洽、五维得分计算、投诉为 0 边界、差错折算、超基线封顶、
 * 综合得分加权与等级阈值、排名排序与科室过滤、未知员工抛错、证据链留痕。
 * 全部使用内存数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  calculatePerformanceScore,
  generateRanking,
  PERF_DIMENSIONS,
  type StaffRawData,
} from '../../src/bff/aggregators/performanceReviewAggregator';

/** 全部命中基线：五维均满分 */
const perfect: StaffRawData = {
  staffId: 'T001', staffName: '标杆医', deptCode: 'D001', deptName: '心内科',
  outpatientVisits: 800, inpatientDays: 60, surgeryCount: 20,
  qcPassRate: 1, gradeARate: 1, complianceRate: 1,
  satisfactionScore: 100, complaintRate: 0,
  trainingHours: 24, continuingCredits: 10, knowledgeContrib: 5,
  crossDeptConsult: 8, handoverErrors: 0, peerScore: 100,
};

/** 工作量为 0、其余满分：workload = 0，其余 100 */
const noWorkload: StaffRawData = {
  ...perfect, staffId: 'T002', staffName: '轻负荷医', deptCode: 'D001', deptName: '心内科',
  outpatientVisits: 0, inpatientDays: 0, surgeryCount: 0,
};

/** 医疗质量仅半、其余满分：medicalQuality = 50 */
const qualityStar: StaffRawData = {
  ...perfect, staffId: 'T003', staffName: '质控标杆医', deptCode: 'D002', deptName: '外科',
  qcPassRate: 0.5, gradeARate: 0.5, complianceRate: 0.5,
};

/** 指标爆表（超基线应封顶 100）+ 有投诉/差错/低满意度 */
const overTarget: StaffRawData = {
  ...perfect, staffId: 'T004', staffName: '高负荷医', deptCode: 'D002', deptName: '外科',
  outpatientVisits: 99999, inpatientDays: 99999, surgeryCount: 99999,
  complaintRate: 0.01, handoverErrors: 3, peerScore: 60,
};

describe('维度权重自洽', () => {
  it('五维权重合计 = 1（30/25/20/15/10）', () => {
    const sum = PERF_DIMENSIONS.reduce((s, d) => s + d.weight, 0);
    expect(sum).toBe(1);
    expect(PERF_DIMENSIONS.map((d) => d.key)).toEqual([
      'workload',
      'medicalQuality',
      'patientSatisfaction',
      'learningGrowth',
      'deptCollaboration',
    ]);
  });
});

describe('calculatePerformanceScore 绩效计算', () => {
  it('满分员工：五维均 100，综合 100，等级 A', () => {
    const r = calculatePerformanceScore('T001', '2026-10', [perfect, noWorkload]);
    expect(r.totalScore).toBe(100);
    expect(r.grade).toBe('A');
    expect(r.period).toBe('2026-10');
    for (const d of r.dimensions) expect(d.score).toBe(100);
  });

  it('工作量为 0 → workload 维度 0，其余 100', () => {
    const r = calculatePerformanceScore('T002', '本月', [noWorkload]);
    const w = r.dimensions.find((d) => d.key === 'workload');
    expect(w?.score).toBe(0);
  });

  it('医疗质量 = 三项合格率加权：0.5*0.4+0.5*0.35+0.5*0.25 = 50', () => {
    const r = calculatePerformanceScore('T003', '本月', [qualityStar]);
    const q = r.dimensions.find((d) => d.key === 'medicalQuality');
    expect(q?.score).toBe(50);
  });

  it('投诉为 0 时满意度不除零，该项记满分 100', () => {
    const r = calculatePerformanceScore('T001', '本月', [perfect]);
    const s = r.dimensions.find((d) => d.key === 'patientSatisfaction');
    expect(s?.score).toBe(100);
    // 投诉率证据贡献 = 反向折算 1 * 权重 0.3 = 0.3
    const complaintEv = s?.evidence.find((e) => e.metric === '投诉率');
    expect(complaintEv?.contribution).toBe(0.3);
  });

  it('有投诉时满意度下降：满意度1.0*70% + 投诉反向(0.005/0.01=0.5)*30% = 85', () => {
    const r = calculatePerformanceScore('T004', '本月', [overTarget]);
    const s = r.dimensions.find((d) => d.key === 'patientSatisfaction');
    expect(s?.score).toBe(85);
  });

  it('交接班差错折算：会诊1*0.4 + (1-3*0.2=0.4)*0.3 + 互评0.6*0.3 = 0.7 → 70', () => {
    const r = calculatePerformanceScore('T004', '本月', [overTarget]);
    const c = r.dimensions.find((d) => d.key === 'deptCollaboration');
    expect(c?.score).toBe(70);
  });

  it('指标超基线时工作量封顶 100，不出现溢出分', () => {
    const r = calculatePerformanceScore('T004', '本月', [overTarget]);
    const w = r.dimensions.find((d) => d.key === 'workload');
    expect(w?.score).toBe(100);
    expect(r.totalScore).toBeLessThanOrEqual(100);
  });

  it('综合得分按权重加权：noWorkload = 0*.3 + 100*.25 + 100*.2 + 100*.15 + 100*.1 = 70 → C', () => {
    const r = calculatePerformanceScore('T002', '本月', [noWorkload]);
    expect(r.totalScore).toBe(70);
    expect(r.grade).toBe('C');
  });

  it('等级阈值：qualityStar = 100*.3 + 50*.25 + 100*.2 + 100*.15 + 100*.1 = 87.5 → B', () => {
    const r = calculatePerformanceScore('T003', '本月', [qualityStar]);
    expect(r.totalScore).toBe(87.5);
    expect(r.grade).toBe('B');
  });

  it('每个维度都带证据链（公平透明）', () => {
    const r = calculatePerformanceScore('T001', '本月', [perfect]);
    for (const d of r.dimensions) {
      expect(d.evidence.length).toBeGreaterThan(0);
      for (const e of d.evidence) {
        expect(e).toHaveProperty('metric');
        expect(e).toHaveProperty('raw');
        expect(e).toHaveProperty('baseline');
        expect(e).toHaveProperty('contribution');
      }
    }
  });

  it('未知 staffId 抛错（路由映射 400）', () => {
    expect(() => calculatePerformanceScore('NOPE', '本月', [perfect])).toThrow(/员工不存在/);
  });
});

describe('generateRanking 排名逻辑', () => {
  const all = [noWorkload, perfect, qualityStar, overTarget];

  it('按综合得分降序排名，名次从 1 起连续', () => {
    const ranked = generateRanking('ALL', '2026-10', all);
    // perfect 100 > overTarget 94 > qualityStar 87.5 > noWorkload 70
    expect(ranked[0].staffId).toBe('T001');
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
    expect(ranked[0].totalScore).toBe(100);
    expect(ranked[1].staffId).toBe('T004');
    expect(ranked[1].totalScore).toBe(94);
    expect(ranked[2].staffId).toBe('T003');
    expect(ranked[2].totalScore).toBe(87.5);
    expect(ranked[3].staffId).toBe('T002');
    expect(ranked[3].totalScore).toBe(70);
  });

  it('科室过滤：D001 仅含 T001/T002，D002 仅含 T003/T004', () => {
    const d1 = generateRanking('D001', '本月', all);
    expect(d1.map((r) => r.staffId).sort()).toEqual(['T001', 'T002']);
    expect(d1[0].rank).toBe(1);
    expect(d1[0].staffId).toBe('T001');
    expect(d1[1].staffId).toBe('T002');

    const d2 = generateRanking('D002', '本月', all);
    expect(d2.map((r) => r.staffId).sort()).toEqual(['T003', 'T004']);
    // D002 内：overTarget 94 > qualityStar 87.5
    expect(d2[0].staffId).toBe('T004');
    expect(d2[0].totalScore).toBe(94);
    expect(d2[1].staffId).toBe('T003');
    expect(d2[1].totalScore).toBe(87.5);
  });

  it('空输入返回空数组', () => {
    expect(generateRanking('ALL', '本月', [])).toEqual([]);
  });
});
