/**
 * 健澜科技 jlmedaios - 医院后勤报修纯函数单测（M142-D + M162-D）【医院全场景】
 *
 * M142-D 覆盖：报修创建（待派工默认态 / id 顺序递增 / 参数校验）、
 *       派工处理（待派工→已派工→处理中→已完成 全流程推进 + 非法跳转拦截）、
 *       完成统计（四态计数 / 未闭环数 / 超时未完成自动预警）。
 * M162-D 覆盖：全场景派单（12 子类自动路由责任班组 / 参数校验）、
 *       路线优化（最近邻巡线 / 空输入兜底 / 距离合计）、
 *       效率分析（准时率 / 平均闭环时长 / 派单等待恒为 0 = 不推诿）。
 * 全部内存台账，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it, beforeEach } from 'bun:test';
import {
  createLogisticsRequest,
  assignLogisticsTask,
  markProcessing,
  markDone,
  listMyRequests,
  getLogisticsReport,
  resetLogisticsStore,
  LOGISTICS_TYPES,
  dispatchLogisticsTask,
  startDeepTask,
  completeDeepTask,
  listDeepTasks,
  optimizeLogisticsRoute,
  getLogisticsEfficiency,
  DISPATCH_TASK_TYPES,
} from '../../src/bff/aggregators/logisticsAggregator';

beforeEach(() => resetLogisticsStore());

describe('报修创建 createLogisticsRequest', () => {
  it('创建后默认状态为「待派工」、尚无处理人与 eta', () => {
    const req = createLogisticsRequest('u_nurse01', '急诊科', '设备维修', '除颤仪按键失灵');
    expect(req.id).toBe('lg_0001');
    expect(req.requesterId).toBe('u_nurse01');
    expect(req.dept).toBe('急诊科');
    expect(req.type).toBe('设备维修');
    expect(req.description).toBe('除颤仪按键失灵');
    expect(req.status).toBe('待派工');
    expect(req.handlerId).toBeNull();
    expect(req.eta).toBeNull();
  });

  it('id 按顺序确定性递增', () => {
    const a = createLogisticsRequest('u1', '内科', '水电维修', '灯闪');
    const b = createLogisticsRequest('u1', '内科', '清洁服务', '地面污渍');
    expect(a.id).toBe('lg_0001');
    expect(b.id).toBe('lg_0002');
  });

  it('五类后勤类型白名单齐全', () => {
    expect(LOGISTICS_TYPES).toEqual(['设备维修', '水电维修', '清洁服务', '被服更换', '搬运服务']);
  });

  it('报修人空 / 类型非法 / 描述为空时抛错', () => {
    expect(() => createLogisticsRequest(' ', '内科', '设备维修', 'x')).toThrow(/报修人/);
    expect(() => createLogisticsRequest('u1', '内科', '空调维修' as unknown as '设备维修', 'x')).toThrow(/后勤类型非法/);
    expect(() => createLogisticsRequest('u1', '内科', '设备维修', '  ')).toThrow(/报修内容/);
  });
});

describe('派工处理 assignLogisticsTask 与状态推进', () => {
  it('派工后工单进入「已派工」并登记处理人 / eta，同时生成派工流水', () => {
    const req = createLogisticsRequest('u_nurse01', '住院部 3 病区', '被服更换', '床单污损 20 套');
    const task = assignLogisticsTask(req.id, 'houqin_wang', '2026-10-16T18:00:00');
    expect(task.id).toBe('tk_0001');
    expect(task.requestId).toBe(req.id);
    expect(task.handlerId).toBe('houqin_wang');
    expect(task.eta).toBe('2026-10-16T18:00:00');

    const mine = listMyRequests('u_nurse01')[0];
    expect(mine.status).toBe('已派工');
    expect(mine.handlerId).toBe('houqin_wang');
    expect(mine.eta).toBe('2026-10-16T18:00:00');
  });

  it('完整闭环：待派工→已派工→处理中→已完成', () => {
    const req = createLogisticsRequest('u_doctor02', 'ICU', '水电维修', '氧气终端漏气');
    assignLogisticsTask(req.id, 'houqin_li', '2026-10-16T15:00:00');
    const working = markProcessing(req.id);
    expect(working.status).toBe('处理中');
    expect(working.processingAt).not.toBeNull();
    const done = markDone(req.id);
    expect(done.status).toBe('已完成');
    expect(done.doneAt).not.toBeNull();
  });

  it('非法跳转拦截：未派工不能直接开工；已完成不能重复完成', () => {
    const req = createLogisticsRequest('u1', '内科', '清洁服务', 'x');
    expect(() => markProcessing(req.id)).toThrow(/仅「已派工」/);
    assignLogisticsTask(req.id, 'houqin_wang', '2026-10-16T18:00:00');
    expect(() => markDone(req.id)).toThrow(/仅「处理中」/); // 未开工不能直接完成
  });

  it('工单不存在 / 重复派工 / handler 空 / eta 非法 时抛错', () => {
    expect(() => assignLogisticsTask('lg_9999', 'h', '2026-10-16T18:00:00')).toThrow(/工单不存在/);
    const req = createLogisticsRequest('u1', '内科', '搬运服务', '搬一张办公桌');
    assignLogisticsTask(req.id, 'houqin_zhao', '2026-10-16T18:00:00');
    expect(() => assignLogisticsTask(req.id, 'houqin_qian', '2026-10-17T18:00:00')).toThrow(/仅「待派工」/);
    // 新一张工单：分别校验 handler 为空、eta 非法
    const fresh = createLogisticsRequest('u2', '内科', '设备维修', 'y');
    expect(() => assignLogisticsTask(fresh.id, ' ', '2026-10-16T18:00:00')).toThrow(/处理人/);
    expect(() => assignLogisticsTask(fresh.id, 'h', 'not-a-date')).toThrow(/预计完成时间/);
  });

  it('listMyRequests 按创建时间倒序，且隔离不同报修人', () => {
    createLogisticsRequest('u_a', '内科', '设备维修', '一单');
    createLogisticsRequest('u_a', '内科', '水电维修', '二单');
    createLogisticsRequest('u_b', '外科', '清洁服务', '别人的单');
    const mine = listMyRequests('u_a');
    expect(mine).toHaveLength(2);
    expect(mine[0].description).toBe('二单'); // 新报的排最前
    expect(listMyRequests('u_b')).toHaveLength(1);
  });
});

describe('完成统计 getLogisticsReport', () => {
  it('空台账安全兜底', () => {
    const rpt = getLogisticsReport(new Date('2026-10-16T12:00:00'));
    expect(rpt.total).toBe(0);
    expect(rpt.byStatus['待派工']).toBe(0);
    expect(rpt.doneCount).toBe(0);
    expect(rpt.openCount).toBe(0);
    expect(rpt.overdueAlerts).toEqual([]);
  });

  it('按四态统计完成情况：已完成数 + 未闭环数', () => {
    const p1 = createLogisticsRequest('u1', '内科', '设备维修', '监护仪黑屏');
    const p2 = createLogisticsRequest('u2', '外科', '水电维修', '空调不制冷');
    const p3 = createLogisticsRequest('u3', '门诊', '被服更换', '毛巾不足');
    // p1 走完闭环；p2 派工后开工；p3 仍待派工
    assignLogisticsTask(p1.id, 'houqin_w', '2026-10-16T10:00:00');
    markProcessing(p1.id); markDone(p1.id);
    assignLogisticsTask(p2.id, 'houqin_l', '2026-10-16T20:00:00');
    markProcessing(p2.id);

    const rpt = getLogisticsReport(new Date('2026-10-16T12:00:00'));
    expect(rpt.total).toBe(3);
    expect(rpt.byStatus['待派工']).toBe(1);
    expect(rpt.byStatus['处理中']).toBe(1);
    expect(rpt.byStatus['已完成']).toBe(1);
    expect(rpt.doneCount).toBe(1);
    expect(rpt.openCount).toBe(2); // 待派工 1 + 处理中 1
  });

  it('超时预警：过了 eta 仍未完成的工单自动进预警清单，超时最久排最前', () => {
    const now = new Date('2026-10-16T12:00:00');
    const late = createLogisticsRequest('u1', '急诊科', '水电维修', '淋浴间热水故障');
    assignLogisticsTask(late.id, 'houqin_w', '2026-10-16T08:00:00'); // 已超时 4 小时
    markProcessing(late.id);
    const soon = createLogisticsRequest('u2', '内科', '清洁服务', '走廊消毒');
    assignLogisticsTask(soon.id, 'houqin_l', '2026-10-16T14:00:00'); // 2 小时后才到期，不预警
    const done = createLogisticsRequest('u3', '外科', '设备维修', 'x');
    assignLogisticsTask(done.id, 'houqin_z', '2026-10-16T06:00:00'); // 早就过了 eta，但已闭环不算
    markProcessing(done.id); markDone(done.id);

    const rpt = getLogisticsReport(now);
    expect(rpt.overdueCount).toBe(1);
    expect(rpt.overdueAlerts[0].requestId).toBe(late.id);
    expect(rpt.overdueAlerts[0].overdueHours).toBe(4);
    expect(rpt.overdueAlerts.find((a) => a.requestId === soon.id)).toBeUndefined();
    expect(rpt.overdueAlerts.find((a) => a.requestId === done.id)).toBeUndefined();
  });
});

// ============================================================================
// M162-D 医院全场景后勤智能化：派单高效不推诿
// ============================================================================

describe('全场景派单 dispatchLogisticsTask', () => {
  it('12 种子类白名单齐全（维修/被服/餐饮/保洁四大域）', () => {
    expect(DISPATCH_TASK_TYPES).toEqual([
      '水电', '空调', '设备', '家具',
      '洗涤', '更换', '盘点',
      '患者餐', '员工餐',
      '区域划分', '频次', '检查',
    ]);
  });

  it('按类型自动路由责任班组：创建即派单，无「待派单」中间态', () => {
    const t = dispatchLogisticsTask('水电', '住院部 3 病区', '男卫水龙头漏水');
    expect(t.id).toBe('lt_0001');
    expect(t.category).toBe('维修报修');
    expect(t.taskType).toBe('水电');
    expect(t.location).toBe('住院部 3 病区');
    expect(t.description).toBe('男卫水龙头漏水');
    expect(t.handlerTeam).toBe('工程组·水电班'); // 路由表直派，不推诿
    expect(t.priority).toBe('P1');
    expect(t.status).toBe('已派单');
    expect(t.etaMinutes).toBe(60);
    expect(t.processingAt).toBeNull();
    expect(t.completedAt).toBeNull();
  });

  it('不同子类落到对应大类与班组：患者餐→餐饮配送送餐班；盘点→被服库房班', () => {
    const meal = dispatchLogisticsTask('患者餐', 'ICU', '早餐配送 12 份');
    expect(meal.category).toBe('餐饮配送');
    expect(meal.handlerTeam).toBe('营养食堂·送餐班');
    expect(meal.etaMinutes).toBe(30);

    const stock = dispatchLogisticsTask('盘点', '被服库房', '冬季棉被盘点');
    expect(stock.category).toBe('被服管理');
    expect(stock.handlerTeam).toBe('被服中心·库房班');
    expect(stock.priority).toBe('P3');

    const clean = dispatchLogisticsTask('检查', '门诊一楼大厅', '保洁质量检查');
    expect(clean.category).toBe('保洁管理');
    expect(clean.handlerTeam).toBe('物业组·质检班');
  });

  it('同一地点散列坐标恒定（路线优化可重放）', () => {
    const a = dispatchLogisticsTask('水电', '急诊一楼', 'x');
    const b = dispatchLogisticsTask('空调', '急诊一楼', 'y');
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
  });

  it('类型非法 / 地点空 / 描述空 时抛错', () => {
    expect(() => dispatchLogisticsTask('搬家', '内科', 'x')).toThrow(/任务类型非法/);
    expect(() => dispatchLogisticsTask('水电', ' ', 'x')).toThrow(/任务地点/);
    expect(() => dispatchLogisticsTask('水电', '内科', '  ')).toThrow(/任务描述/);
  });

  it('listDeepTasks 按状态过滤，且优先级高的排前面', () => {
    const p3 = dispatchLogisticsTask('盘点', '库房', '棉被盘点');
    const p1 = dispatchLogisticsTask('水电', '门诊', '漏水');
    dispatchLogisticsTask('员工餐', '食堂', '午餐');
    const all = listDeepTasks();
    expect(all).toHaveLength(3);
    expect(all[0].id).toBe(p1.id); // P1 排最前
    const p3List = listDeepTasks('已派单');
    expect(p3List.every((t) => t.status === '已派单')).toBe(true);
    expect(listDeepTasks('已完成')).toEqual([]);
    expect(listDeepTasks('全部')).toHaveLength(3);
    // 非法状态串不过滤任何单子（按状态严格匹配）
    expect(listDeepTasks('不存在状态')).toEqual([]);
  });

  it('完整闭环：已派单 → 处理中 → 已完成，重复完成被拦截', () => {
    const t = dispatchLogisticsTask('设备', 'ICU', '监护仪黑屏');
    const working = startDeepTask(t.id);
    expect(working.status).toBe('处理中');
    expect(() => startDeepTask(t.id)).toThrow(/仅「已派单」/);
    const done = completeDeepTask(t.id, 40);
    expect(done.status).toBe('已完成');
    expect(done.actualDurationMin).toBe(40);
    expect(() => completeDeepTask(t.id)).toThrow(/已完成/);
  });
});

describe('路线优化 optimizeLogisticsRoute', () => {
  it('空输入安全兜底：零站点、零里程', () => {
    const r = optimizeLogisticsRoute([]);
    expect(r.stops).toEqual([]);
    expect(r.totalDistanceKm).toBe(0);
    expect(r.stopCount).toBe(0);
  });

  it('最近邻巡线：从仓库(0,0)出发，先到最近点，少走回头路', () => {
    const r = optimizeLogisticsRoute([
      { id: 'task_a', location: 'A楼', x: 0, y: 10 },
      { id: 'task_b', location: 'B楼', x: 50, y: 50 },
      { id: 'task_c', location: 'C楼', x: 0, y: 20 },
    ]);
    expect(r.stopCount).toBe(3);
    // 仓库距 A(10) < C(20) < B(≈70.7)；A→C(10) 近于 A→B，故顺序 A→C→B
    expect(r.stops.map((s) => s.taskId)).toEqual(['task_a', 'task_c', 'task_b']);
    expect(r.stops[0].seq).toBe(1);
    expect(r.stops[0].legDistanceKm).toBe(0.5); // 仓库→A：10 格 × 0.05km
    expect(r.stops[1].legDistanceKm).toBe(0.5);  // A→C：10 格
    // C→B：√(50²+30²)×0.05 ≈ 2.92km；全程合计 ≈ 3.92km
    expect(r.stops[2].legDistanceKm).toBe(2.92);
    expect(r.totalDistanceKm).toBe(3.92);
  });

  it('输出顺序对同一输入恒等（确定性，可重放）', () => {
    const input = [
      { id: 'z', location: 'Z', x: 80, y: 80 },
      { id: 'a', location: 'A', x: 1, y: 1 },
      { id: 'm', location: 'M', x: 2, y: 2 },
    ];
    const r1 = optimizeLogisticsRoute(input);
    const r2 = optimizeLogisticsRoute(input);
    expect(r1.stops.map((s) => s.taskId)).toEqual(r2.stops.map((s) => s.taskId));
    expect(r1.stops[0].taskId).toBe('a'); // 仓库最近的是 (1,1)
  });
});

describe('效率分析 getLogisticsEfficiency', () => {
  it('空台账安全兜底：总量为 0，派单率按 1 计（自动派单零等待）', () => {
    const r = getLogisticsEfficiency('7d');
    expect(r.total).toBe(0);
    expect(r.doneCount).toBe(0);
    expect(r.openCount).toBe(0);
    expect(r.autoDispatchRate).toBe(1);
    expect(r.onTimeRate).toBe(0);
    expect(r.avgCloseMinutes).toBe(0);
    expect(r.avgDispatchWaitMinutes).toBe(0);
  });

  it('自动派单等待恒为 0：创建即派单，这就是「高效不推诿」的量化', () => {
    dispatchLogisticsTask('空调', '门诊', '不制冷');
    const r = getLogisticsEfficiency('7d');
    expect(r.total).toBe(1);
    expect(r.autoDispatchRate).toBe(1);
    expect(r.avgDispatchWaitMinutes).toBe(0);
    expect(r.openCount).toBe(1);
  });

  it('准时率 / 平均闭环时长 / 大类分布：实际时长未超 eta 即准时', () => {
    const onTime = dispatchLogisticsTask('水电', '住院部 1 病区', '漏水');
    const late = dispatchLogisticsTask('患者餐', 'ICU', '晚餐配送');
    // 水电 eta=60，实际 30 分钟 → 准时；患者餐 eta=30，实际 45 → 超时
    completeDeepTask(onTime.id, 30);
    completeDeepTask(late.id, 45);

    const r = getLogisticsEfficiency('7d');
    expect(r.total).toBe(2);
    expect(r.doneCount).toBe(2);
    expect(r.openCount).toBe(0);
    expect(r.onTimeRate).toBe(0.5);            // 2 单 1 准时
    expect(r.avgCloseMinutes).toBe(37.5);      // (30+45)/2
    expect(r.byCategory['维修报修']).toBe(1);
    expect(r.byCategory['餐饮配送']).toBe(1);
    expect(r.byCategory['被服管理']).toBe(0);
    expect(r.byCategory['保洁管理']).toBe(0);
    expect(r.byPriority['P1']).toBe(2);       // 水电 / 患者餐都是 P1
  });

  it('未知 period 兜底为 7d；未闭环任务计入 openCount 而非准时率分母', () => {
    const open = dispatchLogisticsTask('洗涤', '被服中心', '手术衣洗涤');
    const closed = dispatchLogisticsTask('家具', '行政楼', '椅子松动');
    completeDeepTask(closed.id, 100); // eta=120 → 准时
    const r = getLogisticsEfficiency('未知周期');
    expect(r.period).toBe('7d');
    expect(r.total).toBe(2);
    expect(r.doneCount).toBe(1);
    expect(r.openCount).toBe(1);
    expect(onTimeRateOf(r)).toBe(1);
    expect(open.id).toBe('lt_0001');
  });
});

/** 小工具：只读取准时率，避免在断言里重复解构 */
function onTimeRateOf(r: ReturnType<typeof getLogisticsEfficiency>): number {
  return r.onTimeRate;
}
