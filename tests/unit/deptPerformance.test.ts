/**
 * 健澜科技 jlmedaios - 科室绩效分析纯函数单测（管理驾驶舱 M127-B）
 *
 * 覆盖：五维得分计算、越低越好指标的反向折算、投诉为 0 边界、超目标封顶、
 * 综合得分加权与等级阈值、排名排序与名次、未知科室抛错、双科室对比分析。
 * 全部使用内存数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildDeptPerformanceReport,
  DIMENSIONS,
  rankDepts,
  type DeptRawData,
} from '../../src/bff/aggregators/deptPerformanceAggregator';

/** 全部命中目标值：五维均满分 */
const perfect: DeptRawData = {
  deptCode: 'T001', deptName: '标杆科',
  outpatientCount: 2000, dischargedCount: 300, surgeryCount: 80,
  avgLodDays: 7, bedTurnover: 2.5, avgWaitMinutes: 30,
  qcPassRate: 1, gradeARate: 1,
  patientSatisfaction: 100, complaintRate: 0,
  aiNoteAdoption: 0.6, knowledgeContrib: 20, templateReuse: 200,
};

/** 各项均为目标一半：五维中 workload/efficiency/smartAssets = 50 */
const mid: DeptRawData = {
  deptCode: 'T002', deptName: '中游科',
  outpatientCount: 1000, dischargedCount: 150, surgeryCount: 40,
  avgLodDays: 14, bedTurnover: 1.25, avgWaitMinutes: 60,
  qcPassRate: 0.9, gradeARate: 0.8,
  patientSatisfaction: 80, complaintRate: 0.01,
  aiNoteAdoption: 0.3, knowledgeContrib: 10, templateReuse: 100,
};

/** 工作量为空、其余满分：workload = 0，其余 100 */
const noWorkload: DeptRawData = {
  ...perfect, deptCode: 'T003', deptName: '零工作量科',
  outpatientCount: 0, dischargedCount: 0, surgeryCount: 0,
};

/** 工作量爆表（超目标，应封顶 100 而非溢出）、质量薄弱 */
const workloadStar: DeptRawData = {
  ...perfect, deptCode: 'T004', deptName: '高负荷科',
  outpatientCount: 99999, dischargedCount: 99999, surgeryCount: 99999,
  qcPassRate: 0.5, gradeARate: 0.5,
};

/** 工作量为 0、质量满分（与 workloadStar 对比） */
const qualityStar: DeptRawData = {
  ...perfect, deptCode: 'T005', deptName: '质控标杆科',
  outpatientCount: 0, dischargedCount: 0, surgeryCount: 0,
};

describe('维度权重自洽', () => {
  it('五维权重合计 = 1', () => {
    const sum = DIMENSIONS.reduce((s, d) => s + d.weight, 0);
    expect(sum).toBe(1);
  });
});

