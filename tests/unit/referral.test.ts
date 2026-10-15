/**
 * 健澜科技 jlmedaios - 双向转诊纯函数单测（M143-C）【互联网医院与远程医疗】
 *
 * 覆盖：转诊创建（待接收默认态 / id 顺序递增 / 方向自动识别 / 参数校验）、
 *       接收完成（待接收→已接收→已完成 全流程推进 + 非法跳转拦截）、
 *       双向方向（上转基层→三甲 / 下转三甲→基层康复 / 院内转科）、
 *       转入队列（listIncoming 过滤与排序）、
 *       完成统计（三态计数 / 超期未闭环自动预警）。
 * 全部内存台账，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it, beforeEach } from 'bun:test';
import {
  createReferral,
  acceptReferral,
  completeReferral,
  listIncoming,
  getReferralReport,
  resetReferralStore,
  REFERRAL_DIRECTIONS,
} from '../../src/bff/aggregators/referralAggregator';

beforeEach(() => resetReferralStore());

describe('转诊创建 createReferral', () => {
  it('创建后默认状态为「待接收」、尚无接诊医生与转归', () => {
    const ref = createReferral('P10086', '朝阳社区卫生服务中心', '心血管内科', '胸痛待查', '2026-10-17T09:00:00');
    expect(ref.id).toBe('rf_0001');
    expect(ref.patientId).toBe('P10086');
    expect(ref.fromDept).toBe('朝阳社区卫生服务中心');
    expect(ref.toDept).toBe('心血管内科');
    expect(ref.reason).toBe('胸痛待查');
    expect(ref.expectedDate).toBe('2026-10-17T09:00:00');
    expect(ref.status).toBe('待接收');
    expect(ref.acceptingDoctor).toBeNull();
    expect(ref.outcome).toBeNull();
  });

  it('id 按顺序确定性递增', () => {
    const a = createReferral('P1', '消化内科', '心血管内科', '胸闷', '2026-10-17T09:00:00');
    const b = createReferral('P2', '心血管内科', '康复医学科', '术后康复', '2026-10-18T09:00:00');
    expect(a.id).toBe('rf_0001');
    expect(b.id).toBe('rf_0002');
  });

  it('三种转诊方向白名单齐全', () => {
    expect(REFERRAL_DIRECTIONS).toEqual(['上转', '下转', '院内转科']);
  });

  it('双向方向自动识别：基层→三甲为上转，三甲→基层康复为下转，双方院内为转科', () => {
    const up = createReferral('P1', '城西社区卫生服务中心', '心血管内科', '胸痛待查', '2026-10-17T09:00:00');
    expect(up.direction).toBe('上转');

    const down = createReferral('P2', '心血管内科', '城东社区卫生服务中心（康复随访）', '术后康复', '2026-10-18T09:00:00');
    expect(down.direction).toBe('下转');

    const intra = createReferral('P3', '消化内科', '心血管内科', '活动后胸闷', '2026-10-19T09:00:00');
    expect(intra.direction).toBe('院内转科');
  });

  it('患者空 / 转出科室空 / 转入科室空 / 转出转入相同 / 原因空 / 预计日期非法时抛错', () => {
    expect(() => createReferral(' ', '社区卫生服务中心', '心血管内科', 'x', '2026-10-17T09:00:00')).toThrow(/患者 ID/);
    expect(() => createReferral('P1', ' ', '心血管内科', 'x', '2026-10-17T09:00:00')).toThrow(/转出科室/);
    expect(() => createReferral('P1', '心血管内科', ' ', 'x', '2026-10-17T09:00:00')).toThrow(/转入科室/);
    expect(() => createReferral('P1', '心血管内科', '心血管内科', 'x', '2026-10-17T09:00:00')).toThrow(/不能相同/);
    expect(() => createReferral('P1', '心血管内科', '呼吸内科', '  ', '2026-10-17T09:00:00')).toThrow(/转诊原因/);
    expect(() => createReferral('P1', '心血管内科', '呼吸内科', 'x', 'not-a-date')).toThrow(/预计接诊日期/);
  });
});

describe('接收与闭环 acceptReferral / completeReferral', () => {
  it('接收后进入「已接收」并登记接诊医生与接收时间', () => {
    const ref = createReferral('P20001', '城西社区卫生服务中心', '神经内科', '突发肢体麻木', '2026-10-17T09:00:00');
    const accepted = acceptReferral(ref.id, 'neuro_wang');
    expect(accepted.status).toBe('已接收');
    expect(accepted.acceptingDoctor).toBe('neuro_wang');
    expect(accepted.acceptedAt).not.toBeNull();
  });

  it('完整闭环：待接收→已接收→已完成，完成时登记转归结局', () => {
    const ref = createReferral('P20002', '心血管内科', '康复医学科', '心梗术后康复', '2026-10-17T09:00:00');
    acceptReferral(ref.id, 'rehab_li');
    const done = completeReferral(ref.id, '病情稳定转回基层随访');
    expect(done.status).toBe('已完成');
    expect(done.outcome).toBe('病情稳定转回基层随访');
    expect(done.completedAt).not.toBeNull();
  });

  it('非法跳转拦截：未接收不能直接完成；已完成不能重复完成；不能重复接收', () => {
    const ref = createReferral('P1', '社区卫生服务中心', '心血管内科', 'x', '2026-10-17T09:00:00');
    expect(() => completeReferral(ref.id, 'x')).toThrow(/仅「已接收」/); // 没人接就结案，禁止
    acceptReferral(ref.id, 'doc_zhao');
    expect(() => acceptReferral(ref.id, 'doc_qian')).toThrow(/仅「待接收」/); // 重复接收
    completeReferral(ref.id, '收入院');
    expect(() => completeReferral(ref.id, '再结案')).toThrow(/仅「已接收」/);
  });

  it('转诊单不存在 / 接诊医生空 / 转归结局空 时抛错', () => {
    expect(() => acceptReferral('rf_9999', 'doc')).toThrow(/转诊单不存在/);
    expect(() => completeReferral('rf_9999', 'outcome')).toThrow(/转诊单不存在/);
    const ref = createReferral('P1', '社区卫生服务中心', '心血管内科', 'x', '2026-10-17T09:00:00');
    expect(() => acceptReferral(ref.id, ' ')).toThrow(/接诊医生/);
    acceptReferral(ref.id, 'doc_w');
    expect(() => completeReferral(ref.id, '  ')).toThrow(/转归结局/);
  });
});

describe('转入队列 listIncoming', () => {
  it('只返回「待接收」转诊单，可按转入科室过滤，按预计接诊日期升序', () => {
    createReferral('P1', '消化内科', '心血管内科', '胸闷', '2026-10-20T09:00:00');
    const urgent = createReferral('P2', '城西社区卫生服务中心', '心血管内科', '胸痛', '2026-10-17T09:00:00');
    createReferral('P3', '心血管内科', '城东社区卫生服务中心', '术后康复', '2026-10-18T09:00:00');
    // 已接收的不进转入队列
    acceptReferral(urgent.id, 'doc_cardi');

    const all = listIncoming();
    expect(all.map((r) => r.id).sort()).toEqual(['rf_0001', 'rf_0003']);

    const cardio = listIncoming('心血管内科');
    expect(cardio).toHaveLength(1);
    expect(cardio[0].id).toBe('rf_0001');

    // 未接收单按预计接诊日期升序：早到期的排前面
    const first = createReferral('P9', '呼吸内科', '肾内科', '肾功能异常', '2026-10-16T08:00:00');
    const queue = listIncoming();
    expect(queue[0].id).toBe(first.id);
  });
});

describe('完成统计 getReferralReport', () => {
  it('空台账安全兜底', () => {
    const rpt = getReferralReport(new Date('2026-10-16T12:00:00'));
    expect(rpt.total).toBe(0);
    expect(rpt.byStatus['待接收']).toBe(0);
    expect(rpt.completedCount).toBe(0);
    expect(rpt.openCount).toBe(0);
    expect(rpt.overdueAlerts).toEqual([]);
  });

  it('按三态统计：已闭环数 + 未闭环数', () => {
    const done = createReferral('P1', '心血管内科', '康复医学科', '术后康复', '2026-10-16T10:00:00');
    acceptReferral(done.id, 'rehab_w'); completeReferral(done.id, '转回基层');
    const doing = createReferral('P2', '城西社区卫生服务中心', '神经内科', '头晕待查', '2026-10-16T20:00:00');
    acceptReferral(doing.id, 'neuro_l');
    createReferral('P3', '消化内科', '心血管内科', '胸闷', '2026-10-16T22:00:00');

    const rpt = getReferralReport(new Date('2026-10-16T12:00:00'));
    expect(rpt.total).toBe(3);
    expect(rpt.byStatus['待接收']).toBe(1);
    expect(rpt.byStatus['已接收']).toBe(1);
    expect(rpt.byStatus['已完成']).toBe(1);
    expect(rpt.completedCount).toBe(1);
    expect(rpt.openCount).toBe(2); // 待接收 1 + 已接收 1
  });

  it('超期预警：过了预计接诊日期仍未闭环的自动进预警清单，超时最久排最前', () => {
    const now = new Date('2026-10-16T12:00:00');
    const late = createReferral('P1', '城西社区卫生服务中心', '心血管内科', '胸痛待查', '2026-10-16T08:00:00'); // 已超时 4 小时
    const soon = createReferral('P2', '消化内科', '呼吸内科', '发热待查', '2026-10-16T14:00:00'); // 2 小时后才到期，不预警
    const done = createReferral('P3', '心血管内科', '城东社区卫生服务中心', '术后康复', '2026-10-16T06:00:00'); // 早过预计日期但已闭环不算
    acceptReferral(done.id, 'doc_z'); completeReferral(done.id, '转回社区');

    const rpt = getReferralReport(now);
    expect(rpt.overdueCount).toBe(1);
    expect(rpt.overdueAlerts[0].referralId).toBe(late.id);
    expect(rpt.overdueAlerts[0].overdueHours).toBe(4);
    expect(rpt.overdueAlerts[0].direction).toBe('上转');
    expect(rpt.overdueAlerts.find((a) => a.referralId === soon.id)).toBeUndefined();
    expect(rpt.overdueAlerts.find((a) => a.referralId === done.id)).toBeUndefined();
  });
});
