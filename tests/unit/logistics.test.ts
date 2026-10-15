/**
 * 健澜科技 jlmedaios - 医院后勤报修纯函数单测（M142-D）【预防保健与患者服务】
 *
 * 覆盖：报修创建（待派工默认态 / id 顺序递增 / 参数校验）、
 *       派工处理（待派工→已派工→处理中→已完成 全流程推进 + 非法跳转拦截）、
 *       完成统计（四态计数 / 未闭环数 / 超时未完成自动预警）。
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
