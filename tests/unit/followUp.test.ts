/**
 * 健澜科技 jlmedaios - 智能随访纯函数测试（M131-A）
 *
 * AI能力深化：验证术后/慢病/出院复诊三类随访计划生成、提醒发送与完成记录。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  classifyFollowUpType,
  generateFollowUpPlan,
  sendFollowUpReminder,
  completeFollowUpPlan,
  type Plan,
} from '../../src/bff/aggregators/followUpAggregator.js';

const DISCHARGE = '2026-10-15T09:00:00.000Z';

describe('classifyFollowUpType', () => {
  it('识别术后诊断', () => {
    expect(classifyFollowUpType('胆囊切除术后')).toBe('postop');
    expect(classifyFollowUpType('膝关节置换术后')).toBe('postop');
    expect(classifyFollowUpType('appendectomy surgery')).toBe('postop');
  });
  it('识别高血压', () => {
    expect(classifyFollowUpType('原发性高血压')).toBe('chronic_hypertension');
    expect(classifyFollowUpType('hypertension')).toBe('chronic_hypertension');
  });
  it('识别糖尿病', () => {
    expect(classifyFollowUpType('2型糖尿病')).toBe('chronic_diabetes');
    expect(classifyFollowUpType('type 2 diabetes')).toBe('chronic_diabetes');
  });
  it('默认归为出院复诊', () => {
    expect(classifyFollowUpType('上呼吸道感染')).toBe('discharge');
    expect(classifyFollowUpType('')).toBe('discharge');
  });
});

describe('generateFollowUpPlan - 术后随访', () => {
  const plans = generateFollowUpPlan('visit-001', '胆囊切除术后', DISCHARGE);

  it('生成3个时间点（1周/1月/3月）', () => {
    expect(plans).toHaveLength(3);
    expect(plans.map((p) => p.type)).toEqual(['postop_1w', 'postop_1m', 'postop_3m']);
  });

  it('时间点标签正确', () => {
    expect(plans[0].timepoint).toBe('术后1周');
    expect(plans[1].timepoint).toBe('术后1月');
    expect(plans[2].timepoint).toBe('术后3月');
  });

  it('应随访日期正确偏移', () => {
    const base = new Date(DISCHARGE).getTime();
    expect(new Date(plans[0].dueAt).getTime() - base).toBe(7 * 24 * 3600 * 1000);
    expect(new Date(plans[1].dueAt).getTime() - base).toBe(30 * 24 * 3600 * 1000);
    expect(new Date(plans[2].dueAt).getTime() - base).toBe(90 * 24 * 3600 * 1000);
  });

  it('初始状态为 pending', () => {
    plans.forEach((p) => expect(p.status).toBe('pending'));
  });
});

describe('generateFollowUpPlan - 慢病随访', () => {
  it('高血压每月一次', () => {
    const plans = generateFollowUpPlan('v-hpn', '原发性高血压3级', DISCHARGE);
    expect(plans).toHaveLength(1);
    expect(plans[0].type).toBe('chronic_hypertension_monthly');
    expect(plans[0].timepoint).toBe('每月');
    const base = new Date(DISCHARGE).getTime();
    expect(new Date(plans[0].dueAt).getTime() - base).toBe(30 * 24 * 3600 * 1000);
  });

  it('糖尿病每两周一次', () => {
    const plans = generateFollowUpPlan('v-dm', '2型糖尿病', DISCHARGE);
    expect(plans).toHaveLength(1);
    expect(plans[0].type).toBe('chronic_diabetes_biweekly');
    expect(plans[0].timepoint).toBe('每两周');
    const base = new Date(DISCHARGE).getTime();
    expect(new Date(plans[0].dueAt).getTime() - base).toBe(14 * 24 * 3600 * 1000);
  });
});

describe('generateFollowUpPlan - 出院复诊', () => {
  const plans = generateFollowUpPlan('v-disch', '社区获得性肺炎', DISCHARGE);

  it('生成1个复诊计划', () => {
    expect(plans).toHaveLength(1);
    expect(plans[0].type).toBe('discharge_revisit');
  });

  it('复诊日期在7-14天区间内', () => {
    const base = new Date(DISCHARGE).getTime();
    const diff = (new Date(plans[0].dueAt).getTime() - base) / (24 * 3600 * 1000);
    expect(diff).toBeGreaterThanOrEqual(7);
    expect(diff).toBeLessThanOrEqual(14);
  });
});

describe('generateFollowUpPlan - 异常输入', () => {
  it('visitId 为空抛错', () => {
    expect(() => generateFollowUpPlan('', '感冒', DISCHARGE)).toThrow();
  });
  it('dischargeDate 为空抛错', () => {
    expect(() => generateFollowUpPlan('v-1', '感冒', '')).toThrow();
  });
  it('非法日期抛错', () => {
    expect(() => generateFollowUpPlan('v-1', '感冒', 'not-a-date')).toThrow();
  });
});

describe('sendFollowUpReminder', () => {
  const plan: Plan = {
    id: 'fup_test_postop_1w',
    visitId: 'v-1',
    patientId: '',
    type: 'postop_1w',
    timepoint: '术后1周',
    diagnosis: '胆囊切除术后',
    dueAt: '2026-10-22T09:00:00.000Z',
    status: 'pending',
    description: '术后1周随访',
  };

  it('生成 queued 状态提醒', () => {
    const r = sendFollowUpReminder('patient-001', plan);
    expect(r.patientId).toBe('patient-001');
    expect(r.planId).toBe(plan.id);
    expect(r.status).toBe('queued');
    expect(r.channel).toBe('app');
  });

  it('消息包含随访时间点与日期', () => {
    const r = sendFollowUpReminder('patient-001', plan);
    expect(r.message).toContain('术后1周');
    expect(r.message).toContain('2026-10-22');
  });

  it('patientId 为空抛错', () => {
    expect(() => sendFollowUpReminder('', plan)).toThrow();
  });
});

describe('completeFollowUpPlan', () => {
  const plan: Plan = {
    id: 'fup_v1_postop_1w',
    visitId: 'v-1',
    patientId: 'p-1',
    type: 'postop_1w',
    timepoint: '术后1周',
    diagnosis: 'test',
    dueAt: '2026-10-22T09:00:00.000Z',
    status: 'pending',
    description: '',
  };

  it('将状态置为 completed', () => {
    const done = completeFollowUpPlan(plan, '2026-10-22T10:00:00.000Z');
    expect(done.status).toBe('completed');
    expect((done as { completedAt?: string }).completedAt).toBe('2026-10-22T10:00:00.000Z');
  });

  it('不修改原对象（不可变更新）', () => {
    const before = plan.status;
    completeFollowUpPlan(plan);
    expect(plan.status).toBe(before);
  });
});