describe('buildDeptPerformanceReport 绩效计算', () => {
  it('满分科室：五维均 100，综合 100，等级 A', () => {
    const r = buildDeptPerformanceReport('T001', '2026-10', [perfect, mid]);
    expect(r.totalScore).toBe(100);
    expect(r.grade).toBe('A');
    for (const d of r.dimensions) expect(d.score).toBe(100);
    expect(r.timeRange).toBe('2026-10');
  });

  it('工作量 = 门诊40% + 出院35% + 手术25%（均半 → 50）', () => {
    const r = buildDeptPerformanceReport('T002', '本月', [mid]);
    const w = r.dimensions.find((d) => d.key === 'workload');
    expect(w?.score).toBe(50);
  });

  it('效率按反向指标折算：住院日翻倍/候诊翻倍/周转减半 → 50', () => {
    const r = buildDeptPerformanceReport('T002', '本月', [mid]);
    const e = r.dimensions.find((d) => d.key === 'efficiency');
    expect(e?.score).toBe(50);
  });

  it('质量 = 质控合格率与甲级率各半：(0.9+0.8)/2*100 = 85', () => {
    const r = buildDeptPerformanceReport('T002', '本月', [mid]);
    const q = r.dimensions.find((d) => d.key === 'quality');
    expect(q?.score).toBe(85);
  });

  it('满意度 = 满意度70% + 投诉反向30%：0.8*70 + 0.5*30 = 71', () => {
    const r = buildDeptPerformanceReport('T002', '本月', [mid]);
    const s = r.dimensions.find((d) => d.key === 'satisfaction');
    expect(s?.score).toBe(71);
  });

  it('投诉为 0 时满意度不除零，该项记满分 100', () => {
    const r = buildDeptPerformanceReport('T001', '本月', [perfect]);
    const s = r.dimensions.find((d) => d.key === 'satisfaction');
    expect(s?.score).toBe(100);
  });

  it('指标超目标时封顶 100，不出现溢出分', () => {
    const r = buildDeptPerformanceReport('T004', '本月', [workloadStar]);
    const w = r.dimensions.find((d) => d.key === 'workload');
    expect(w?.score).toBe(100);
    expect(r.totalScore).toBeLessThanOrEqual(100);
  });

  it('综合得分按权重加权：mid = 50*0.25+50*0.25+85*0.25+71*0.15+50*0.1 = 61.9', () => {
    const r = buildDeptPerformanceReport('T002', '本月', [mid]);
    expect(r.totalScore).toBe(61.9);
  });

  it('等级阈值：满分=A，综合 75=（C 档），61.9=D', () => {
    const rMid = buildDeptPerformanceReport('T002', '本月', [mid]);
    expect(rMid.grade).toBe('D');
    const rNoWork = buildDeptPerformanceReport('T003', '本月', [noWorkload]);
    // 0*0.25 + 100*(0.25+0.25+0.15+0.10) = 75
    expect(rNoWork.totalScore).toBe(75);
    expect(rNoWork.grade).toBe('C');
  });

  it('未知 deptCode 抛错（路由映射 400）', () => {
    expect(() => buildDeptPerformanceReport('NOPE', '本月', [perfect])).toThrow(/科室不存在/);
  });
});

describe('rankDepts 排名逻辑', () => {
  it('按综合得分降序排名，名次从 1 起连续', () => {
    const ranked = rankDepts([mid, perfect, noWorkload]);
    expect(ranked.map((r) => r.deptCode)).toEqual(['T001', 'T003', 'T002']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(ranked[0].totalScore).toBe(100);
    expect(ranked[2].totalScore).toBe(61.9);
  });

  it('空输入返回空数组', () => {
    expect(rankDepts([])).toEqual([]);
  });
});

describe('对比分析', () => {
  it('高负荷科 vs 质控标杆科：工作量与质量维度强弱互换，排名差由加权决定', () => {
    const ranked = rankDepts([workloadStar, qualityStar]);
    // workloadStar: workload 100, quality 50 → 100*.25+100*.25+50*.25+100*.15+100*.1 = 87.5
    // qualityStar:   workload 0,  quality 100 → 0*.25+100*.25+100*.25+100*.15+100*.1 = 75
    expect(ranked[0].deptCode).toBe('T004');
    expect(ranked[0].totalScore).toBe(87.5);
    expect(ranked[1].deptCode).toBe('T005');
    expect(ranked[1].totalScore).toBe(75);

    const ws = ranked.find((r) => r.deptCode === 'T004')!;
    const qs = ranked.find((r) => r.deptCode === 'T005')!;
    const wsWorkload = ws.dimensions.find((d) => d.key === 'workload')!.score;
    const qsWorkload = qs.dimensions.find((d) => d.key === 'workload')!.score;
    const wsQuality = ws.dimensions.find((d) => d.key === 'quality')!.score;
    const qsQuality = qs.dimensions.find((d) => d.key === 'quality')!.score;
    expect(wsWorkload).toBe(100);
    expect(qsWorkload).toBe(0);
    expect(wsQuality).toBe(50);
    expect(qsQuality).toBe(100);
  });
});
