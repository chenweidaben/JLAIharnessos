/**
 * 健澜科技 jlmedaios - 党建工会活动留痕纯函数单测（M140-D · 医院管理深化）
 *
 * 【医院管理深化】党支部学习/主题党日/工会福利/职工文体/志愿服务，活动留痕。
 * 覆盖：
 *   - registerPartyActivity：组包、参与者名单 trim/滤空、participantCount 留痕；
 *   - 参与者统计：participantCount 即留痕人数，分类型人次聚合；
 *   - getAnnualActivityReport：按活动日期年份切片、分类型场次/人次、按月分布、跨年排除；
 *   - 纪律：非法类型 / 空标题 / 空组织者 / 非法日期 / 非法年份抛错。
 *
 * 与持久化解耦：不触库（persistPartyActivity 由路由层显式调用，单测不覆盖）。
 * 用远未来年份 2099/2098 做切片断言，避免与同进程其他用例的台账数据串扰。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  PARTY_ACTIVITY_TYPES,
  getAnnualActivityReport,
  registerPartyActivity,
  type PartyActivityType,
} from '../../src/bff/aggregators/partyUnionAggregator';

const ORG = 'aaaaaaaa-0000-0000-0000-000000000001';
const YEAR = 2099; // 远未来年份：年度报告断言不受其他用例台账干扰

describe('registerPartyActivity 活动登记', () => {
  it('组包：返回带 id 的活动，类型/标题/日期/地点原样留痕', () => {
    const a = registerPartyActivity(
      '主题党日',
      '学习贯彻二十届四中全会精神',
      ORG,
      '2099-03-15',
      '党员活动室',
      ['张三', '李四', '王五'],
    );
    expect(a.id).toBeTruthy();
    expect(a.type).toBe('主题党日');
    expect(a.title).toBe('学习贯彻二十届四中全会精神');
    expect(a.organizerId).toBe(ORG);
    expect(a.date).toBe('2099-03-15');
    expect(a.location).toBe('党员活动室');
    expect(a.createdAt).toBeTruthy();
  });

  it('五类活动类型全集与 SQL CHECK 对齐', () => {
    expect([...PARTY_ACTIVITY_TYPES]).toEqual(['党支部学习', '主题党日', '工会福利', '职工文体', '志愿服务']);
  });

  it('非法入参抛错（非法类型 / 空标题 / 空组织者 / 非法日期）', () => {
    expect(() =>
      registerPartyActivity('团建' as PartyActivityType, 't', ORG, '2099-01-01', '', []),
    ).toThrow(/活动类型/);
    expect(() => registerPartyActivity('主题党日', '  ', ORG, '2099-01-01', '', [])).toThrow(/标题/);
    expect(() => registerPartyActivity('主题党日', 't', '', '2099-01-01', '', [])).toThrow(/组织者/);
    expect(() => registerPartyActivity('主题党日', 't', ORG, '2099/01/01', '', [])).toThrow(/日期/);
    expect(() => registerPartyActivity('主题党日', 't', ORG, '2099-02-30', '', [])).toThrow(/日期/);
  });
});

describe('参与者统计', () => {
  it('名单逐人 trim 并滤空，participantCount 即留痕人数', () => {
    const a = registerPartyActivity(
      '工会福利',
      '春节慰问一线职工',
      ORG,
      '2099-01-20',
      '门诊大厅',
      ['  张三 ', '', '李四', '   ', '王五'],
    );
    expect(a.participants).toEqual(['张三', '李四', '王五']);
    expect(a.participantCount).toBe(3);
  });

  it('空名单合法登记为 0 人（如纯学习传达型活动）', () => {
    const a = registerPartyActivity('党支部学习', '支委会集体学习', ORG, '2099-01-10', '', []);
    expect(a.participantCount).toBe(0);
    expect(a.participants).toEqual([]);
  });
});

describe('getAnnualActivityReport 年度报告', () => {
  it('按活动日期年份切片：当年场次/人次聚合，跨年活动排除', () => {
    // 2099 年：两场不同类型
    registerPartyActivity('主题党日', '秋祭英烈主题党日', ORG, '2099-04-05', '烈士陵园', ['赵一', '赵二']);
    registerPartyActivity('志愿服务', '社区义诊志愿服务', ORG, '2099-06-18', '幸福社区', ['钱一', '钱二', '钱三']);
    // 2098 年：跨年干扰项
    registerPartyActivity('职工文体', '跨年运动会', ORG, '2098-12-30', '体育馆', ['孙一']);

    const rep = getAnnualActivityReport(YEAR);
    expect(rep.year).toBe(YEAR);
    // 跨年活动不计入 2099
    expect(rep.totalActivities).toBeGreaterThanOrEqual(2);
    expect(rep.activities.some((a) => a.title === '跨年运动会')).toBe(false);

    // 分类型场次与人次：主题党日 1 场 2 人次、志愿服务 1 场 3 人次
    expect(rep.byType['主题党日']).toBeGreaterThanOrEqual(1);
    expect(rep.byType['志愿服务']).toBeGreaterThanOrEqual(1);
    expect(rep.byTypeParticipants['主题党日']).toBeGreaterThanOrEqual(2);
    expect(rep.byTypeParticipants['志愿服务']).toBeGreaterThanOrEqual(3);

    // 五类全覆盖，缺省为 0
    expect(rep.byType['工会福利']).toBeGreaterThanOrEqual(0);
    expect(rep.byType['职工文体']).toBeGreaterThanOrEqual(0);
  });

  it('按月分布：4 月主题党日计入 monthly[3]，6 月志愿服务计入 monthly[5]', () => {
    const rep = getAnnualActivityReport(YEAR);
    expect(rep.monthly).toHaveLength(12);
    expect(rep.monthly[3]).toBeGreaterThanOrEqual(1); // 4 月
    expect(rep.monthly[5]).toBeGreaterThanOrEqual(1); // 6 月
    // 全年人次合计 = 各类型人次合计
    const sumByType = Object.values(rep.byTypeParticipants).reduce((s, n) => s + n, 0);
    expect(rep.totalParticipants).toBe(sumByType);
  });

  it('当年无活动时返回五类完整骨架（不缺键，前端不兜底）', () => {
    const rep = getAnnualActivityReport(2077);
    expect(rep.year).toBe(2077);
    expect(rep.totalActivities).toBe(0);
    expect(rep.totalParticipants).toBe(0);
    expect(Object.keys(rep.byType).sort()).toEqual(
      ['工会福利', '职工文体', '志愿服务', '党支部学习', '主题党日'].sort(),
    );
    expect(rep.monthly.every((n) => n === 0)).toBe(true);
  });

  it('非法年份抛错', () => {
    expect(() => getAnnualActivityReport(1999)).toThrow(/年份/);
    expect(() => getAnnualActivityReport(2500)).toThrow(/年份/);
    expect(() => getAnnualActivityReport(2099.5)).toThrow(/年份/);
  });
});
