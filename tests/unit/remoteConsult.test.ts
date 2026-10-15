/**
 * 健澜科技 jlmedaios - 远程会诊纯函数单测（M143-B · 互联网医院与远程医疗）
 *
 * 覆盖：
 *   - requestRemoteConsultation：三类会诊自动判别（院内MDT / 院间 / 国际）、
 *     急会诊 urgent 标记与 2h 时限、MDT 多人专家名单拆分、入参校验；
 *   - acceptRemoteConsultation：院间/国际单专家接受即 accepted、
 *     MDT 逐位接受（全部接受才整体 accepted）、重复接受 / 名单外专家拦截；
 *   - submitRemoteReport：先 accepted 才能出报告、重复提交拦截、报告留痕；
 *   - 急会诊 2h 未接受自动升级（escalated），超期提醒文案。
 *
 * 与持久化解耦：不触库（persistConsult 由路由层显式调用，单测不覆盖）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import {
  acceptRemoteConsultation,
  listRemoteConsults,
  requestRemoteConsultation,
  resetRemoteConsultLedger,
  submitRemoteReport,
  URGENT_RESPONSE_HOURS,
} from '../../src/bff/aggregators/remoteConsultAggregator';

beforeEach(() => resetRemoteConsultLedger());

describe('requestRemoteConsultation 会诊申请', () => {
  it('按受邀机构自动判别三类会诊', () => {
    // 院内 MDT：机构留空 → mdt，专家多人拆分
    const mdt = requestRemoteConsultation(
      '普外科', '陈医生', 'P1', '疑难病例多学科讨论',
      '', '张主任,李主任,王主任', '2026-10-16T09:00:00Z',
    );
    expect(mdt.consultType).toBe('mdt');
    expect(mdt.consultTypeLabel).toBe('院内多学科会诊');
    expect(mdt.experts).toEqual(['张主任', '李主任', '王主任']);
    expect(mdt.status).toBe('requested');
    expect(mdt.urgent).toBe(false);

    // 院间远程：有外院机构名 → inter_hospital
    const inter = requestRemoteConsultation(
      '心内科', '刘医生', 'P2', '请上级医院评估冠脉方案',
      '省立医院', '赵专家', '2026-10-16T09:00:00Z',
    );
    expect(inter.consultType).toBe('inter_hospital');
    expect(inter.consultTypeLabel).toBe('院间远程会诊');
    expect(inter.experts).toEqual(['赵专家']);

    // 国际远程：机构含「国际」→ international
    const intl = requestRemoteConsultation(
      '神经外科', '周医生', 'P3', '请海外机构评估手术入路',
      '梅奥国际医学中心', 'Smith', '2026-10-16T09:00:00Z',
    );
    expect(intl.consultType).toBe('international');
    expect(intl.consultTypeLabel).toBe('国际远程会诊');
  });

  it('会诊原因含「急」即标记 urgent，接受时限为申请时刻 + 2h', () => {
    const consult = requestRemoteConsultation(
      '急诊科', '陈医生', 'P9', '急会诊：术后呼吸困难',
      '', '张主任', '2026-10-16T09:00:00Z',
    );
    expect(consult.urgent).toBe(true);
    expect(URGENT_RESPONSE_HOURS).toBe(2);
    // acceptDeadlineAt = 09:00 + 2h = 11:00
    expect(new Date(consult.acceptDeadlineAt).toISOString()).toBe('2026-10-16T11:00:00.000Z');
  });

  it('必填项为空 / 专家名单为空抛错', () => {
    expect(() => requestRemoteConsultation('', '陈医生', 'P1', '病情', '', '张主任')).toThrow();
    expect(() => requestRemoteConsultation('普外科', '', 'P1', '病情', '', '张主任')).toThrow();
    expect(() => requestRemoteConsultation('普外科', '陈医生', '', '病情', '', '张主任')).toThrow();
    expect(() => requestRemoteConsultation('普外科', '陈医生', 'P1', '', '', '张主任')).toThrow();
    expect(() => requestRemoteConsultation('普外科', '陈医生', 'P1', '病情', '', '   ')).toThrow();
  });
});

describe('acceptRemoteConsultation 专家接受', () => {
  it('院间 / 国际单专家接受即整体进入 accepted', () => {
    const consult = requestRemoteConsultation(
      '心内科', '刘医生', 'P2', '评估冠脉方案',
      '省立医院', '赵专家', '2026-10-16T09:00:00Z',
    );
    const accepted = acceptRemoteConsultation(consult.id, '赵专家', '2026-10-16T09:30:00Z');
    expect(accepted.status).toBe('accepted');
    expect(accepted.acceptedExperts).toEqual(['赵专家']);
    expect(accepted.acceptedBy).toBe('赵专家');
    expect(accepted.acceptedAt).toBe('2026-10-16T09:30:00.000Z');
  });

  it('MDT 多专家逐位接受：全部接受后才整体进入 accepted', () => {
    const mdt = requestRemoteConsultation(
      '普外科', '陈医生', 'P1', '疑难病例多学科讨论',
      '', '张主任,李主任,王主任', '2026-10-16T09:00:00Z',
    );

    // 前两位接受后仍处于 requested
    const a1 = acceptRemoteConsultation(mdt.id, '张主任', '2026-10-16T09:10:00Z');
    expect(a1.status).toBe('requested');
    const a2 = acceptRemoteConsultation(mdt.id, '李主任', '2026-10-16T09:20:00Z');
    expect(a2.status).toBe('requested');
    expect(a2.acceptedExperts).toEqual(['张主任', '李主任']);

    // 第三位接受后整体 accepted
    const a3 = acceptRemoteConsultation(mdt.id, '王主任', '2026-10-16T09:30:00Z');
    expect(a3.status).toBe('accepted');
    expect(a3.acceptedExperts).toHaveLength(3);
  });

  it('名单外专家 / 重复接受 / 已报告后再接受抛错', () => {
    const consult = requestRemoteConsultation(
      '心内科', '刘医生', 'P2', '评估冠脉方案',
      '省立医院', '赵专家', '2026-10-16T09:00:00Z',
    );
    expect(() => acceptRemoteConsultation(consult.id, '不在名单的专家')).toThrow();
    acceptRemoteConsultation(consult.id, '赵专家');
    expect(() => acceptRemoteConsultation(consult.id, '赵专家')).toThrow(); // 重复接受
    submitRemoteReport(consult.id, '建议药物保守治疗');
    expect(() => acceptRemoteConsultation(consult.id, '赵专家')).toThrow(); // 已报告
    expect(() => acceptRemoteConsultation('not-exist', '赵专家')).toThrow();
  });
});

describe('submitRemoteReport 报告提交', () => {
  it('accepted 后提交报告，状态进入 reported 并留痕', () => {
    const consult = requestRemoteConsultation(
      '心内科', '刘医生', 'P2', '评估冠脉方案',
      '省立医院', '赵专家', '2026-10-16T09:00:00Z',
    );
    acceptRemoteConsultation(consult.id, '赵专家', '2026-10-16T09:30:00Z');
    const reported = submitRemoteReport(
      consult.id, '建议择期 PCI，抗血小板治疗，三周后复诊', '2026-10-16T11:00:00Z',
    );
    expect(reported.status).toBe('reported');
    expect(reported.report).toContain('PCI');
    expect(reported.reportedAt).toBe('2026-10-16T11:00:00.000Z');
  });

  it('未接受即提交报告 / 空报告 / 重复提交抛错', () => {
    const consult = requestRemoteConsultation(
      '心内科', '刘医生', 'P2', '评估冠脉方案',
      '省立医院', '赵专家', '2026-10-16T09:00:00Z',
    );
    // 仍 requested：不能出报告
    expect(() => submitRemoteReport(consult.id, '报告内容')).toThrow();
    acceptRemoteConsultation(consult.id, '赵专家');
    expect(() => submitRemoteReport(consult.id, '')).toThrow();
    submitRemoteReport(consult.id, '报告一');
    expect(() => submitRemoteReport(consult.id, '报告二')).toThrow(); // 重复提交
  });
});

describe('急会诊 2h 未接受自动升级', () => {
  it('超 2h 仍 requested → escalated=true 并生成升级提醒', () => {
    const consult = requestRemoteConsultation(
      '急诊科', '陈医生', 'P9', '急会诊：术后呼吸困难',
      '', '张主任', '2026-10-16T09:00:00Z',
    );

    // 10:30（1.5h）：尚未超 2h
    const before = listRemoteConsults('2026-10-16T10:30:00Z');
    expect(before[0].escalated).toBe(false);

    // 11:01（刚过 2h 时限 11:00）：自动升级
    const after = listRemoteConsults('2026-10-16T11:01:00Z');
    expect(after[0].escalated).toBe(true);
    expect(after[0].escalationMessage).toContain('急会诊升级');
    expect(after[0].escalationMessage).toContain('2 小时');
  });

  it('非急会诊不升级；已被接受的急会诊不升级', () => {
    // 普通会诊：即使超 2h 也不升级
    const normal = requestRemoteConsultation(
      '心内科', '刘医生', 'P2', '常规病例讨论',
      '省立医院', '赵专家', '2026-10-16T09:00:00Z',
    );
    const list1 = listRemoteConsults('2026-10-16T15:00:00Z');
    expect(list1.find((c) => c.id === normal.id)?.escalated).toBe(false);

    // 急会诊但 1h 内已接受：不升级
    const urgent = requestRemoteConsultation(
      '急诊科', '陈医生', 'P9', '急会诊：术后呼吸困难',
      '', '张主任', '2026-10-16T09:00:00Z',
    );
    acceptRemoteConsultation(urgent.id, '张主任', '2026-10-16T09:45:00Z');
    const list2 = listRemoteConsults('2026-10-16T15:00:00Z');
    expect(list2.find((c) => c.id === urgent.id)?.escalated).toBe(false);
  });
});
