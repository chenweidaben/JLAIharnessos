/**
 * 健澜科技 jlmedaios - M180-C 患者体验纯函数单测（质量与体验）
 *
 * 覆盖：
 *   - buildDeepPatientExperience：四大维度齐全，子项与目标值完整；
 *   - measurePatientExperience：完美旅程高分、痛点旅程低分、瓶颈维度正确、
 *     patientId 出参脱敏、入参非法抛错；
 *   - identifyExperiencePainPoint：关键词命中痛点、未命中返回 unknown；
 *   - generateExperienceImprovement：按痛点返回可执行改进（含责任部门/时限）。
 *
 * 与持久化解耦：不触碰 DB（persistExperienceMeasurement 由路由层调用，单测不覆盖）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDeepPatientExperience,
  generateExperienceImprovement,
  identifyExperiencePainPoint,
  measurePatientExperience,
} from '../../src/bff/aggregators/patientExperienceAggregator';

describe('buildDeepPatientExperience 深度体验目录', () => {
  it('四大维度齐全：预约/就诊/缴费/投诉', () => {
    const cat = buildDeepPatientExperience();
    const codes = cat.dimensions.map((d) => d.code) as string[];
    expect(codes.sort()).toEqual(['appointment', 'complaint', 'payment', 'visit'].sort());
  });

  it('每个维度子项覆盖任务要求的环节', () => {
    const cat = buildDeepPatientExperience();
    const visit = cat.dimensions.find((d) => d.code === 'visit')!;
    const visitSubs = visit.subItems.map((s) => s.code);
    // 分诊/候诊/接诊/检查/取药
    expect(visitSubs).toEqual(
      expect.arrayContaining(['triage', 'waiting', 'consult', 'exam', 'pharmacy']),
    );
    const pay = cat.dimensions.find((d) => d.code === 'payment')!;
    expect(pay.subItems.map((s) => s.code)).toEqual(
      expect.arrayContaining(['window', 'self', 'mobile', 'receipt']),
    );
  });
});

describe('measurePatientExperience 体验度量', () => {
  it('完美旅程得分高，等级为 excellent/good', () => {
    const m = measurePatientExperience('P0001234', {
      appointmentChannel: 'wechat',
      appointmentSuccess: true,
      appointmentWaitMin: 2,
      triageMin: 3,
      waitingMin: 15,
      consultMin: 12,
      examCount: 1,
      pharmacyWaitMin: 5,
      paymentChannel: 'mobile',
      mobilePayFailed: false,
      receiptRequeue: false,
      complaintReplied: true,
      selfScore: 5,
    });
    expect(m.overallScore).toBeGreaterThanOrEqual(85);
    expect(['excellent', 'good']).toContain(m.level);
  });

  it('候诊久 + 接诊短 → 就诊维度为瓶颈', () => {
    const m = measurePatientExperience('P0001234', {
      appointmentChannel: 'wechat',
      appointmentSuccess: true,
      appointmentWaitMin: 3,
      triageMin: 4,
      waitingMin: 90,
      consultMin: 3,
      examCount: 1,
      pharmacyWaitMin: 6,
      paymentChannel: 'mobile',
      mobilePayFailed: false,
      receiptRequeue: false,
      complaintReplied: true,
      selfScore: 3,
    });
    expect(m.bottleneck).toBe('visit');
    const visit = m.dimensions.find((d) => d.dimension === 'visit')!;
    expect(visit.issues.length).toBeGreaterThan(0);
    expect(m.overallScore).toBeLessThan(80);
  });

  it('移动支付失败 → 缴费维度失分', () => {
    const m = measurePatientExperience('P0009999', {
      appointmentChannel: 'app',
      appointmentSuccess: true,
      appointmentWaitMin: 2,
      triageMin: 3,
      waitingMin: 10,
      consultMin: 10,
      examCount: 1,
      pharmacyWaitMin: 5,
      paymentChannel: 'mobile',
      mobilePayFailed: true,
      receiptRequeue: false,
      complaintReplied: true,
      selfScore: 4,
    });
    const pay = m.dimensions.find((d) => d.dimension === 'payment')!;
    expect(pay.score).toBeLessThan(80);
    expect(pay.issues).toContain('移动支付失败');
  });

  it('patientId 出参脱敏：P0001234 → P0****34', () => {
    const m = measurePatientExperience('P0001234', {});
    expect(m.patientId).toBe('P0****34');
  });

  it('patientId 为空抛错', () => {
    expect(() => measurePatientExperience('', {})).toThrow();
  });
});

describe('identifyExperiencePainPoint 痛点识别', () => {
  it('命中"候诊两小时"→ wait_long', () => {
    const p = identifyExperiencePainPoint('早上8点到医院，候诊等了两小时才看上病');
    expect(p.code).toBe('wait_long');
    expect(p.dimension).toBe('visit');
    expect(p.hits.length).toBeGreaterThan(0);
  });

  it('命中"手机付不了钱"→ mobile_pay_fail', () => {
    const p = identifyExperiencePainPoint('缴费时手机付不了，微信支付报错');
    expect(p.code).toBe('mobile_pay_fail');
    expect(p.dimension).toBe('payment');
  });

  it('命中"投诉没人理"→ complaint_slow', () => {
    const p = identifyExperiencePainPoint('上周投诉没人理，反映了没用');
    expect(p.code).toBe('complaint_slow');
  });

  it('未命中关键词 → unknown 待人工确认', () => {
    const p = identifyExperiencePainPoint('今天天气不错');
    expect(p.code).toBe('unknown');
    expect(p.hits).toEqual([]);
  });

  it('空反馈抛错', () => {
    expect(() => identifyExperiencePainPoint('')).toThrow();
  });
});

describe('generateExperienceImprovement 改进措施', () => {
  it('wait_long → 候诊改进措施，含责任部门与时限', () => {
    const imp = generateExperienceImprovement('wait_long');
    expect(imp.painPoint).toBe('wait_long');
    expect(imp.action.length).toBeGreaterThan(10);
    expect(imp.owner.length).toBeGreaterThan(0);
    expect(imp.dueDays).toBeGreaterThan(0);
  });

  it('complaint_slow → 48小时响应改进', () => {
    const imp = generateExperienceImprovement('complaint_slow');
    expect(imp.title).toContain('48');
    expect(imp.dimension).toBe('complaint');
  });

  it('未知痛点代码 → 走通用回访兜底', () => {
    const imp = generateExperienceImprovement('unknown');
    expect(imp.action).toContain('客服');
  });

  it('空代码抛错', () => {
    expect(() => generateExperienceImprovement('')).toThrow();
  });
});
