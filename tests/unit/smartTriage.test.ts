/**
 * 健澜科技 jlmedaios - 智能导诊与健康管理纯函数单测（M164-C）
 *
 * 覆盖：导诊分级（红旗直急诊/急症今天/慢病预约/轻症社区）、
 *       患者健康旅程构建、AI大脑需求预测。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildSmartTriage,
  buildPatientHealthJourney,
  predictPatientNeeds,
} from '../../src/bff/aggregators/smartTriageAggregator.js';

/* ------------------------------------------------------------------ */
/* 导诊分级                                                            */
/* ------------------------------------------------------------------ */

describe('buildSmartTriage —— 红旗症状安全红线', () => {
  const redFlagCases: Array<[string, string]> = [
    ['胸痛伴大汗', '胸痛'],
    ['突然呼吸困难喘不上气', '呼吸困难'],
    ['一侧肢体无力口角歪斜', '口角歪斜'],
    ['呕血拉黑便', '呕血'],
    ['车祸重伤后昏迷', '昏迷'],
    ['大量咯血', '咯血'],
  ];

  for (const [symptoms, expectKeyword] of redFlagCases) {
    it(`"${symptoms}" → 直接急诊`, () => {
      const r = buildSmartTriage(symptoms, '3天', 'mild' as unknown as number);
      expect(r.level).toBe('emergency');
      expect(r.levelLabel).toBe('急诊');
      expect(r.recommendedDept).toBe('急诊医学科');
      expect(r.matchedRedFlags.length).toBeGreaterThan(0);
      expect(r.matchedRedFlags.some((f) => f.keyword === expectKeyword)).toBe(true);
    });
  }

  it('红旗症状不因自述"轻症/病程短"而降级', () => {
    const r = buildSmartTriage('胸痛', '2小时', 2);
    expect(r.level).toBe('emergency');
    expect(r.action).toContain('120');
  });
});

describe('buildSmartTriage —— 分级分流', () => {
  it('急症：重度且新发(≤1天) → 今天就诊', () => {
    const r = buildSmartTriage('剧烈腹痛', '12小时', 5);
    expect(r.level).toBe('urgent');
    expect(r.levelLabel).toBe('今天就诊');
    expect(r.recommendedDept).toBe('消化内科');
  });

  it('慢病：病程≥1个月反复 → 预约专科', () => {
    const r = buildSmartTriage('头晕反复发作', '2个月', 2);
    expect(r.level).toBe('chronic');
    expect(r.levelLabel).toBe('预约专科');
    expect(r.recommendedDept).toBe('神经内科');
  });

  it('轻症：短期低严重度、无红旗 → 社区/在线咨询', () => {
    const r = buildSmartTriage('轻微鼻塞流涕', '2天', 2);
    expect(r.level).toBe('mild');
    expect(r.levelLabel).toBe('社区/在线咨询');
  });

  it('中文病程/严重度字符串可规范化', () => {
    const r = buildSmartTriage('咳嗽咳痰', '1周', '中度');
    expect(r.durationDays).toBe(7);
    expect(r.severity).toBe(3);
  });

  it('始终带安全声明', () => {
    const r = buildSmartTriage('头痛', 3, 3);
    expect(r.safetyNotice).toContain('不构成');
    expect(r.disambiguation.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* 患者健康旅程                                                       */
/* ------------------------------------------------------------------ */

describe('buildPatientHealthJourney —— 旅程构建', () => {
  it('同一 patientId 结果确定可复现', () => {
    const a = buildPatientHealthJourney('patient-1001');
    const b = buildPatientHealthJourney('patient-1001');
    expect(a).toEqual(b);
  });

  it('包含六个阶段，且恰有一个 current', () => {
    const j = buildPatientHealthJourney('patient-1001');
    expect(j.stages).toHaveLength(6);
    const current = j.stages.filter((s) => s.status === 'current');
    expect(current).toHaveLength(1);
    expect(j.progressPct).toBeGreaterThanOrEqual(0);
    expect(j.progressPct).toBeLessThanOrEqual(100);
  });

  it('阶段顺序 done → current → upcoming', () => {
    const j = buildPatientHealthJourney('patient-2002');
    const order = j.stages.map((s) => s.status);
    const firstCurrent = order.indexOf('current');
    for (let i = 0; i < order.length; i++) {
      if (i < firstCurrent) expect(order[i]).toBe('done');
      else if (i === firstCurrent) expect(order[i]).toBe('current');
      else expect(order[i]).toBe('upcoming');
    }
  });

  it('空 patientId 退化为匿名不抛错', () => {
    const j = buildPatientHealthJourney('');
    expect(j.patientId).toBe('anonymous');
    expect(j.stages.length).toBe(6);
  });
});

/* ------------------------------------------------------------------ */
/* 患者需求预测                                                       */
/* ------------------------------------------------------------------ */

describe('predictPatientNeeds —— AI大脑需求预测', () => {
  it('各阶段返回非空需求清单', () => {
    for (const stage of ['intake', 'screening', 'diagnosis', 'treatment', 'followup', 'maintenance']) {
      const p = predictPatientNeeds('patient-3003', stage);
      expect(p.needs.length).toBeGreaterThan(0);
      expect(p.confidence).toBeGreaterThanOrEqual(0.6);
      expect(p.confidence).toBeLessThanOrEqual(0.9);
    }
  });

  it('同一输入预测结果确定可复现', () => {
    const a = predictPatientNeeds('patient-3003', 'treatment');
    const b = predictPatientNeeds('patient-3003', 'treatment');
    expect(a).toEqual(b);
  });

  it('治疗/随访阶段追加红旗自查提醒', () => {
    const p = predictPatientNeeds('patient-3003', 'treatment');
    expect(p.needs.some((n) => n.type === 'emergency-alert')).toBe(true);
  });

  it('未知阶段回落到 intake 基线需求', () => {
    const p = predictPatientNeeds('patient-3003', 'unknown-stage');
    expect(p.needs.length).toBeGreaterThan(0);
  });
});
