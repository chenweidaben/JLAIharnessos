/**
 * 健澜科技 jlmedaios - 住院医生工作站「越用越懂患者」纯函数单测
 *   （依据宪法第四章）
 *
 * 覆盖：
 *  - buildInpatientInsight：事件按时间聚合 / keyEvents 排序与高亮、
 *    体温·心率·血压·SpO₂·呼吸 阈值风险标记、检验危急值与异常标记、
 *    用药暂停标记、空态摘要文案、纯函数不修改入参；
 *  - summarizeCrossVisits：跨住院次数合并药物反应 / 并发症 / 偏好、
 *    患者号脱敏、空住院记录空态、去重；
 *  - maskPatientId：长短号脱敏口径。
 *
 * 全部 mock 数据，不依赖数据库 / 时钟。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildInpatientInsight,
  maskPatientId,
  summarizeCrossVisits,
  type InpatientEvent,
  type LabResult,
  type OrderItem,
  type PriorVisit,
} from '../../src/bff/aggregators/inpatientInsightAggregator';

const DAY = '2026-10-15';

describe('buildInpatientInsight 当日病情聚合', () => {
  it('keyEvents 按时间升序，不修改入参顺序', () => {
    const events: InpatientEvent[] = [
      { time: `${DAY}T10:00:00+08:00`, type: 'treatment', title: 'B' },
      { time: `${DAY}T08:00:00+08:00`, type: 'vitals', title: 'A' },
    ];
    const out = buildInpatientInsight(events, [], []);
    expect(out.keyEvents.map((e) => e.title)).toEqual(['A', 'B']);
    expect(events.map((e) => e.title)).toEqual(['B', 'A']);
  });

  it('alert / surgery / transfer 事件自动高亮', () => {
    const events: InpatientEvent[] = [
      { time: `${DAY}T08:00:00+08:00`, type: 'note', title: '普通病程' },
      { time: `${DAY}T09:00:00+08:00`, type: 'alert', title: '病情突变告警' },
      { time: `${DAY}T11:00:00+08:00`, type: 'surgery', title: '阑尾切除术' },
    ];
    const out = buildInpatientInsight(events, [], []);
    expect(out.keyEvents.map((e) => e.highlight)).toEqual([false, true, true]);
  });

  it('体温 ≥38.5℃ 判高热 high，≥37.3℃ 判低热 low', () => {
    const events: InpatientEvent[] = [
      { time: `${DAY}T06:00:00+08:00`, type: 'vitals', title: '晨温', temperatureC: 39.1 },
      { time: `${DAY}T14:00:00+08:00`, type: 'vitals', title: '午后温', temperatureC: 37.5 },
    ];
    const out = buildInpatientInsight(events, [], []);
    const fevers = out.riskFlags.filter((r) => r.code === 'fever');
    expect(fevers).toHaveLength(2);
    expect(fevers[0].level).toBe('high');
    expect(fevers[1].level).toBe('low');
  });

  it('心率 / 血压 / SpO₂ / 呼吸阈值触发对应风险码', () => {
    const events: InpatientEvent[] = [
      { time: `${DAY}T06:00:00+08:00`, type: 'vitals', title: '体征',
        heartRate: 120, systolicBp: 85, diastolicBp: 55, spo2: 88, respiratoryRate: 26 },
    ];
    const out = buildInpatientInsight(events, [], []);
    const codes = out.riskFlags.map((r) => r.code).sort();
    expect(codes).toEqual(['hypotension', 'hypoxemia', 'tachycardia', 'tachypnea']);
    expect(out.riskFlags.find((r) => r.code === 'hypotension')?.level).toBe('high');
    expect(out.riskFlags.find((r) => r.code === 'hypoxemia')?.level).toBe('high');
  });

  it('检验 HH/LL 危急值 high，H/L 异常 medium，并进入摘要', () => {
    const labs: LabResult[] = [
      { code: 'K', name: '血钾', value: 2.8, unit: 'mmol/L', flag: 'LL', refLow: 3.5, refHigh: 5.3, time: `${DAY}T08:00:00+08:00` },
      { code: 'WBC', name: '白细胞', value: 12.4, unit: '×10^9/L', flag: 'H', refLow: 4, refHigh: 10, time: `${DAY}T08:00:00+08:00` },
      { code: 'Na', name: '血钠', value: 140, unit: 'mmol/L', flag: 'N', refLow: 135, refHigh: 145, time: `${DAY}T08:00:00+08:00` },
    ];
    const out = buildInpatientInsight([], labs, []);
    expect(out.riskFlags.find((r) => r.code === 'critical_lab')?.level).toBe('high');
    expect(out.riskFlags.find((r) => r.code === 'abnormal_lab')).toBeTruthy();
    expect(out.aiSummary).toContain('血钾');
  });

  it('用药医嘱 held 触发 med_held 并写入摘要', () => {
    const orders: OrderItem[] = [
      { id: 'O1', name: '头孢呋辛', category: 'medication', status: 'held' },
      { id: 'O2', name: '血常规', category: 'lab', status: 'completed' },
    ];
    const out = buildInpatientInsight([], [], orders);
    expect(out.riskFlags.find((r) => r.code === 'med_held')?.evidence).toBe('O1');
    expect(out.aiSummary).toContain('头孢呋辛');
  });

  it('空输入时摘要返回固定空态句', () => {
    const out = buildInpatientInsight([], [], []);
    expect(out.riskFlags).toEqual([]);
    expect(out.keyEvents).toEqual([]);
    expect(out.aiSummary).toBe('今日暂无显著病情变化，继续观察。');
  });

  it('纯函数：不修改 labs / orders 入参', () => {
    const labs: LabResult[] = [
      { code: 'K', name: '血钾', value: 2.8, unit: 'mmol/L', flag: 'LL', time: `${DAY}T08:00:00+08:00` },
    ];
    const orders: OrderItem[] = [
      { id: 'O1', name: '头孢', category: 'medication', status: 'held' },
    ];
    buildInpatientInsight([], labs, orders);
    expect(labs[0].flag).toBe('LL');
    expect(orders[0].status).toBe('held');
  });
});

describe('summarizeCrossVisits 跨住院合并既往反应', () => {
  it('合并药物反应 / 并发症 / 偏好，患者号脱敏', () => {
    const visits: PriorVisit[] = [
      {
        visitId: 'V1', admissionDate: '2026-03-01', dischargeDate: '2026-03-10',
        mainDiagnosis: '肺部感染',
        drugReactions: ['青霉素过敏'], complications: ['术后谵妄'], preferences: ['拒绝输血'],
      },
      {
        visitId: 'V2', admissionDate: '2026-08-12', dischargeDate: '2026-08-20',
        mainDiagnosis: '2型糖尿病',
        drugReactions: ['青霉素过敏', '造影剂肾病'], complications: [], preferences: [],
      },
    ];
    const text = summarizeCrossVisits('P100086', visits);
    expect(text).toContain('既往住院 2 次');
    expect(text).toContain('最近 2026-08-12');
    expect(text).toContain('青霉素过敏、造影剂肾病');
    expect(text).toContain('术后谵妄');
    expect(text).toContain('拒绝输血');
    // 脱敏：原始 P100086 不应出现在输出中
    expect(text).not.toContain('P100086');
    expect(text).toContain('P10****86');
  });

  it('空住院记录返回空态句', () => {
    const text = summarizeCrossVisits('P200001', []);
    expect(text).toContain('无既往住院记录');
    expect(text).not.toContain('P200001');
  });
});

describe('maskPatientId 患者号脱敏', () => {
  it('长号保留前 3 与末 2，中间打码', () => {
    expect(maskPatientId('P100086')).toBe('P10****86');
  });
  it('短号回退 P****', () => {
    expect(maskPatientId('P12')).toBe('P****');
    expect(maskPatientId('')).toBe('P****');
  });
});
