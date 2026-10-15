/**
 * 健澜科技 jlmedaios — 患者随访智能化单测（M152-D）
 *
 * 覆盖：
 *   1. generateFollowupPlan：疾病分型、时间点生成、默认不授权；
 *   2. predictRehospitalizationRisk：风险分带、因素解释；
 *   3. sendAutoFollowup：患者授权闸口、时段闸口、渠道/模板闸口；
 *   4. isWithinSendWindow：08:00–20:00 静默时段。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it, beforeEach } from 'bun:test';
import {
  generateFollowupPlan,
  predictRehospitalizationRisk,
  sendAutoFollowup,
  isWithinSendWindow,
  grantAutoFollowupConsent,
  revokeAutoFollowupConsent,
  hasAutoFollowupConsent,
} from '../../src/bff/aggregators/smartFollowupAggregator.js';

// 每个用例前清空授权注册表，避免用例间污染
beforeEach(() => {
  // 逐一 revoke 已知 patientId（注册表为模块级，测试之间隔离）
  revokeAutoFollowupConsent('pat-0001');
  revokeAutoFollowupConsent('pat-0002');
  revokeAutoFollowupConsent('pat-0003');
});

describe('M152-D generateFollowupPlan 疾病分型', () => {
  it('术后 → 3/7/30 天三时间点', () => {
    const plan = generateFollowupPlan('pat-0001', '腹腔镜胆囊切除术术后', '2026-10-01');
    expect(plan.timepoints).toHaveLength(3);
    expect(plan.timepoints[0].daysAfterDischarge).toBe(3);
    expect(plan.timepoints[1].daysAfterDischarge).toBe(7);
    expect(plan.timepoints[2].daysAfterDischarge).toBe(30);
    // 合规：默认未授权
    expect(plan.autoFollowupEnabled).toBe(false);
  });

  it('糖尿病 → 慢病 14/30 天', () => {
    const plan = generateFollowupPlan('pat-0002', '2型糖尿病', '2026-10-01');
    expect(plan.timepoints.map((t) => t.daysAfterDischarge)).toEqual([14, 30]);
  });

  it('肿瘤 → 7/30/90 天 MDT', () => {
    const plan = generateFollowupPlan('pat-0003', '肺腺癌术后化疗', '2026-10-01');
    expect(plan.timepoints).toHaveLength(3);
    expect(plan.timepoints[2].action).toContain('MDT');
  });

  it('一般出院 → 10 天单时间点', () => {
    const plan = generateFollowupPlan('pat-0001', '上呼吸道感染', '2026-10-01');
    expect(plan.timepoints).toHaveLength(1);
    expect(plan.timepoints[0].daysAfterDischarge).toBe(10);
  });

  it('参数非法 → 抛错', () => {
    expect(() => generateFollowupPlan('', '感冒', '2026-10-01')).toThrow();
    expect(() => generateFollowupPlan('p1', '感冒', '')).toThrow();
  });

  it('患者授权后 → autoFollowupEnabled 为 true', () => {
    grantAutoFollowupConsent('pat-0001');
    const plan = generateFollowupPlan('pat-0001', '感冒', '2026-10-01');
    expect(plan.autoFollowupEnabled).toBe(true);
  });
});

describe('M152-D predictRehospitalizationRisk 风险分层', () => {
  it('高风险疾病 → high 分层', () => {
    const r = predictRehospitalizationRisk('pat-0001', '慢性心力衰竭急性加重');
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.level).toBe('high');
    expect(r.predictedWindowDays).toBe(30);
    expect(r.factors.length).toBeGreaterThan(0);
  });

  it('中风险疾病 → medium', () => {
    const r = predictRehospitalizationRisk('pat-0002', '2型糖尿病伴血糖控制不佳');
    expect(r.score).toBeGreaterThanOrEqual(30);
    expect(r.score).toBeLessThan(60);
    expect(r.level).toBe('medium');
  });

  it('一般出院 → low', () => {
    const r = predictRehospitalizationRisk('pat-0003', '上呼吸道感染');
    expect(r.score).toBeLessThan(30);
    expect(r.level).toBe('low');
  });

  it('共病因素叠加 → 分数叠加', () => {
    const base = predictRehospitalizationRisk('x1', '冠心病');
    const withComorbidity = predictRehospitalizationRisk('x2', '冠心病 营养不良 肾功能不全');
    expect(withComorbidity.score).toBeGreaterThan(base.score);
  });

  it('分数截断在 [0,100]', () => {
    const r = predictRehospitalizationRisk('pat-0001', '心衰 肿瘤 营养不良 肾功能不全 老年 既往再入院');
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

describe('M152-D sendAutoFollowup 合规闸口', () => {
  it('未授权 → patient_consent_required（不骚扰）', () => {
    const res = sendAutoFollowup('pat-0001', 'sms', '您的随访提醒');
    expect(res.success).toBe(false);
    expect(res.skippedReason).toBe('patient_consent_required');
  });

  it('授权后非法渠道 → invalid_channel', () => {
    grantAutoFollowupConsent('pat-0001');
    // @ts-expect-error 故意传非法渠道
    const res = sendAutoFollowup('pat-0001', 'carrier-pigeon', '模板内容');
    expect(res.success).toBe(false);
    expect(res.skippedReason).toBe('invalid_channel');
  });

  it('授权后空模板 → invalid_template', () => {
    grantAutoFollowupConsent('pat-0002');
    const res = sendAutoFollowup('pat-0002', 'wechat', '   ');
    expect(res.success).toBe(false);
    expect(res.skippedReason).toBe('invalid_template');
  });

  it('授权 + 合法渠道 + 合法模板 → 成功 或 因时段被拒（二选一）', () => {
    grantAutoFollowupConsent('pat-0003');
    const res = sendAutoFollowup('pat-0003', 'phone', '您好，您的随访时间到了');
    if (res.success) {
      expect(res.messageId).toBeTruthy();
      expect(res.sentAt).toBeTruthy();
    } else {
      expect(res.skippedReason).toBe('outside_send_window');
    }
  });

  it('撤回授权后 → 重新变为 patient_consent_required', () => {
    grantAutoFollowupConsent('pat-0001');
    expect(hasAutoFollowupConsent('pat-0001')).toBe(true);
    revokeAutoFollowupConsent('pat-0001');
    expect(hasAutoFollowupConsent('pat-0001')).toBe(false);
    const res = sendAutoFollowup('pat-0001', 'sms', 'x');
    expect(res.skippedReason).toBe('patient_consent_required');
  });
});

describe('M152-D isWithinSendWindow 08:00–20:00', () => {
  it('07:59 → false（清晨不打扰）', () => {
    expect(isWithinSendWindow(new Date(2026, 9, 16, 7, 59))).toBe(false);
  });
  it('08:00 → true', () => {
    expect(isWithinSendWindow(new Date(2026, 9, 16, 8, 0))).toBe(true);
  });
  it('12:00 → true', () => {
    expect(isWithinSendWindow(new Date(2026, 9, 16, 12, 0))).toBe(true);
  });
  it('19:59 → true', () => {
    expect(isWithinSendWindow(new Date(2026, 9, 16, 19, 59))).toBe(true);
  });
  it('20:00 → false（夜间不打扰）', () => {
    expect(isWithinSendWindow(new Date(2026, 9, 16, 20, 0))).toBe(false);
  });
  it('23:30 → false', () => {
    expect(isWithinSendWindow(new Date(2026, 9, 16, 23, 30))).toBe(false);
  });
});
