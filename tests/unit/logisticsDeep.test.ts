/**
 * 健澜科技 jlmedaios — 【科研教学后勤】医院后勤智能化深化纯函数单测（M171-C）
 *
 * 覆盖：
 *  - deepLogisticsDispatch（技能匹配 / 距离最近 / 紧急优先 / 被服库存 / 餐饮禁忌专配 /
 *    无理由滞留必给原因）；
 *  - optimizeLogisticsRoute（最近邻 + 容量约束 VRP，超容量列 infeasible）；
 *  - predictLogisticsDemand（基期 × 季节系数 × 趋势，向上取整，峰值识别）；
 *  - trackLogisticsSatisfaction（均分 / 准时率 / SLA / 投诉率 / 回访清单）。
 * 与持久化解耦，不触库，不写 SQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  deepLogisticsDispatch,
  optimizeLogisticsRoute,
  predictLogisticsDemand,
  trackLogisticsSatisfaction,
  type CompletedTask,
  type DemandPeriod,
  type LogisticsConstraints,
  type LogisticsResource,
  type LogisticsTask,
  type Seasonality,
  type TaskFeedback,
  type Vehicle,
} from '../../src/bff/aggregators/logisticsDeepAggregator';

const baseConstraints: LogisticsConstraints = {
  maxLoadPerResource: 8,
  speedMpm: 60,
  linenCategory: 'bed_linen',
};

describe('deepLogisticsDispatch（派单要高效，不能推诿）', () => {
  it('维修派单：按技能匹配派给对应工种，不会把电工派给水管任务', () => {
    const tasks: LogisticsTask[] = [
      { id: 'T-repair-elec', type: 'repair', locationName: '302病房灯', x: 100, y: 200, priority: 3, demandQty: 1, requiredSkills: ['electrician'] },
      { id: 'T-repair-plum', type: 'repair', locationName: '检验科水管', x: 400, y: 100, priority: 3, demandQty: 1, requiredSkills: ['plumber'] },
    ];
    const resources: LogisticsResource[] = [
      { id: 'R-elec', name: '王电工', type: 'repair', x: 100, y: 210, skills: ['electrician'] },
      { id: 'R-plum', name: '李管道', type: 'repair', x: 400, y: 110, skills: ['plumber'] },
    ];
    const r = deepLogisticsDispatch(tasks, resources, baseConstraints);
    expect(r.assignments).toHaveLength(2);
    const byTask = Object.fromEntries(r.assignments.map((a) => [a.taskId, a.resourceId]));
    expect(byTask['T-repair-elec']).toBe('R-elec');
    expect(byTask['T-repair-plum']).toBe('R-plum');
    expect(r.unassigned).toHaveLength(0);
  });

  it('维修派单：同技能下选距离最近的人', () => {
    const tasks: LogisticsTask[] = [
      { id: 'T1', type: 'repair', locationName: '机房空调', x: 100, y: 200, priority: 3, demandQty: 1, requiredSkills: ['hvac'] },
    ];
    const resources: LogisticsResource[] = [
      { id: 'R-far', name: '远处技工', type: 'repair', x: 500, y: 500, skills: ['hvac'] },
      { id: 'R-near', name: '近处技工', type: 'repair', x: 100, y: 205, skills: ['hvac'] },
    ];
    const r = deepLogisticsDispatch(tasks, resources, baseConstraints);
    expect(r.assignments[0].resourceId).toBe('R-near');
    // 距离近 → ETA 小
    expect(r.assignments[0].etaMin).toBeLessThan(1);
  });

  it('技能不匹配：工单进入未派单，并明确写出缺什么技能（不允许静默滞留）', () => {
    const tasks: LogisticsTask[] = [
      { id: 'T-hvac', type: 'repair', locationName: '中央空调', x: 0, y: 0, priority: 5, demandQty: 1, requiredSkills: ['hvac'] },
    ];
    const resources: LogisticsResource[] = [
      { id: 'R-elec', name: '王电工', type: 'repair', x: 0, y: 0, skills: ['electrician'] },
    ];
    const r = deepLogisticsDispatch(tasks, resources, baseConstraints);
    expect(r.assignments).toHaveLength(0);
    expect(r.unassigned).toHaveLength(1);
    expect(r.unassigned[0].reason).toContain('hvac');
  });

  it('紧急优先：高紧急工单先被派出（即便距离略远也先占人）', () => {
    const tasks: LogisticsTask[] = [
      { id: 'T-low', type: 'repair', locationName: '慢修插座', x: 100, y: 100, priority: 1, demandQty: 1, requiredSkills: ['electrician'] },
      { id: 'T-high', type: 'repair', locationName: '急诊抢救灯', x: 100, y: 100, priority: 5, demandQty: 1, requiredSkills: ['electrician'] },
    ];
    const resources: LogisticsResource[] = [
      { id: 'R1', name: '唯一电工', type: 'repair', x: 100, y: 100, skills: ['electrician'] },
    ];
    const r = deepLogisticsDispatch(tasks, resources, { ...baseConstraints, maxLoadPerResource: 1 });
    // 只有 1 人 1 个负载名额，高紧急必须被派
    expect(r.assignments[0].taskId).toBe('T-high');
    expect(r.unassigned[0].taskId).toBe('T-low');
    expect(r.unassigned[0].reason).toContain('负载');
  });

  it('被服配送：库存不足时工单滞留并说明缺口；库存足够则派出', () => {
    const tasks: LogisticsTask[] = [
      { id: 'T-lack', type: 'linen', locationName: '内科病区', x: 0, y: 0, priority: 2, demandQty: 80 },
    ];
    const resources: LogisticsResource[] = [
      { id: 'L1', name: '被服小张', type: 'linen', x: 0, y: 0 },
    ];
    const lack = deepLogisticsDispatch(tasks, resources, { ...baseConstraints, linenInventory: { bed_linen: 50 } });
    expect(lack.unassigned[0].reason).toContain('库存');
    expect(lack.assignments).toHaveLength(0);

    const enough = deepLogisticsDispatch(tasks, resources, { ...baseConstraints, linenInventory: { bed_linen: 120 } });
    expect(enough.assignments).toHaveLength(1);
  });

  it('餐饮配送：带禁忌饮食须专配资质人员；无人专配则滞留', () => {
    const tasks: LogisticsTask[] = [
      { id: 'T-diet', type: 'meal', locationName: '消化科12床', x: 0, y: 0, priority: 3, demandQty: 1, dueMinute: 480, dietaryRestrictions: ['diabetes'] },
    ];
    const qualified: LogisticsResource[] = [
      { id: 'M1', name: '专配小孙', type: 'meal', x: 0, y: 0, handlesDietary: true },
    ];
    const noQual: LogisticsResource[] = [
      { id: 'M2', name: '普通小周', type: 'meal', x: 0, y: 0 },
    ];
    const ok = deepLogisticsDispatch(tasks, qualified, baseConstraints);
    expect(ok.assignments[0].resourceId).toBe('M1');
    expect(ok.assignments[0].rationale).toContain('禁忌饮食专配');

    const bad = deepLogisticsDispatch(tasks, noQual, baseConstraints);
    expect(bad.unassigned[0].reason).toContain('特殊治疗膳食');
  });

  it('无对应岗位人员：工单滞留并提示跨岗支援', () => {
    const tasks: LogisticsTask[] = [
      { id: 'T-clean', type: 'cleaning', locationName: '门诊大厅', x: 0, y: 0, priority: 2, demandQty: 800 },
    ];
    const r = deepLogisticsDispatch(tasks, [], baseConstraints);
    expect(r.unassigned[0].reason).toContain('保洁');
  });
});

describe('optimizeLogisticsRoute（最近邻 + 容量约束 VRP）', () => {
  it('按距离就近上货，单辆车不超容量；装不下的任务列 infeasible', () => {
    const stops = [
      { id: 'S1', type: 'linen' as const, locationName: '内科', x: 10, y: 0, demandQty: 40, priority: 2 },
      { id: 'S2', type: 'linen' as const, locationName: '妇科', x: 20, y: 0, demandQty: 40, priority: 2 },
      { id: 'S3', type: 'linen' as const, locationName: '儿科', x: 100, y: 0, demandQty: 40, priority: 2 },
    ];
    const vehicles: Vehicle[] = [
      { id: 'V1', name: '被服车东', x: 0, y: 0, capacity: 60 },
      { id: 'V2', name: '被服车西', x: 0, y: 0, capacity: 60 },
    ];
    const r = optimizeLogisticsRoute(stops, vehicles);
    // 每车最多装 60，即每车一个 40 件点；两个点被装走
    expect(r.routes[0].stops.length + r.routes[1].stops.length).toBe(2);
    // S3（最远的 100,0）因两车剩余容量均不足而 infeasible
    expect(r.infeasible.map((i) => i.taskId)).toContain('S3');
    // V1 先接最近的 S1
    expect(r.routes[0].stops[0].taskId).toBe('S1');
  });

  it('无车辆时全部任务不可行', () => {
    const stops = [{ id: 'S1', type: 'linen' as const, locationName: '内科', x: 0, y: 0, demandQty: 10, priority: 1 }];
    const r = optimizeLogisticsRoute(stops, []);
    expect(r.infeasible).toHaveLength(1);
    expect(r.totalDistanceM).toBe(0);
  });
});

describe('predictLogisticsDemand（基期 × 季节 × 趋势）', () => {
  it('预测值向上取整，峰值标签正确，总量为各时段之和', () => {
    const periods: DemandPeriod[] = [
      { label: '周一', baseline: 100 },
      { label: '周六', baseline: 100 },
    ];
    const seasonality: Seasonality = { factors: { 周一: 1.2, 周六: 0.5 }, trend: 1.1 };
    const r = predictLogisticsDemand(periods, seasonality);
    // 周一：ceil(100×1.2×1.1)=132；周六：ceil(100×0.5×1.1)=55
    const byLabel = Object.fromEntries(r.items.map((i) => [i.label, i.predicted]));
    expect(byLabel['周一']).toBe(132);
    expect(byLabel['周六']).toBe(55);
    expect(r.totalPredicted).toBe(187);
    expect(r.peakLabel).toBe('周一');
  });

  it('无季节系数时按 1 处理，缺省趋势为 1', () => {
    const periods: DemandPeriod[] = [{ label: '周三', baseline: 40 }];
    const r = predictLogisticsDemand(periods, { factors: {} });
    expect(r.items[0].predicted).toBe(40);
    expect(r.items[0].factor).toBe(1);
    expect(r.items[0].trend).toBe(1);
  });
});

describe('trackLogisticsSatisfaction（满意度闭环）', () => {
  it('汇总均分/准时率/SLA/投诉率，并把低分与投诉工单列入回访', () => {
    const tasks: CompletedTask[] = [
      { id: 'T1', type: 'repair', onTime: true, withinSla: true },
      { id: 'T2', type: 'repair', onTime: false, withinSla: false },
      { id: 'T3', type: 'linen', onTime: true, withinSla: true },
      { id: 'T4', type: 'meal', onTime: false, withinSla: true },
    ];
    const feedback: TaskFeedback[] = [
      { taskId: 'T1', rating: 5 },
      { taskId: 'T2', rating: 2, complaint: true },
      { taskId: 'T3', rating: 4 },
      { taskId: 'T4', rating: 3 },
    ];
    const r = trackLogisticsSatisfaction(tasks, feedback);
    expect(r.avgRating).toBe(3.5);           // (5+2+4+3)/4
    expect(r.onTimeRate).toBe(0.5);          // T1,T3 准时
    expect(r.slaRate).toBe(0.75);            // T1,T3,T4 在 SLA
    expect(r.complaintRate).toBe(0.25);     // T2 投诉 / 4 反馈
    // 回访清单：T2(2,投诉) 排在 T4(3) 前
    expect(r.atRisk.map((a) => a.taskId)).toEqual(['T2', 'T4']);
    // 分类别：维修 2 单均分 (5+2)/2=3.5
    expect(r.byType.repair?.avgRating).toBe(3.5);
  });

  it('无反馈时各比率为 0，不抛错', () => {
    const tasks: CompletedTask[] = [{ id: 'T1', type: 'cleaning', onTime: true, withinSla: true }];
    const r = trackLogisticsSatisfaction(tasks, []);
    expect(r.avgRating).toBe(0);
    expect(r.complaintRate).toBe(0);
    expect(r.atRisk).toHaveLength(0);
  });
});
