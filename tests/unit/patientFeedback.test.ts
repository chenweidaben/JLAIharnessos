/**
 * 健澜科技 jlmedaios - M122-D 患者满意度反馈闭环单测
 *
 * 验证「患者提交评价 -> 满意度统计 -> 问题提取」闭环：
 *  - 空输入：安全返回零结果，不抛错；
 *  - 满意度统计：科室分组求均分、按均分降序、总体均分正确；
 *  - 问题提取：评论命中关键词归类为高频问题，按命中数降序；
 *  - 改进方向：低分（<=3）反馈才进入改进方向归类；
 *  - 幂等/边界：非有限数字评分被忽略，空科室归入 UNKNOWN。
 * 全部为纯函数断言，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  analyzePatientFeedback,
  deriveImprovementAreas,
  extractTopIssues,
  rankByDept,
  type PatientFeedbackItem,
} from '../../src/bff/aggregators/patientFeedbackAggregator';

/** 构造一条反馈的快捷函数 */
const fb = (over: Partial<PatientFeedbackItem>): PatientFeedbackItem => ({
  patientId: 'P001',
  visitId: 'V-1',
  doctorId: '',
  deptCode: 'OUTP',
  rating: 5,
  comment: '',
  ...over,
});

describe('M122-D 患者满意度反馈闭环', () => {
  it('空输入：安全返回零结果，不抛错', () => {
    const r = analyzePatientFeedback([]);
    expect(r.total).toBe(0);
    expect(r.overallAvg).toBe(0);
    expect(r.deptSatisfactionRank).toEqual([]);
    expect(r.topIssues).toEqual([]);
    expect(r.improvementAreas).toEqual([]);
    // 非数组输入也兜底
    expect(analyzePatientFeedback(null as unknown as PatientFeedbackItem[]).total).toBe(0);
  });

  it('满意度统计：科室分组求均分并按均分降序', () => {
    const list = [
      fb({ deptCode: 'DEPT_A', rating: 5 }),
      fb({ deptCode: 'DEPT_A', rating: 3 }), // A 均分 4
      fb({ deptCode: 'DEPT_B', rating: 2 }),
      fb({ deptCode: 'DEPT_B', rating: 4 }),
      fb({ deptCode: 'DEPT_B', rating: 3 }), // B 均分 3
    ];
    const ranks = rankByDept(list);
    expect(ranks).toHaveLength(2);
    expect(ranks[0].deptCode).toBe('DEPT_A');
    expect(ranks[0].avgRating).toBe(4);
    expect(ranks[0].count).toBe(2);
    expect(ranks[1].deptCode).toBe('DEPT_B');
    expect(ranks[1].avgRating).toBe(3);
  });

  it('总体均分：所有有效评分的平均值保留两位小数', () => {
    const r = analyzePatientFeedback([
      fb({ rating: 5 }),
      fb({ rating: 4 }),
      fb({ rating: 3 }),
    ]);
    expect(r.total).toBe(3);
    expect(r.overallAvg).toBe(4);
  });

  it('问题提取：评论命中关键词归类为高频问题并按命中数降序', () => {
    const list = [
      fb({ comment: '等太久了，排队时间长' }), // wait x1
      fb({ comment: '医生态度冷漠' }), // attitude x1
      fb({ comment: '又排队等太久，收费也贵' }), // wait + cost
    ];
    const issues = extractTopIssues(list);
    expect(issues.length).toBeGreaterThan(0);
    // wait 命中 2 条，应排第一
    expect(issues[0].key).toBe('wait');
    expect(issues[0].count).toBe(2);
    // 同一条评论命中多个类别，各计一次
    const cost = issues.find((i) => i.key === 'cost');
    expect(cost?.count).toBe(1);
  });

  it('改进方向：只有低分（<=3）反馈才进入归类', () => {
    const list = [
      fb({ rating: 5, comment: '医生态度很好' }), // 高分，不计入
      fb({ rating: 2, comment: '等太久了，排队慢' }), // 低分，wait
      fb({ rating: 3, comment: '环境很脏很吵' }), // 低分，environment
    ];
    const areas = deriveImprovementAreas(list);
    const wait = areas.find((a) => a.area === 'wait');
    const env = areas.find((a) => a.area === 'environment');
    expect(wait?.count).toBe(1);
    expect(env?.count).toBe(1);
    // 高分反馈里即便提到问题词，也不应计入改进方向
    expect(areas.find((a) => a.label === '服务态度')).toBeUndefined();
  });

  it('边界：空科室归入 UNKNOWN，非有限数字评分被忽略', () => {
    const list = [
      fb({ deptCode: '', rating: 5 }),
      fb({ deptCode: 'OUTP', rating: NaN } as Partial<PatientFeedbackItem>),
    ];
    const ranks = rankByDept(list);
    expect(ranks.find((r) => r.deptCode === 'UNKNOWN')?.count).toBe(1);
    // NaN 行不计入任何科室、也不计入总分
    const r = analyzePatientFeedback(list);
    expect(r.overallAvg).toBe(5);
  });
});
