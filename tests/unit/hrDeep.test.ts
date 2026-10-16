/**
 * 健澜科技 jlmedaios - M178-B 医院人力资源深化聚合器纯函数单测。
 *
 * 不依赖数据库：仅测 buildDeepHRMgmt / calculateStaffingGap /
 * trackTrainingRecord / calculatePerformancePay，以及公平算法 trimmedMeanOf。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildDeepHRMgmt,
  calculateStaffingGap,
  trackTrainingRecord,
  calculatePerformancePay,
  coefficientOf,
  trimmedMeanOf,
} from '@/bff/aggregators/hrDeepAggregator';

describe('calculateStaffingGap 人员缺口计算', () => {
  it('全院汇总：编制/实有/缺编守恒，缺编率=缺编/编制', () => {
    const r = calculateStaffingGap();
    // 四科室编制合计 = 12+15+60+8 = 95；实有 = 10+12+55+8 = 85；缺编 = 10
    expect(r.totalAuthorized).toBe(95);
    expect(r.totalActual).toBe(85);
    expect(r.totalVacant).toBe(10);
    expect(r.avgGapRate).toBeCloseTo(10 / 95, 2);
    expect(r.byDept).toHaveLength(4);
    for (const d of r.byDept) {
      expect(d.vacant).toBe(d.authorized - d.actual);
      expect(d.gapRate).toBeCloseTo(d.authorized > 0 ? d.vacant / d.authorized : 0, 3);
    }
  });

  it('按科室过滤：心内科只返回一个科室；未知科室回退全院', () => {
    const inDept = calculateStaffingGap('IN');
    expect(inDept.byDept).toHaveLength(1);
    expect(inDept.byDept[0].dept).toBe('IN');
    expect(inDept.byDept[0].authorized).toBe(12);
    expect(inDept.byDept[0].actual).toBe(10);
    expect(inDept.byDept[0].status).toBe('shortage');

    const unknown = calculateStaffingGap('NOT-EXIST');
    expect(unknown.byDept).toHaveLength(4);
  });
});

describe('trackTrainingRecord 培训记录跟踪', () => {
  it('已完成课程计入学分，planned 不计；达标判定正确', () => {
    // S1001：done 课程 = 8.0 + 6.0 = 14.0（planned 8.0 不计），应修 25 → 不达标
    const s1001 = trackTrainingRecord('S1001', '2026');
    expect(s1001.requiredCredits).toBe(25);
    expect(s1001.earnedCredits).toBe(14);
    expect(s1001.creditGap).toBe(11);
    expect(s1001.compliant).toBe(false);

    // S4001：种子里无记录 → earned 0，不达标
    const s4001 = trackTrainingRecord('S4001', '2026');
    expect(s4001.earnedCredits).toBe(0);
    expect(s4001.compliant).toBe(false);
  });

  it('未知员工抛错（培训跟踪失败）', () => {
    expect(() => trackTrainingRecord('NOPE', '2026')).toThrow();
  });
});

describe('calculatePerformancePay 绩效工资计算', () => {
  it('加权分/系数/绩效工资/奖金切分公式可复算', () => {
    const r = calculatePerformancePay('S1001', '2026H1');
    // KPI: quality90*0.4 + efficiency88*0.3 + service86*0.2 + collab88*0.1
    //   = 36 + 26.4 + 17.2 + 8.8 = 88.4
    expect(r.weightedScore).toBeCloseTo(88.4, 1);
    expect(r.coefficient).toBe(1.2); // 80~89 → 1.2
    // 绩效工资 = 基本工资 18000 × 1.2 = 21600
    expect(r.performancePay).toBeCloseTo(21600, 2);
    expect(r.bonusShare).toBeGreaterThan(0);
    expect(r.totalPay).toBeCloseTo(r.performancePay + r.bonusShare, 2);
    expect(r.formula).toContain('0.4');
  });

  it('系数分段映射正确（coefficientOf）', () => {
    expect(coefficientOf(95)).toBe(1.3);
    expect(coefficientOf(85)).toBe(1.2);
    expect(coefficientOf(75)).toBe(1.0);
    expect(coefficientOf(65)).toBe(0.9);
    expect(coefficientOf(55)).toBe(0.8);
  });

  it('未知员工或无 KPI 记录抛错', () => {
    expect(() => calculatePerformancePay('NOPE', '2026H1')).toThrow();
  });
});

describe('trimmedMeanOf 公平打分（去最高最低取均）', () => {
  it('≥3 评委时去掉一个最高分、一个最低分后取均值', () => {
    // [88,92,90] → 去掉 88/92 剩 90 → 90
    expect(trimmedMeanOf([88, 92, 90])).toBe(90);
    // [95,70,88] → 去掉 70/95 剩 88 → 88（高权分被中和，不被一人带偏）
    expect(trimmedMeanOf([95, 70, 88])).toBe(88);
    // 4 评委 [86,90,84,88] → 去掉 84/90 剩 86/88 → 87
    expect(trimmedMeanOf([86, 90, 84, 88])).toBe(87);
  });

  it('≤2 评委时不截尾，直接取均值（公平红线：招聘必须 ≥3）', () => {
    expect(trimmedMeanOf([80, 90])).toBe(85);
    expect(trimmedMeanOf([90])).toBe(90);
    expect(trimmedMeanOf([])).toBe(0);
  });
});

describe('buildDeepHRMgmt 阳光人力驾驶舱', () => {
  it('四维总览字段齐全、汇总守恒、含公平主张', () => {
    const view = buildDeepHRMgmt();
    expect(view.demo).toBe(true);
    expect(view.fairnessCharter).toContain('公平');
    expect(view.establishment.byDept.length).toBe(4);
    expect(view.recruitment.requisitions.length).toBeGreaterThan(0);
    expect(view.recruitment.fairnessRule).toContain('评委');
    expect(view.training.totalStaff).toBeGreaterThan(0);
    expect(view.performance.weights.quality +
      view.performance.weights.efficiency +
      view.performance.weights.service +
      view.performance.weights.collab,
    ).toBeCloseTo(1, 5);
    // 录用人数 = 各招聘需求 hiredCount 之和
    expect(view.recruitment.hiredThisPeriod).toBe(
      view.recruitment.requisitions.reduce((s, r) => s + r.hiredCount, 0),
    );
  });
});
