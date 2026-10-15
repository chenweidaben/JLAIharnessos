/**
 * 健澜科技 jlmedaios - 预防接种纯函数单测（M142-B · 预防保健与患者服务）
 *
 * 覆盖：
 *   - scheduleVaccine：五类疫苗自动归类、剂次间隔推导、默认剂次、入参校验；
 *   - recordVaccineDose：登记一针、按实际接种日期滚动重算下一针、
 *     重复接种拦截、剂次越界 / 必填项校验；
 *   - getNextDoseReminder：下一针提前 7 天进入提醒窗口、超期标记、全程完成。
 *
 * 与持久化解耦：不触库（persistPlan 由路由层显式调用，单测不覆盖）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import {
  getNextDoseReminder,
  listPlansByPatient,
  recordVaccineDose,
  resetVaccinationLedger,
  scheduleVaccine,
} from '../../src/bff/aggregators/vaccinationAggregator';

beforeEach(() => resetVaccinationLedger());

describe('scheduleVaccine 接种计划排程', () => {
  it('按疫苗名自动归类五类疫苗，并推导剂次间隔', () => {
    // 乙肝 0-1-6 月：间隔 30 / 150 天
    const hepb = scheduleVaccine('P1', '重组乙肝疫苗', 3, '2026-10-16');
    expect(hepb.category).toBe('hepb');
    expect(hepb.categoryLabel).toBe('乙肝');
    expect(hepb.totalDoses).toBe(3);
    expect(hepb.doses[0].dueDate).toBe('2026-10-16');
    expect(hepb.doses[1].dueDate).toBe('2026-11-15'); // +30
    expect(hepb.doses[2].dueDate).toBe('2027-04-14'); // +150
    expect(hepb.reminderLeadDays).toBe(7);

    // HPV 0-2-6 月：间隔 60 / 120 天
    const hpv = scheduleVaccine('P2', 'HPV九价疫苗', 3, '2026-10-16');
    expect(hpv.category).toBe('hpv');
    expect(hpv.categoryLabel).toBe('HPV');
    expect(hpv.doses[1].dueDate).toBe('2026-12-15'); // +60
    expect(hpv.doses[2].dueDate).toBe('2027-04-14'); // +120

    // 新冠：间隔 21 天
    const covid = scheduleVaccine('P3', '新冠灭活疫苗', 2, '2026-10-16');
    expect(covid.category).toBe('covid');
    expect(covid.doses[1].dueDate).toBe('2026-11-06'); // +21

    // 儿童规划免疫：兜底归类，间隔 28 天
    const childhood = scheduleVaccine('P4', '卡介苗', 2, '2026-10-16');
    expect(childhood.category).toBe('childhood');
    expect(childhood.categoryLabel).toBe('儿童规划免疫');
    expect(childhood.doses[1].dueDate).toBe('2026-11-13'); // +28
  });

  it('流感默认单剂次；doses<=0 时取类别默认剂次', () => {
    const flu = scheduleVaccine('P5', '成人流感疫苗', 0, '2026-10-16');
    expect(flu.category).toBe('flu');
    expect(flu.totalDoses).toBe(1);
    expect(flu.doses).toHaveLength(1);

    // 未传剂次（NaN）→ 取乙肝默认 3 剂
    const hepbDefault = scheduleVaccine('P6', '乙肝疫苗', NaN, '2026-10-16');
    expect(hepbDefault.totalDoses).toBe(3);
  });

  it('入参非法抛错', () => {
    expect(() => scheduleVaccine('', '乙肝疫苗', 3)).toThrow();
    expect(() => scheduleVaccine('P1', '', 3)).toThrow();
    expect(() => scheduleVaccine('P1', '乙肝疫苗', -2)).not.toThrow(); // 负数回退默认剂次
  });
});

describe('recordVaccineDose 接种登记', () => {
  it('登记一针后回写进度，并按实际接种日期滚动重算下一针', () => {
    const plan = scheduleVaccine('P1', '乙肝疫苗', 3, '2026-10-16');
    // 首针延迟到 10-20 才接种
    const rec = recordVaccineDose(plan.id, 'N2048', 'B20260912', 1, '2026-10-20');
    expect(rec.doseNo).toBe(1);
    expect(rec.nurseId).toBe('N2048');
    expect(rec.batchNo).toBe('B20260912');
    expect(rec.patientId).toBe('P1');

    // 内部台账：第 1 剂已种；第 2 剂应种日按实际接种日 +30 滚动到 11-19
    const stored = listPlansByPatient('P1')[0];
    expect(stored.doses[0].status).toBe('done');
    expect(stored.doses[0].batchNo).toBe('B20260912');
    expect(stored.doses[1].status).toBe('pending');
    expect(stored.doses[1].dueDate).toBe('2026-11-19'); // 10-20 +30
  });

  it('重复接种同一剂次抛错；计划不存在 / 必填项为空抛错', () => {
    const plan = scheduleVaccine('P1', '乙肝疫苗', 3, '2026-10-16');
    recordVaccineDose(plan.id, 'N1', 'B1', 1, '2026-10-16');
    expect(() => recordVaccineDose(plan.id, 'N1', 'B2', 1, '2026-10-17')).toThrow();

    expect(() => recordVaccineDose('not-exist', 'N1', 'B1', 1)).toThrow();
    expect(() => recordVaccineDose(plan.id, '', 'B1', 2)).toThrow();
    expect(() => recordVaccineDose(plan.id, 'N1', '', 2)).toThrow();
    expect(() => recordVaccineDose(plan.id, 'N1', 'B1', 99)).toThrow(); // 剂次越界
  });

  it('dose 传 0 时自动定位第一个待种剂次', () => {
    const plan = scheduleVaccine('P1', '新冠疫苗', 2, '2026-10-16');
    recordVaccineDose(plan.id, 'N1', 'B1', 1, '2026-10-16');
    // 第二针不传 dose，自动取 pending 的第 2 剂
    const rec = recordVaccineDose(plan.id, 'N1', 'B2', 0, '2026-11-06');
    expect(rec.doseNo).toBe(2);
  });
});

describe('getNextDoseReminder 下一针提醒', () => {
  it('应种日前 7 天进入提醒窗口，超期单独标记', () => {
    const plan = scheduleVaccine('P1', '乙肝疫苗', 3, '2026-10-16');

    // 距应种 8 天：尚未进入窗口
    const early = getNextDoseReminder('P1', '2026-10-08');
    expect(early.hasNext).toBe(true);
    expect(early.dueDate).toBe('2026-10-16');
    expect(early.remindDate).toBe('2026-10-09'); // 提前 7 天
    expect(early.daysUntilDue).toBe(8);
    expect(early.inWindow).toBe(false);
    expect(early.overdue).toBe(false);

    // 距应种 7 天：进入提醒窗口
    const inWin = getNextDoseReminder('P1', '2026-10-09');
    expect(inWin.daysUntilDue).toBe(7);
    expect(inWin.inWindow).toBe(true);

    // 当天：仍在窗口内
    const today = getNextDoseReminder('P1', '2026-10-16');
    expect(today.daysUntilDue).toBe(0);
    expect(today.inWindow).toBe(true);
    expect(today.message).toContain('接种提醒');

    // 超期 1 天
    const late = getNextDoseReminder('P1', '2026-10-17');
    expect(late.daysUntilDue).toBe(-1);
    expect(late.overdue).toBe(true);
    expect(late.message).toContain('超期');
  });

  it('跨计划取应种最早的待种剂次；全程完成后 hasNext=false', () => {
    // P1 同时排了乙肝（首针 10-16）和流感（首针 11-01）→ 取乙肝
    scheduleVaccine('P1', '乙肝疫苗', 1, '2026-10-16');
    scheduleVaccine('P1', '流感疫苗', 1, '2026-11-01');
    const r = getNextDoseReminder('P1', '2026-10-16');
    expect(r.vaccineName).toBe('乙肝疫苗');
    expect(r.nextDoseNo).toBe(1);

    // 全部种完
    const plans = listPlansByPatient('P1');
    recordVaccineDose(plans[0].id, 'N1', 'B1', 1, '2026-10-16');
    recordVaccineDose(plans[1].id, 'N1', 'B2', 1, '2026-11-01');
    const done = getNextDoseReminder('P1', '2026-11-02');
    expect(done.hasNext).toBe(false);
    expect(done.message).toContain('已完成');
  });

  it('patientId 为空抛错', () => {
    expect(() => getNextDoseReminder('')).toThrow();
  });
});
